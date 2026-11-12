"""Query answering for the ODRMS Smart Assistant.

Maps parsed NLU intents onto the database-backed services and renders the
results as short, natural replies. All facts come from the database; when a
value is unavailable the reply says so. Hinglish questions receive Hinglish
replies, English questions receive English replies.
"""

from datetime import timedelta

from django.utils import timezone

from lectures.models import Lecture

from . import nlu, services

HINGLISH_REPLY = {
    "no_class_today": "Abhi koi scheduled class nahi hai. {next_line}",
    "next_line": "Aapki next class {subject} hai — Section {section}, {start} se {end} tak, {in_min} mein shuru.",
    "running": "Abhi {subject} chal rahi hai — Section {section}, {start} se {end} tak. {remaining} bache hain.",
    "running_room": " Classroom: {room}.",
    "break": "Abhi break chal raha hai. Next class {start} pe hai.",
    "day_over": "Aaj ki classes khatam ho gayi hain.",
    "weekend": "Aaj college band hai (weekend).",
    "not_authorized": "Is class ka record dekhne ki permission nahi hai. HOD ya coordinator se access request karein.",
}

ENGLISH_REPLY = {
    "no_class_today": "You currently have no scheduled class. {next_line}",
    "next_line": "Your next class is {subject} for Section {section}, from {start} to {end}, starting in {in_min}.",
    "running": "Your current class is {subject} for Section {section}. It started at {start} and ends at {end}. {remaining} are remaining.",
    "running_room": " Classroom: {room}.",
    "break": "It is break time right now. Your next class starts at {start}.",
    "day_over": "All scheduled classes are over for today.",
    "weekend": "The college is closed today (weekend).",
    "not_authorized": "You are not authorized to view this class's records. Request access from the HOD or the class coordinator.",
}


def _pack(text, **kwargs):
    try:
        return text.format(**kwargs)
    except (KeyError, IndexError):
        return text


def _yes_no(flag, hinglish):
    return ("haan" if flag else "nahi") if hinglish else ("yes" if flag else "no")


def _lecture_line(payload, hinglish):
    base = "{subject} (Section {section}), {start}–{end}".format(
        subject=payload["subject_name"],
        section=payload["section"],
        start=payload["start_time"],
        end=payload["end_time"],
    )
    extras = []
    if payload.get("classroom"):
        extras.append(f"Room {payload['classroom']}")
    if payload.get("faculty_name"):
        extras.append(f"Faculty: {payload['faculty_name']}")
    if payload.get("status") == "CANCELLED":
        extras.append("CANCELLED")
    if payload.get("substituted_for"):
        extras.append(f"substituting {payload['substituted_for']}")
    if payload.get("source") == "timetable":
        extras.append("as per weekly timetable")
    return base + (" — " + ", ".join(extras) if extras else "")


def _current_class_answer(user, parsed):
    now_dt = services.local_now()
    today = now_dt.date()
    lang = HINGLISH_REPLY if parsed["hinglish"] else ENGLISH_REPLY

    if services.weekday_name_for(today) is None:
        day, weekday = services.next_day_with_schedule(user, today)
        if day:
            entries = services.day_entries(user, day)
            if entries:
                first = entries[0]
                return _pack(
                    lang["weekend"] + " " + lang["next_line"],
                    subject=first.subject.name,
                    section=first.section.code,
                    start=services.fmt_time(first.time_slot.start_time),
                    end=services.fmt_time(first.time_slot.end_time),
                    in_min=weekday.title() + (" " + str(day.strftime("%d %b"))),
                )
        return lang["weekend"]

    sections = services.scoped_classes(user)
    wanted = parsed["section"]
    if wanted:
        sections = [c for c in sections if c.section == wanted]
        if not sections:
            return _pack(
                lang["not_authorized"],
                section=wanted,
            )

    lines = []
    data = []
    for cls in sections:
        state = services.section_state(user, cls, now_dt)
        data.append(state)
        current = state["current"]
        nxt = state["next"]
        if state["state"] == "running" and current:
            line = _pack(
                lang["running"],
                subject=current["subject_name"],
                section=current["section"],
                start=current["start_time"],
                end=current["end_time"],
                remaining=current.get("remaining_minutes") or "0 minutes",
            )
            if current.get("classroom"):
                line += _pack(lang["running_room"], room=current["classroom"])
            lines.append(line)
        elif state["state"] == "break" and nxt:
            lines.append(_pack(lang["break"], start=nxt["start_time"]))
        elif nxt:
            lines.append(
                _pack(
                    lang["no_class_today"],
                    next_line=_pack(
                        lang["next_line"],
                        subject=nxt["subject_name"],
                        section=nxt["section"],
                        start=nxt["start_time"],
                        end=nxt["end_time"],
                        in_min=nxt.get("starts_in_minutes") or "",
                    ),
                )
            )
        elif state["state"] == "day_over":
            lines.append(lang["day_over"])
        else:
            lines.append(lang["no_class_today"].format(next_line=""))
    return {"text": " ".join(lines), "data": data}


