"""Database-backed academic context services for the ODRMS Smart Assistant.

Every value returned by this module is computed from real database rows in the
Asia/Kolkata timezone. The assistant never invents data: when something is not
available (no lecture occurrence created yet, missing room, unmarked
attendance) the response says so explicitly instead of guessing.

Scoping mirrors the existing ODRMS permission model (classes/permissions.py):
- HOD sees the whole department (both sections).
- Class coordinators see their assigned class plus their own teaching rows.
- Other faculty see their own assigned lectures/rows plus classes with an
  ACTIVE ClassFacultyAccess granted by the HOD.
"""

from datetime import date, timedelta

from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone

from classes import permissions as class_perms
from classes.models import AcademicClass, ClassCoordinator
from lectures.models import Lecture, TimeSlot, TimetableEntry
from attendance.models import AttendanceRecord
from notifications.models import Notification
from tasks.models import DepartmentTask

BREAK_PERIOD = 0
WEEKDAY_VALUES = TimetableEntry.Weekday.values  # MONDAY..FRIDAY


# ---------------------------------------------------------------------------
# time helpers
# ---------------------------------------------------------------------------
def local_now():
    """Current aware datetime in the college timezone (Asia/Kolkata)."""
    return timezone.localtime()


def fmt_time(t):
    """10:00 -> '10:00 AM' (12-hour clock, IST)."""
    if t is None:
        return None
    text = t.strftime("%I:%M %p")
    return text[1:] if text.startswith("0") else text


def fmt_minutes(total):
    if total is None:
        return None
    total = max(int(total), 0)
    if total < 60:
        return f"{total} minute{'s' if total != 1 else ''}"
    hours, minutes = divmod(total, 60)
    parts = []
    if hours:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    return " and ".join(parts)


def weekday_name_for(day):
    return list(WEEKDAY_VALUES)[day.weekday()] if day.weekday() <= 4 else None


# ---------------------------------------------------------------------------
# scope resolution (reuses the existing class RBAC layer)
# ---------------------------------------------------------------------------
def coordinator_class_ids(user):
    profile = getattr(user, "faculty_profile", None)
    if not profile:
        return []
    return list(
        ClassCoordinator.objects.filter(faculty=profile, is_active=True).values_list(
            "department_class_id", flat=True
        )
    )


def teaching_class_ids(user):
    profile = getattr(user, "faculty_profile", None)
    if not profile:
        return []
    return list(
        TimetableEntry.objects.filter(faculty=profile)
        .exclude(academic_class_id=None)
        .values_list("academic_class_id", flat=True)
        .distinct()
    )


def visible_class_ids(user):
    """Classes whose schedule the user may query through the assistant."""
    if getattr(user, "is_hod", False):
        return list(
            AcademicClass.objects.filter(is_active=True).values_list("id", flat=True)
        )
    ids = set(class_perms.accessible_class_ids(user))
    ids.update(coordinator_class_ids(user))
    ids.update(teaching_class_ids(user))
    return sorted(ids)


def detail_class_ids(user):
    """Classes for which per-student attendance detail may be shown."""
    if getattr(user, "is_hod", False):
        return list(
            AcademicClass.objects.filter(is_active=True).values_list("id", flat=True)
        )
    from classes.models import ClassFacultyAccess

    view_perm = ClassFacultyAccess.Permission.VIEW
    ids = set(coordinator_class_ids(user))
    ids.update(class_perms.accessible_class_ids(user, [view_perm]))
    return sorted(ids)


def scoped_classes(user):
    qs = AcademicClass.objects.filter(is_active=True).select_related("department")
    ids = visible_class_ids(user)
    return list(qs.filter(pk__in=ids).order_by("section"))


def can_view_class(user, department_class):
    """Assistant-level view check: explicit class access OR own teaching rows."""
    if getattr(user, "is_hod", False):
        return True
    profile = getattr(user, "faculty_profile", None)
    if profile and (
        TimetableEntry.objects.filter(faculty=profile, academic_class=department_class).exists()
        or Lecture.objects.filter(
            assigned_faculty=profile, academic_class=department_class
        ).exists()
    ):
        return True
    return class_perms.user_can_access_class(user, department_class)


def assert_can_view_class(user, department_class):
    from rest_framework.exceptions import PermissionDenied

    if not can_view_class(user, department_class):
        raise PermissionDenied("You are not authorized to view this class's schedule.")


