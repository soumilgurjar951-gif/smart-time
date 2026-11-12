"""Seed realistic demo data so the Smart Assistant can be verified end-to-end.

Creates (idempotently — skips when timetable rows already exist):
- Weekly TimetableEntry grid (Mon–Fri) for Sections A and B.
- Lecture occurrences for the next few working days (including today when it
  is a weekday): past lectures COMPLETED, a CANCELLED one and a substituted
  one so those assistant states can be demonstrated.
- AttendanceRoster students for both sections.
- AttendanceRecords for one completed lecture (others intentionally left
  unmarked to prove "unmarked != absent").
- One DepartmentTask + notifications for the demo faculty/HOD.

Usage:  python manage.py seed_assistant_demo          # add --force to reseed
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from attendance.models import AttendanceRecord, AttendanceRoster
from classes.models import AcademicClass
from faculty.models import FacultyProfile
from lectures.models import AcademicYear, Lecture, Section, Subject, TimeSlot, TimetableEntry
from notifications.models import Notification
from tasks.models import DepartmentTask

SECTION_SUBJECTS = {
    "A": ["CSIT501", "CSIT502", "CSIT503", "CSIT504", "CSIT506", "CSIT508"],
    "B": ["CSIT502", "CSIT501", "CSIT504", "CSIT503", "CSIT505", "Soft Skill"],
}

PERIODS_PER_DAY = 6
ROOMS = ["CSIT-101", "CSIT-102", "CSIT-103", "CSIT-104"]


class Command(BaseCommand):
    help = "Seed demo timetable/lecture/attendance data for Smart Assistant verification."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Seed even if timetable rows already exist.")

    def handle(self, *args, **options):
        force = options.get("force")
        if TimetableEntry.objects.exists() and not force:
            self.stdout.write(self.style.WARNING("Timetable rows already exist — skipping (use --force to reseed)."))
            return

        year = AcademicYear.objects.first()
        sections = {s.code: s for s in Section.objects.all()}
        subjects = {s.code: s for s in Subject.objects.all()}
        slots = {ts.period_number: ts for ts in TimeSlot.objects.filter(is_break=False)}
        faculty = list(
            FacultyProfile.objects.exclude(user=None).filter(user__is_active=True)[:8]
        )
        if not (year and "A" in sections and "B" in sections and len(subjects) >= 6 and len(slots) >= 6 and faculty):
            self.stdout.write(self.style.ERROR("Missing base data (sections/subjects/slots/faculty). Run existing seeders first."))
            return

        user_model = get_user_model()
        hod = user_model.objects.filter(role=user_model.Role.HOD).first()

        with transaction.atomic():
            # ------------------------------------------------------------------
            # weekly grid
            # ------------------------------------------------------------------
            weekdays = list(TimetableEntry.Weekday.values)  # MONDAY..FRIDAY
            section_offsets = {"A": 0, "B": 2}
            for weekday in weekdays:
                for section_code, codes in SECTION_SUBJECTS.items():
                    section = sections[section_code]
                    cls = AcademicClass.objects.filter(section=section_code, is_active=True).first()
                    for i in range(PERIODS_PER_DAY):
                        subject = subjects.get(codes[i % len(codes)]) or list(subjects.values())[i % len(subjects)]
                        teacher = faculty[(section_offsets[section_code] + i + len(weekday)) % len(faculty)]
                        entry, created = TimetableEntry.objects.get_or_create(
                            weekday=weekday,
                            section=section,
                            time_slot=slots[i + 1],
                            defaults={
                                "subject": subject,
                                "faculty": teacher,
                                "classroom": ROOMS[i % len(ROOMS)],
                                "lecture_type": Lecture.LectureType.LAB if "Lab" in subject.name else Lecture.LectureType.THEORY,
                                "topic": "",
                                "academic_year": year,
                                "academic_class": cls,
                            },
                        )
                        if not created and cls and entry.academic_class_id is None:
                            entry.academic_class = cls
                            entry.save(update_fields=["academic_class"])

            # ------------------------------------------------------------------
            # lecture occurrences for the next few working days
            # ------------------------------------------------------------------
            today = timezone.localdate()
            working_days = []
            cursor = today
            while len(working_days) < 3:
                if cursor.weekday() <= 4:
                    working_days.append(cursor)
                cursor += timedelta(days=1)

            now_t = timezone.localtime().time()
            for day in working_days:
                weekday = list(TimetableEntry.Weekday.values)[day.weekday()]
                entries = TimetableEntry.objects.filter(weekday=weekday).select_related(
                    "section", "subject", "faculty", "time_slot", "academic_class"
                )
                for index, entry in enumerate(entries):
                    if entry.academic_class is None:
                        continue
                    lecture, created = Lecture.objects.get_or_create(
                        timetable_entry=entry,
                        date=day,
                        defaults={
                            "subject": entry.subject,
                            "assigned_faculty": entry.faculty,
                            "department": entry.section.department,
                            "semester": entry.section.semester,
                            "section": entry.section.code,
                            "start_time": entry.time_slot.start_time,
                            "end_time": entry.time_slot.end_time,
                            "classroom": entry.classroom,
                            "lecture_type": entry.lecture_type,
                            "topic": entry.topic,
                            "academic_class": entry.academic_class,
                            "status": Lecture.Status.SCHEDULED,
                        },
                    )
                    if not created:
                        continue
                    # Stateful demo values: past → COMPLETED, one later slot
                    # CANCELLED, one substituted.
                    if day == today and lecture.end_time <= now_t:
                        lecture.status = Lecture.Status.COMPLETED
                        lecture.save(update_fields=["status"])
                    elif day == today and index == len(list(entries)) - 1:
                        lecture.status = Lecture.Status.CANCELLED
                        lecture.save(update_fields=["status"])

                # Substitution demo: the 3rd slot of today's Section A run by a
                # different faculty than the grid owner.
                if day == today:
                    third = entries.filter(section__code="A", time_slot__period_number=3).first()
                    if third:
                        lecture = Lecture.objects.filter(timetable_entry=third, date=day).first()
                        substitute = next((f for f in faculty if f.id != third.faculty_id), None)
                        if lecture and substitute:
                            lecture.assigned_faculty = substitute
                            lecture.save(update_fields=["assigned_faculty", "updated_at"])

            # ------------------------------------------------------------------
            # rosters
            # ------------------------------------------------------------------
            if AttendanceRoster.objects.count() == 0:
                for section_code in ("A", "B"):
                    for i in range(1, 7):
                        AttendanceRoster.objects.create(
                            roll_number=f"CSIT{section_code}{i:02d}",
                            full_name=f"Student {section_code}{i:02d}",
                            semester=5,
                            section=section_code,
                        )

            # ------------------------------------------------------------------
            # attendance for the FIRST completed lecture today (both sections)
            # ------------------------------------------------------------------
            if AttendanceRecord.objects.count() == 0:
                for section_code in ("A", "B"):
                    completed = (
                        Lecture.objects.filter(
                            date=today,
                            section=section_code,
                            status=Lecture.Status.COMPLETED,
                        )
                        .order_by("start_time")
                        .first()
                    )
                    if not completed:
                        continue
                    statuses = [
                        AttendanceRecord.Status.PRESENT,
                        AttendanceRecord.Status.PRESENT,
                        AttendanceRecord.Status.ABSENT,
                        AttendanceRecord.Status.PRESENT,
                        AttendanceRecord.Status.ON_LEAVE,
                        AttendanceRecord.Status.PRESENT,
                    ]
                    rosters = list(AttendanceRoster.objects.filter(section=section_code)[:6])
                    for roster, att_status in zip(rosters, statuses):
                        AttendanceRecord.objects.get_or_create(
                            lecture=completed,
                            roster=roster,
                            defaults={
                                "status": att_status,
                                "marked_by": completed.assigned_faculty.user if completed.assigned_faculty and completed.assigned_faculty.user else hod,
                            },
                        )

            # ------------------------------------------------------------------
            # one task + notifications so updates/digest have honest content
            # ------------------------------------------------------------------
            demo_profile = FacultyProfile.objects.filter(faculty_code="DEMO01").first()
            if demo_profile and demo_profile.user and DepartmentTask.objects.count() == 0:
                DepartmentTask.objects.create(
                    title="Prepare mid-semester question paper (Section A)",
                    description="Submit the 5th semester mid-sem question paper for review.",
                    assigned_faculty=demo_profile,
                    assigned_by=hod or demo_profile.user,
                    priority=DepartmentTask.Priority.HIGH,
                    deadline=today + timedelta(days=7),
                )
            if demo_profile and demo_profile.user:
                Notification.objects.get_or_create(
                    recipient=demo_profile.user,
                    title="Mid-semester exam schedule published",
                    defaults={
                        "message": "Question papers for 5th semester CSIT are due with Bloom's taxonomy mapping.",
                        "notification_type": Notification.NotificationType.INFO,
                    },
                )
            if hod:
                Notification.objects.get_or_create(
                    recipient=hod,
                    title="Demo timetable and attendance seeded",
                    defaults={
                        "message": "seed_assistant_demo created demo timetable, lectures, rosters and attendance.",
                        "notification_type": Notification.NotificationType.INFO,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded: timetable={TimetableEntry.objects.count()}, lectures={Lecture.objects.count()}, "
                f"rosters={AttendanceRoster.objects.count()}, records={AttendanceRecord.objects.count()}"
            )
        )