def _next_class_answer(user, parsed):
    now_dt = services.local_now()
    sections = services.scoped_classes(user)
    wanted = parsed["section"]
    if wanted:
        sections = [c for c in sections if c.section == wanted]
        if not sections:
            return ENGLISH_REPLY["not_authorized"] if not parsed["hinglish"] else HINGLISH_REPLY["not_authorized"]
    lang = HINGLISH_REPLY if parsed["hinglish"] else ENGLISH_REPLY

    best = None
    for cls in sections:
        state = services.section_state(user, cls, now_dt)
        nxt = state["next"]
        if nxt:
            best = nxt
            break
    if not best:
        day, weekday = services.next_day_with_schedule(user, now_dt.date())
        entries = services.day_entries(user, day) if day else []
        if entries:
            first = entries[0]
            best = services.entry_payload(first)
            best["starts_in_minutes"] = weekday.title()
    if best:
        return _pack(
            lang["next_line"],
            subject=best["subject_name"],
            section=best["section"],
            start=best["start_time"],
            end=best["end_time"],
            in_min=best.get("starts_in_minutes") or "",
        )
    return lang["day_over"]


def _timetable_answer(user, parsed):
    from datetime import date

    now = services.local_now()
    day = now.date()
    if parsed["intent"] == "timetable_tomorrow":
        day = day + timedelta(days=1)
    elif parsed["weekday"]:
        # Resolve the upcoming date for the requested weekday.
        for offset in range(0, 8):
            candidate = now.date() + timedelta(days=offset)
            if services.weekday_name_for(candidate) == parsed["weekday"]:
                day = candidate
                break
    timetable = services.timetable_for_day(user, day, section=parsed["section"])
    if parsed["intent"] == "timetable_full":
        # Whole week, per visible class.
        blocks = []
        for offset in range(0, 5):
            day_i = now.date() + timedelta(days=offset)
            timetable = services.timetable_for_day(user, day_i, section=parsed["section"])
            for block in timetable["classes"]:
                rows = [r for r in block["rows"] if not r.get("cancelled")]
                if rows:
                    lines = [_lecture_line(r, parsed["hinglish"]) for r in rows]
                    blocks.append(f"{timetable['weekday'].title()} ({timetable['date']}): " + "; ".join(lines))
        if not blocks:
            return "No lectures are scheduled in the timetable for your authorized classes this week."
        return {"text": "\n".join(blocks[:40]), "data": blocks}

    if not timetable["classes"] or all(not c["rows"] for c in timetable["classes"]):
        if parsed["hinglish"]:
            return f"{timetable['date']} ({timetable['weekday'] or 'weekend'}) ke liye koi scheduled class nahi hai."
        return f"No lectures are scheduled for {timetable['date']} ({timetable['weekday'] or 'weekend'})."
    lines = []
    for block in timetable["classes"]:
        lines.append(f"Section {block['section']} — {timetable['date']} ({timetable['weekday'].title() if timetable['weekday'] else 'Weekend'})")
        for row in block["rows"]:
            lines.append(" • " + _lecture_line(row, parsed["hinglish"]))
    return {"text": "\n".join(lines), "data": timetable}