# ---------------------------------------------------------------------------
# lecture/entry serialization helpers
# ---------------------------------------------------------------------------
def lecture_payload(lecture):
    entry = lecture.timetable_entry
    payload = {
        "id": lecture.id,
        "subject_code": lecture.subject.code,
        "subject_name": lecture.subject.name,
        "faculty_name": lecture.assigned_faculty.full_name if lecture.assigned_faculty else None,
        "faculty_code": lecture.assigned_faculty.faculty_code if lecture.assigned_faculty else None,
        "section": lecture.section,
        "semester": lecture.semester,
        "classroom": lecture.classroom,
        "lecture_type": lecture.lecture_type,
        "topic": lecture.topic or None,
        "start_time": fmt_time(lecture.start_time),
        "end_time": fmt_time(lecture.end_time),
        "status": lecture.status,
        "date": str(lecture.date),
    }
    if entry and entry.faculty_id and lecture.assigned_faculty_id and entry.faculty_id != lecture.assigned_faculty_id:
        payload["substituted_for"] = entry.faculty.full_name
    return payload


def entry_payload(entry):
    return {
        "id": entry.id,
        "weekday": entry.weekday,
        "subject_code": entry.subject.code,
        "subject_name": entry.subject.name,
        "faculty_name": entry.faculty.full_name if entry.faculty else None,
        "faculty_code": entry.faculty.faculty_code if entry.faculty else None,
        "section": entry.section.code,
        "period_number": entry.time_slot.period_number,
        "classroom": entry.classroom,
        "lecture_type": entry.lecture_type,
        "start_time": fmt_time(entry.time_slot.start_time),
        "end_time": fmt_time(entry.time_slot.end_time),
    }


def minutes_between(now_dt, target_time):
    """Minutes from now until target_time on the same day (may be negative).

    Rounds to the nearest minute and keeps seconds out of the comparison so a
    20-minute window never reads as 19 because the clock ticked between the
    caller's snapshot and the service call.
    """
    base = now_dt.replace(microsecond=0)
    target = base.replace(hour=target_time.hour, minute=target_time.minute, second=target_time.second)
    return int(round((target - base).total_seconds() / 60))


# ---------------------------------------------------------------------------
# current / next class detection
# ---------------------------------------------------------------------------
def day_lectures(user, day):
    """Real Lecture occurrences for a date, restricted to the user's scope."""
    ids = visible_class_ids(user)
    qs = (
        Lecture.objects.filter(date=day, academic_class_id__in=ids)
        .select_related("subject", "assigned_faculty", "timetable_entry__faculty", "academic_class")
        .order_by("start_time", "section")
    )
    return list(qs)


def day_entries(user, day):
    """Weekly-grid TimetableEntry rows for a date's weekday, in scope."""
    weekday = weekday_name_for(day)
    if not weekday:
        return []
    ids = visible_class_ids(user)
    qs = (
        TimetableEntry.objects.filter(weekday=weekday, academic_class_id__in=ids)
        .select_related("subject", "faculty", "time_slot", "section", "academic_class")
        .order_by("time_slot__period_number", "section__code")
    )
    return list(qs)


def _split(lectures, now_t):
    running = [l for l in lectures if l.start_time and l.end_time and l.start_time <= now_t < l.end_time]
    upcoming = [l for l in lectures if l.start_time and l.start_time > now_t]
    past = [l for l in lectures if l.end_time and l.end_time <= now_t]
    return running, upcoming, past