def _attendance_answer(user, parsed):
    intent = parsed["intent"]
    lang_hi = parsed["hinglish"]

    if intent == "attendance_week":
        today = services.local_now().date()
        week_start = today - timedelta(days=today.weekday())
        summary = services.attendance_summary(user, class_id=None, week_start=week_start)
    else:
        summary = services.attendance_summary(user, class_id=None)

    if summary.get("error") == "not_authorized":
        return HINGLISH_REPLY["not_authorized"] if lang_hi else ENGLISH_REPLY["not_authorized"]

    total = summary.get("total_records") or 0
    pct = summary.get("present_percentage")

    if intent == "attendance_percentage":
        if pct is None:
            return (
                "Abhi koi attendance record available nahi hai, isliye percentage calculate nahi ho sakti."
                if lang_hi
                else "No attendance records are available yet, so a percentage cannot be calculated."
            )
        base = (
            f"Aapki authorized classes ki attendance {pct}% hai ({summary['present']} present, {summary['absent']} absent, {summary['on_leave']} on-leave, total {total} records)."
            if lang_hi
            else f"Attendance across your authorized classes is {pct}% ({summary['present']} present, {summary['absent']} absent, {summary['on_leave']} on leave, {total} marked records)."
        )
        low = summary.get("low_attendance_students") or []
        if low:
            names = ", ".join(f"{s['name']} ({s['percentage']}%)" for s in low[:6])
            base += f" Minimum {summary['min_attendance_pct']}% ke neeche: {names}." if lang_hi else f" Below the {summary['min_attendance_pct']}% minimum: {names}."
        return {"text": base, "data": summary}

    if intent == "low_attendance":
        students = summary.get("low_attendance_students") or []
        if not students:
            return (
                f"Authorized classes mein koi student {summary.get('min_attendance_pct')}% se neeche nahi hai."
                if lang_hi
                else f"No student in your authorized classes is below the {summary.get('min_attendance_pct')}% minimum."
            )
        lines = [
            f"{s['roll_number']} {s['name']} — {s['percentage']}% ({s['present']}/{s['total_marked']} present)"
            for s in students[:12]
        ]
        header = (
            f"Low attendance (minimum {summary['min_attendance_pct']}% se kam):"
            if lang_hi
            else f"Low attendance (below the {summary['min_attendance_pct']}% minimum):"
        )
        return {"text": header + "\n" + "\n".join(lines), "data": students}

    if intent == "attendance_week":
        if not total:
            return (
                "Is week ka koi attendance record nahi hai."
                if lang_hi
                else "No attendance has been recorded for this week yet."
            )
        base = (
            f"Is week ({week_start} se) ki attendance: {summary['present']}/{total} present — {pct}%."
            if lang_hi
            else f"This week ({week_start} onwards): {summary['present']}/{total} present — {pct}%."
        )
        return {"text": base, "data": summary}

    # attendance_status (today / marked-or-not)
    today = summary.get("today") or {}
    lectures = today.get("lectures") or []
    if not lectures:
        return (
            "Aaj aapke scope mein koi lecture scheduled nahi hai, isliye attendance status nahi hai."
            if lang_hi
            else "No lectures are scheduled in your scope today, so there is no attendance status to report."
        )
    lines = []
    for row in lectures:
        state = (
            "attendance mark ho gayi hai" if row["marked"] else "attendance ABHI MARK NAHI hui"
        ) if lang_hi else (
            "attendance has been marked" if row["marked"] else "attendance has NOT been marked yet"
        )
        lines.append(f"{row['subject']} (Section {row['section']}, {row['start_time']}) — {state}")
    header = (
        f"Aaj ({today.get('date')}) ki attendance: {today.get('marked_count')} marked, {today.get('unmarked_count')} unmarked."
        if lang_hi
        else f"Today ({today.get('date')}): {today.get('marked_count')} marked, {today.get('unmarked_count')} unmarked."
    )
    return {"text": header + "\n" + "\n".join(lines), "data": summary.get("today")}


def _cancelled_answer(user, parsed):
    day = services.local_now().date()
    changes = services.timetable_changes_for_day(user, day)
    cancelled = changes["cancelled"]
    substituted = changes["substituted"]
    lang_hi = parsed["hinglish"]
    lines = []
    if cancelled:
        for row in cancelled:
            lines.append(
                f"{row['subject_name']} (Section {row['section']}, {row['start_time']}) — CANCELLED"
                if not lang_hi
                else f"{row['subject_name']} (Section {row['section']}, {row['start_time']}) — CANCEL ho gayi"
            )
    else:
        lines.append(
            "Aaj aapki authorized classes mein koi class cancel nahi hui." if lang_hi
            else "No classes are cancelled today in your authorized classes."
        )
    if substituted:
        for row in substituted:
            lines.append(
                f"{row['subject_name']} (Section {row['section']}): {row['faculty_name']} padha rahe hain ({row['substituted_for']} ki jagah)."
                if lang_hi
                else f"{row['subject_name']} (Section {row['section']}): taken by {row['faculty_name']} (substituting {row['substituted_for']})."
            )
    return {"text": "\n".join(lines), "data": changes}


def _free_rooms_answer(user, parsed):
    free = services.free_rooms_now(user)
    lang_hi = parsed["hinglish"]
    if free["free"]:
        rooms = ", ".join(free["free"])
        text = (
            f"Abhi ({free['at']}) ye rooms free hain (aapki authorized classes ke hisaab se): {rooms}."
            if lang_hi
            else f"Right now ({free['at']}) these rooms are free within your authorized classes: {rooms}."
        )
    else:
        text = (
            f"Abhi ({free['at']}) aapki authorized classes ke saare rooms occupied hain."
            if lang_hi
            else f"All rooms within your authorized classes are occupied right now ({free['at']})."
        )
    return {"text": text, "data": free}


def _faculty_subject_answer(user, parsed):
    subject = parsed.get("subject")
    lang_hi = parsed["hinglish"]
    if not subject:
        return (
            "Subject ka naam bataiye — jaise 'Database Management ki class kis faculty ki hai?'"
            if lang_hi
            else "Tell me the subject name, e.g. 'Who teaches Database Management?'"
        )
    results = services.faculty_for_subject(user, subject)
    if not results:
        return (
            f"'{subject}' ke liye aapki authorized classes mein koi timetable entry nahi mili."
            if lang_hi
            else f"No timetable entry for '{subject}' in your authorized classes."
        )
    lines = []
    for block in results:
        for row in block["rows"]:
            lines.append(
                f"{block['subject_name']} — Section {row['section']}, {row['faculty_name']} ({row['start_time']}–{row['end_time']}, Room {row['classroom']})"
            )
    return {"text": "\n".join(lines), "data": results}


def _compare_answer(user, parsed):
    a = services.timetable_for_day(user, services.local_now().date(), section="A")
    b = services.timetable_for_day(user, services.local_now().date(), section="B")
    lang_hi = parsed["hinglish"]
    lines = ["Today — Section A vs Section B:"]
    for block, label in ((a["classes"][0] if a["classes"] else None, "A"), (b["classes"][0] if b["classes"] else None, "B")):
        if not block or not block["rows"]:
            lines.append(f"Section {label}: koi class nahi." if lang_hi else f"Section {label}: no classes.")
            continue
        lines.append(f"Section {label}:")
        for row in block["rows"]:
            lines.append("  • " + _lecture_line(row, lang_hi))
    return {"text": "\n".join(lines), "data": {"A": a, "B": b}}


def _updates_answer(user, parsed):
    updates = services.department_updates(user)
    lang_hi = parsed["hinglish"]
    lines = []
    if updates["notifications"]:
        lines.append(
            "Recent department notifications:" if not lang_hi else "Recent department notifications:"
        )
        for n in updates["notifications"][:5]:
            lines.append(f" • [{n['type']}] {n['title']} ({n['created_at']})")
    else:
        lines.append(
            "Abhi koi department notification nahi hai." if lang_hi else "No department notifications right now."
        )
    if updates["tasks"]:
        lines.append("Pending tasks:" if not lang_hi else "Pending tasks:")
        for t in updates["tasks"][:5]:
            lines.append(f" • {t['title']} — {t['status']}, deadline {t['deadline']}")
    return {"text": "\n".join(lines), "data": updates}


def _digest_answer(user, parsed):
    context = services.current_context(user)
    digest = context["digest"]
    lang_hi = parsed["hinglish"]
    lines = [
        f"{digest['greeting']}! ({digest['date']})",
    ]
    for bit in digest["current_or_next"]:
        lines.append(" • " + bit)
    lines.append(
        f" • Aaj {digest['total_lectures_today']} lectures scheduled hain ({digest['cancelled_today']} cancelled)."
        if lang_hi
        else f" • {digest['total_lectures_today']} lectures scheduled today ({digest['cancelled_today']} cancelled)."
    )
    marking = digest.get("attendance_marking")
    if marking:
        lines.append(
            f" • Attendance: {marking['marked']} lectures marked, {marking['unmarked']} unmarked."
        )
    changes = digest["timetable_changes"]
    if changes["cancelled"] or changes["substituted"]:
        lines.append(
            f" • Timetable changes: {changes['cancelled']} cancelled, {changes['substituted']} substituted."
        )
    if digest["pending_tasks"]:
        lines.append(f" • {digest['pending_tasks']} pending tasks assigned to you.")
    lines.append("Have a productive day!" if not lang_hi else "Shubh din!")
    return {"text": "\n".join(lines), "data": context["digest"]}


def _help_answer(parsed):
    if parsed["hinglish"]:
        return (
            "Main ODRMS Smart Assistant hoon. Ye puch sakte hain:\n"
            " • 'Abhi konsi class hai?' / 'Meri next class kab hai?'\n"
            " • 'Aaj ka timetable batao' / 'B section ka schedule dikhao'\n"
            " • 'Attendance update kya hai?' / 'Kitna time bacha hai?'\n"
            " • 'Aaj koi class cancel hui?' / 'Python ki class kis faculty ki hai?'\n"
            " • 'Department updates' / 'Mere pending tasks'"
        )
    return (
        "I am the ODRMS Smart Assistant. You can ask me:\n"
        " • 'Which class is running right now?' / 'What is my next class?'\n"
        " • 'Show today's timetable' / 'Section B schedule'\n"
        " • 'What is the attendance status?' / 'How much time is left?'\n"
        " • 'Any class cancelled today?' / 'Who teaches Python?'\n"
        " • 'Department updates' / 'My pending tasks'"
    )