def section_state(user, department_class, now_dt):
    """Live state of one class/section right now (database-backed)."""
    today = now_dt.date()
    now_t = now_dt.time()
    section = department_class.section

    lectures = [l for l in day_lectures(user, today) if l.section == section]
    cancelled = [l for l in lectures if l.status == Lecture.Status.CANCELLED]
    active = [l for l in lectures if l.status != Lecture.Status.CANCELLED]
    running, upcoming, past = _split(active, now_t)

    def item(lecture):
        payload = lecture_payload(lecture)
        payload.update(
            {
                "elapsed_minutes": fmt_minutes(abs(minutes_between(now_dt, lecture.start_time)))
                if lecture.end_time and lecture.end_time > now_t
                else None,
                "remaining_minutes": fmt_minutes(minutes_between(now_dt, lecture.end_time))
                if lecture.end_time and lecture.end_time > now_t
                else None,
            }
        )
        return payload

    current = item(running[0]) if running else None
    if running:
        current = item(sorted(running, key=lambda l: l.start_time)[0])
    next_lecture = sorted(upcoming, key=lambda l: (l.start_time, l.section))[0] if upcoming else None
    next_payload = item(next_lecture) if next_lecture else None
    if next_payload is not None:
        next_payload["starts_in_minutes"] = fmt_minutes(minutes_between(now_dt, next_lecture.start_time))

    # Break detection: inside college hours but between two slots.
    is_break = False
    if not current and active and past:
        latest_end = max(l.end_time for l in past)
        earliest_next = min(l.start_time for l in active if l.start_time > now_t) if upcoming else None
        if earliest_next and latest_end < now_t < earliest_next:
            is_break = True

    if running:
        state = "running"
    elif is_break:
        state = "break"
    elif upcoming:
        state = "upcoming"
    elif lectures and not active:
        state = "all_cancelled"
    elif lectures:
        state = "day_over"
    else:
        state = "no_lecture_rows"

    # When no real occurrence rows exist for today, the weekly grid is the
    # scheduled truth — presented explicitly as "per timetable", never as
    # a confirmed conducted lecture. When real Lecture rows DO exist for the
    # section they always win over the weekly grid.
    fallback = None
    if state == "no_lecture_rows":
        entries = [e for e in day_entries(user, today) if e.section.code == section]
        running_entries = [e for e in entries if e.time_slot.start_time <= now_t < e.time_slot.end_time]
        upcoming_entries = [e for e in entries if e.time_slot.start_time > now_t]
        if not current and running_entries:
            current = entry_payload(running_entries[0])
            current["source"] = "timetable"
            current["elapsed_minutes"] = fmt_minutes(abs(minutes_between(now_dt, running_entries[0].time_slot.start_time)))
            current["remaining_minutes"] = fmt_minutes(minutes_between(now_dt, running_entries[0].time_slot.end_time))
            state = "running"
        elif not next_payload and upcoming_entries:
            nxt = upcoming_entries[0]
            next_payload = entry_payload(nxt)
            next_payload["source"] = "timetable"
            next_payload["starts_in_minutes"] = fmt_minutes(minutes_between(now_dt, nxt.time_slot.start_time))

    return {
        "class_id": department_class.id,
        "section": section,
        "display_name": department_class.display_name,
        "state": state,
        "current": current,
        "next": next_payload,
        "today_lecture_count": len(active),
        "cancelled_today": [lecture_payload(l) for l in cancelled],
    }


def next_day_with_schedule(user, start_day, limit=7):
    """First day after `start_day` (exclusive) that has scheduled lectures."""
    for offset in range(1, limit + 1):
        day = start_day + timedelta(days=offset)
        weekday = weekday_name_for(day)
        if not weekday:
            continue
        ids = visible_class_ids(user)
        if TimetableEntry.objects.filter(weekday=weekday, academic_class_id__in=ids).exists():
            return day, weekday
    return None, None


def current_context(user):
    """The live now-view the assistant panel opens with (§2 + §5 of spec)."""
    now_dt = local_now()
    today = now_dt.date()
    weekday = weekday_name_for(today)
    classes = scoped_classes(user)

    profile = getattr(user, "faculty_profile", None)
    coord_ids = coordinator_class_ids(user)

    sections = [section_state(user, cls, now_dt) for cls in classes]

    # Personal view for non-HOD users: the lecture assigned to *me* right now.
    my_current = None
    my_next = None
    if profile:
        mine = [
            l
            for l in day_lectures(user, today)
            if l.assigned_faculty_id == profile.id and l.status != Lecture.Status.CANCELLED
        ]
        running, upcoming, _ = _split(mine, now_dt.time())
        if running:
            my_current = lecture_payload(running[0])
            my_current["elapsed_minutes"] = fmt_minutes(abs(minutes_between(now_dt, running[0].start_time)))
            my_current["remaining_minutes"] = fmt_minutes(minutes_between(now_dt, running[0].end_time))
        if upcoming:
            nxt = upcoming[0]
            my_next = lecture_payload(nxt)
            my_next["starts_in_minutes"] = fmt_minutes(minutes_between(now_dt, nxt.start_time))

    reminders = build_reminders(user, now_dt)
    digest = build_digest(user, now_dt, sections)

    return {
        "generated_at": now_dt.isoformat(),
        "timezone": settings.TIME_ZONE,
        "weekday": weekday,
        "is_weekend": weekday is None,
        "user": {
            "name": user.full_name,
            "role": user.role,
            "is_coordinator": bool(coord_ids),
            "coordinator_classes": [
                {"class_id": cid, "section": AcademicClass.objects.filter(pk=cid).values_list("section", flat=True).first()}
                for cid in coord_ids
            ],
        },
        "sections": sections,
        "my_current": my_current,
        "my_next": my_next,
        "reminders": reminders,
        "digest": digest,
        "min_attendance_pct": settings.ODRMS_MIN_ATTENDANCE_PCT,
    }


# ---------------------------------------------------------------------------
# reminders (polling-based; no new infrastructure)
# ---------------------------------------------------------------------------
def build_reminders(user, now_dt):
    today = now_dt.date()
    now_t = now_dt.time()
    profile = getattr(user, "faculty_profile", None)
    window = settings.ASSISTANT_REMINDER_MINUTES
    reminders = []

    mine = []
    if profile:
        mine = [
            l
            for l in day_lectures(user, today)
            if l.assigned_faculty_id == profile.id and l.status != Lecture.Status.CANCELLED
        ]
    for lecture in mine:
        starts_in = minutes_between(now_dt, lecture.start_time)
        if 0 <= starts_in <= window:
            reminders.append(
                {
                    "type": "class_starting",
                    "lecture_id": lecture.id,
                    "subject": lecture.subject.name,
                    "section": lecture.section,
                    "classroom": lecture.classroom,
                    "start_time": fmt_time(lecture.start_time),
                    "starts_in_minutes": starts_in,
                    "message": f"{lecture.subject.name} (Section {lecture.section}) starts at {fmt_time(lecture.start_time)} — in {fmt_minutes(starts_in)}",
                }
            )
        if lecture.end_time and lecture.end_time < now_t:
            marked = AttendanceRecord.objects.filter(lecture=lecture).exists()
            if not marked:
                reminders.append(
                    {
                        "type": "attendance_pending",
                        "lecture_id": lecture.id,
                        "subject": lecture.subject.name,
                        "section": lecture.section,
                        "message": f"Attendance for {lecture.subject.name} (Section {lecture.section}, {fmt_time(lecture.start_time)}) has not been submitted yet.",
                    }
                )
    return reminders


# ---------------------------------------------------------------------------
# timetable services
# ---------------------------------------------------------------------------
def timetable_for_day(user, day, section=None):
    """Day schedule from real occurrences + the weekly grid fallback."""
    ids = visible_class_ids(user)
    weekday = weekday_name_for(day)
    results = []
    classes = scoped_classes(user)
    if section:
        classes = [c for c in classes if c.section == section]
    for cls in classes:
        if not can_view_class(user, cls):
            continue
        lectures = [
            l
            for l in day_lectures(user, day)
            if l.section == cls.section
        ]
        rows = [
            {
                **lecture_payload(l),
                "source": "lecture",
                "cancelled": l.status == Lecture.Status.CANCELLED,
            }
            for l in sorted(lectures, key=lambda x: x.start_time)
        ]
        if not lectures:
            grid = [
                e
                for e in day_entries(user, day)
                if e.section.code == cls.section
            ]
            rows = [
                {**entry_payload(e), "source": "timetable", "cancelled": False}
                for e in sorted(grid, key=lambda x: x.time_slot.period_number)
            ]
        results.append(
            {
                "class_id": cls.id,
                "section": cls.section,
                "display_name": cls.display_name,
                "rows": rows,
            }
        )
    return {
        "date": str(day),
        "weekday": weekday,
        "classes": results,
    }


def timetable_changes_for_day(user, day):
    """Cancelled, substituted or ad-hoc lectures for the visible classes."""
    lectures = day_lectures(user, day)
    cancelled = []
    substituted = []
    adhoc = []
    for lecture in lectures:
        if lecture.status == Lecture.Status.CANCELLED:
            cancelled.append(lecture_payload(lecture))
        entry = lecture.timetable_entry
        if (
            entry
            and entry.faculty_id
            and lecture.assigned_faculty_id
            and entry.faculty_id != lecture.assigned_faculty_id
        ):
            substituted.append({**lecture_payload(lecture)})
        if entry is None:
            adhoc.append(lecture_payload(lecture))
    return {"date": str(day), "cancelled": cancelled, "substituted": substituted, "adhoc": adhoc}