def _time_remaining_answer(user, parsed):
    now_dt = services.local_now()
    lang_hi = parsed["hinglish"]
    sections = services.scoped_classes(user)
    profile = getattr(user, "faculty_profile", None)

    target = None
    if profile:
        mine = [
            l
            for l in services.day_lectures(user, now_dt.date())
            if l.assigned_faculty_id == profile.id and l.status != Lecture.Status.CANCELLED
        ]
        running, upcoming, _ = services._split(mine, now_dt.time())
        if running:
            lecture = running[0]
            remaining = services.minutes_between(now_dt, lecture.end_time)
            text = (
                f"{lecture.subject.name} {remaining} minute mein khatam hogi ({services.fmt_time(lecture.end_time)} tak)."
                if lang_hi
                else f"{lecture.subject.name} ends in {services.fmt_minutes(remaining)} (at {services.fmt_time(lecture.end_time)})."
            )
            return {"text": text, "data": {"remaining_minutes": remaining, "subject": lecture.subject.name}}
        if upcoming:
            target = upcoming[0]
    if target is None:
        for cls in sections:
            state = services.section_state(user, cls, now_dt)
            if state["current"]:
                lecture_like = state["current"]
                remaining = services.minutes_between(now_dt, _to_time(lecture_like.get("end_time")))
                text = (
                    f"{lecture_like['subject_name']} {services.fmt_minutes(remaining)} aur chalegi ({lecture_like['end_time']} tak)."
                    if lang_hi
                    else f"{lecture_like['subject_name']} runs for another {services.fmt_minutes(remaining)} (until {lecture_like['end_time']})."
                )
                return {"text": text, "data": lecture_like}
            if state["next"]:
                target = state["next"]
                break
    if target:
        starts_in = target.get("starts_in_minutes")
        text = (
            f"Abhi koi class nahi chal rahi. {target['subject_name']} {starts_in} mein start hogi ({target['start_time']} pe)."
            if lang_hi
            else f"No class is running right now. {target['subject_name']} starts in {starts_in} (at {target['start_time']})."
        )
        return {"text": text, "data": target}
    return (
        "Aaj ke liye ab koi scheduled class nahi bachi."
        if lang_hi
        else "No scheduled classes remain for today."
    )


def _to_time(text):
    """Parse '9:25 AM' back into a time object (best effort)."""
    from datetime import datetime

    try:
        return datetime.strptime(text, "%I:%M %p").time()
    except (TypeError, ValueError):
        return None


def answer_query(user, message):
    parsed = nlu.parse(message)
    intent = parsed["intent"] or "help"
    try:
        if intent == "current_class":
            result = _current_class_answer(user, parsed)
        elif intent == "next_class":
            result = _next_class_answer(user, parsed)
        elif intent == "time_remaining":
            result = _time_remaining_answer(user, parsed)
        elif intent in {"timetable_today", "timetable_tomorrow", "timetable_full", "timetable_weekday"}:
            result = _timetable_answer(user, parsed)
        elif intent in {
            "attendance_status",
            "attendance_percentage",
            "low_attendance",
            "attendance_week",
        }:
            result = _attendance_answer(user, parsed)
        elif intent == "cancelled_check":
            result = _cancelled_answer(user, parsed)
        elif intent == "free_rooms":
            result = _free_rooms_answer(user, parsed)
        elif intent == "faculty_of_subject":
            result = _faculty_subject_answer(user, parsed)
        elif intent == "compare_sections":
            result = _compare_answer(user, parsed)
        elif intent == "updates":
            result = _updates_answer(user, parsed)
        elif intent == "tasks":
            result = _updates_answer(user, parsed)
        elif intent == "digest":
            result = _digest_answer(user, parsed)
        else:
            result = _help_answer(parsed)
    except Exception:
        # Never break the chatbot on an unexpected error; report honestly.
        raise
    if isinstance(result, str):
        return {"intent": intent, "text": result, "data": None, "generated_at": services.local_now().isoformat()}
    return {
        "intent": intent,
        "text": result["text"],
        "data": result.get("data"),
        "generated_at": services.local_now().isoformat(),
    }