def free_rooms_now(user, now_dt=None):
    """Rooms (within the user's visible classes) not occupied right now."""
    now_dt = now_dt or local_now()
    now_t = now_dt.time()
    entries = day_entries(user, now_dt.date())
    occupied = {}
    for entry in entries:
        if entry.time_slot.start_time <= now_t < entry.time_slot.end_time:
            occupied[entry.classroom] = entry_payload(entry)
    known = sorted({e.classroom for e in entries})
    free = [room for room in known if room not in occupied]
    return {"occupied": occupied, "free": free, "at": fmt_time(now_t)}


def faculty_for_subject(user, subject_query):
    """Which faculty teaches a subject, per section (schedule-backed)."""
    from lectures.models import Subject

    subjects = Subject.objects.filter(
        Q(code__iexact=subject_query) | Q(name__icontains=subject_query)
    )[:3]
    results = []
    for subject in subjects:
        entries = TimetableEntry.objects.filter(subject=subject).select_related(
            "faculty", "section", "time_slot", "subject"
        )
        visible = []
        for entry in entries:
            cls = entry.academic_class
            if cls and not can_view_class(user, cls):
                continue
            visible.append(entry_payload(entry))
        if visible:
            results.append(
                {
                    "subject_code": subject.code,
                    "subject_name": subject.name,
                    "rows": visible,
                }
            )
    return results


# ---------------------------------------------------------------------------
# attendance services
# ---------------------------------------------------------------------------
def _marked_lecture_ids(lecture_ids):
    marked = (
        AttendanceRecord.objects.filter(lecture_id__in=list(lecture_ids))
        .values("lecture_id")
        .annotate(total=Count("id"))
    )
    return {row["lecture_id"]: row["total"] for row in marked}


def today_attendance_status(user, day=None):
    """Marked / unmarked state for today's lectures in the user's scope."""
    day = day or local_now().date()
    lectures = [l for l in day_lectures(user, day) if l.status != Lecture.Status.CANCELLED]
    profile = getattr(user, "faculty_profile", None)
    if profile and not user.is_hod:
        # Faculty view: their own lectures (their marking duty).
        lectures = [l for l in lectures if l.assigned_faculty_id == profile.id]
    marked_map = _marked_lecture_ids([l.id for l in lectures])
    rows = []
    for lecture in lectures:
        marked = marked_map.get(lecture.id, 0)
        rows.append(
            {
                "lecture_id": lecture.id,
                "subject": lecture.subject.name,
                "section": lecture.section,
                "start_time": fmt_time(lecture.start_time),
                "status": lecture.status,
                "marked": bool(marked),
                "records_count": marked,
            }
        )
    return {
        "date": str(day),
        "lectures": rows,
        "marked_count": sum(1 for r in rows if r["marked"]),
        "unmarked_count": sum(1 for r in rows if not r["marked"]),
    }


def attendance_summary(user, class_id=None, week_start=None):
    """Attendance aggregates over the user's authorized records.

    Percentages use the same convention as the existing attendance reports
    endpoint: present / total marked records. Unmarked lectures are excluded
    (never counted as absent).
    """
    from faculty.models import FacultyProfile

    profile = getattr(user, "faculty_profile", None)
    qs = AttendanceRecord.objects.select_related(
        "lecture", "lecture__subject", "lecture__academic_class", "roster"
    )
    detail_ids = detail_class_ids(user)

    if user.is_hod:
        if class_id:
            qs = qs.filter(lecture__academic_class_id=class_id)
    elif profile:
        if class_id:
            own_lecture_ids = list(
                Lecture.objects.filter(
                    assigned_faculty=profile, academic_class_id=class_id
                ).values_list("id", flat=True)
            )
            if class_id not in detail_ids and not own_lecture_ids:
                return {"error": "not_authorized"}
            qs = qs.filter(
                Q(lecture__academic_class_id=class_id)
                & (Q(lecture__academic_class_id__in=detail_ids) | Q(lecture_id__in=own_lecture_ids))
            )
        else:
            qs = qs.filter(
                Q(lecture__assigned_faculty=profile)
                | Q(lecture__academic_class_id__in=detail_ids)
            )
    else:
        return {"error": "not_authorized"}

    if week_start:
        end = week_start + timedelta(days=6)
        qs = qs.filter(lecture__date__range=(week_start, end))

    summary = qs.aggregate(
        total=Count("id"),
        present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
        absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
        on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
    )
    total = summary["total"]
    payload = {
        "scope": "class" if class_id else ("department" if user.is_hod else "authorized_classes"),
        "total_records": total,
        "present": summary["present"],
        "absent": summary["absent"],
        "on_leave": summary["on_leave"],
        "present_percentage": round(summary["present"] / total * 100, 1) if total else None,
        "min_attendance_pct": settings.ODRMS_MIN_ATTENDANCE_PCT,
    }

    # Today's numbers separately (matches "today's attendance status").
    payload["today"] = today_attendance_status(user)

    # Per-student detail (coordinators/HOD/authorized VIEW holders only).
    if detail_ids and (user.is_hod or class_id is None or class_id in detail_ids):
        roster_qs = qs.filter(lecture__academic_class_id__in=detail_ids)
        per_student = (
            roster_qs.values(
                "roster_id",
                "roster__roll_number",
                "roster__full_name",
                "lecture__academic_class_id",
            )
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
                absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
                on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
            )
            .order_by("roster__roll_number")
        )
        students = []
        for row in per_student:
            pct = round(row["present"] / row["total"] * 100, 1) if row["total"] else None
            students.append(
                {
                    "roll_number": row["roster__roll_number"],
                    "name": row["roster__full_name"],
                    "class_id": row["lecture__academic_class_id"],
                    "total_marked": row["total"],
                    "present": row["present"],
                    "absent": row["absent"],
                    "on_leave": row["on_leave"],
                    "percentage": pct,
                    "low_attendance": pct is not None and pct < settings.ODRMS_MIN_ATTENDANCE_PCT,
                }
            )
        payload["students"] = students
        payload["low_attendance_students"] = [s for s in students if s["low_attendance"]]
    return payload


# ---------------------------------------------------------------------------
# announcements / digest
# ---------------------------------------------------------------------------
def department_updates(user):
    """Honest updates: the user's real DB notifications + assigned tasks."""
    notifications = Notification.objects.filter(recipient=user)[:5]
    profile = getattr(user, "faculty_profile", None)
    tasks_qs = DepartmentTask.objects.all()
    if not user.is_hod:
        tasks_qs = tasks_qs.filter(assigned_faculty=profile) if profile else DepartmentTask.objects.none()
    tasks_qs = tasks_qs.exclude(status=DepartmentTask.Status.COMPLETED)[:5]
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "is_read": n.is_read,
                "created_at": timezone.localtime(n.created_at).strftime("%d %b %I:%M %p"),
            }
            for n in notifications
        ],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "deadline": str(t.deadline),
            }
            for t in tasks_qs
        ],
    }


def build_digest(user, now_dt, sections):
    """§5 automatic daily academic update — all values from real records."""
    today = now_dt.date()
    weekday = weekday_name_for(today)
    greeting = "Good morning" if now_dt.hour < 12 else ("Good afternoon" if now_dt.hour < 17 else "Good evening")

    total_lectures = sum(s["today_lecture_count"] for s in sections)
    cancelled_total = sum(len(s["cancelled_today"]) for s in sections)

    if user.is_hod or not sections:
        marking = None
    else:
        marking = today_attendance_status(user)

    changes = timetable_changes_for_day(user, today)
    updates = department_updates(user)

    current_bits = []
    for s in sections:
        if s["current"]:
            current_bits.append(f"Section {s['section']}: {s['current']['subject_name']}")
        elif s["next"]:
            current_bits.append(
                f"Section {s['section']}: next at {s['next']['start_time']} ({s['next']['subject_name']})"
            )
        else:
            current_bits.append(f"Section {s['section']}: no scheduled class now")

    return {
        "greeting": greeting,
        "date": now_dt.strftime("%A, %d %B %Y"),
        "weekday": weekday,
        "current_or_next": current_bits,
        "total_lectures_today": total_lectures,
        "cancelled_today": cancelled_total,
        "attendance_marking": None
        if marking is None
        else {
            "marked": marking["marked_count"],
            "unmarked": marking["unmarked_count"],
        },
        "timetable_changes": {
            "cancelled": len(changes["cancelled"]),
            "substituted": len(changes["substituted"]),
            "adhoc": len(changes["adhoc"]),
        },
        "notifications_count": len(updates["notifications"]),
        "pending_tasks": len(updates["tasks"]),
        "updates": updates,
    }
