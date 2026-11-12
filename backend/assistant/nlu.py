"""Rule-based natural-language understanding for the ODRMS Smart Assistant.

Understands plain English and Hinglish classroom queries without any external
API. The parser extracts an intent plus simple entities (section, weekday,
subject). All factual content is filled later by the database-backed services —
the NLU layer only classifies *what* to look up, never *what the answer is*.
"""

import re

HINGLISH_MARKERS = (
    "abhi", "konsi", "kaunsi", "kab", "batao", "dikhao", "kya", "meri", "mera",
    "hai", "kitna", "kitni", "bacha", "kal", "aaj", "konsa", "kaunsa", "hai kya",
    "dikhado", "kaisa", "kaisi", "h", "kya hai",
)

INTENTS = {
    "current_class": (
        "current class", "running class", "now class", "abhi konsi", "abhi kaunsi",
        "abhi ki class", "which class is", "what class is", "class going on",
        "is class going", "chalti class", "abhi kya chal raha",
        "abhi kya hai", "abhi class",
    ),
    "next_class": (
        "next class", "next lecture", "agli class", "agla lecture", "next period",
        "what is next", "whats next", "kya next", "next kya hai", "my next",
    ),
    "time_remaining": (
        "kitna time", "how much time", "kitni der", "time remaining", "time left",
        "how long", "bacha hai", "kitna bacha", "khatam kab", "end kab",
    ),
    "timetable_today": (
        "today's timetable", "today timetable", "aaj ka timetable", "aaj ki classes",
        "aaj ka schedule", "timetable for today", "today's schedule",
        "today's classes", "aaj kya hai",
    ),
    "timetable_tomorrow": (
        "tomorrow's timetable", "tomorrow timetable", "kal ka timetable",
        "kal ki classes", "kal ka schedule", "timetable for tomorrow",
        "tomorrow's classes", "kal kya hai",
    ),
    "timetable_full": (
        "complete timetable", "full timetable", "poora timetable", "pura timetable",
        "whole timetable", "weekly timetable", "week timetable", "complete week",
        "full week", "week bhar",
    ),
    "attendance_status": (
        "attendance status", "today's attendance", "today attendance",
        "aaj ki attendance", "aaj ka attendance", "attendance update",
        "attendance update kya", "attendance kya hai", "marked or not",
        "attendance marked", "lagi ki nahi", "attendance lagi", "hajiri",
    ),
    "attendance_percentage": (
        "attendance percentage", "attendance percent", "kitna percentage",
        "attendance %", "how much attendance", "attendance kitna",
    ),
    "low_attendance": (
        "low attendance", "kam attendance", "below", "short attendance",
        "attendance kam", "defaulter", "who has low",
    ),
    "attendance_week": (
        "attendance report for this week", "this week attendance", "week attendance",
        "weekly attendance", "attendance report", "hafta", "week ka attendance",
    ),
    "cancelled_check": (
        "cancel", "cancelled", "canceled", "radd", "koi class cancel",
        "class cancel hui", "cancel hui",
    ),
    "free_rooms": (
        "free right now", "which classes are free", "free rooms", "khali room",
        "khali class", "which room is free", "available rooms", "khali classroom",
        "free classroom", "rooms free", "room free", "free hain", "free hai",
        "kaunse room", "kaunsa room", "konsa room", "rooms khali", "khali rooms",
    ),
    "faculty_of_subject": (
        "who teaches", "which faculty teaches", "kis faculty ki", "kaun padhata",
        "kaun padhata hai", "kon faculty", "whose class", "faculty of",
        "kaunsa faculty", "teacher of", "kaun teacher",
    ),
    "compare_sections": (
        "compare", "dono section", "both sections", "a and b", "a aur b",
        "section a and section b", "difference between",
    ),
    "updates": (
        "department updates", "updates", "announcement", "announcements",
        "notice", "notices", "khabar", "latest updates", "departmental updates",
        "naya update",
    ),
    "digest": (
        "digest", "daily update", "academic update", "aaj ka update",
        "my day", "summary for today", "aaj ka haal",
    ),
    "tasks": (
        "my tasks", "pending tasks", "task", "tasks", "assignment", "duty",
        "pending duties", "assignments",
    ),
    "help": (
        "help", "what can you do", "options", "how to use", "madad", "kya kar sakte",
    ),
}

SECTION_PATTERNS = re.compile(
    r"(?:section|sec\.?|class)\s*[-_ ]*([ab])\b|(?:^|\s)([ab])\s*(?:section|ka|ki|ke)\b",
    re.IGNORECASE,
)

WEEKDAY_PATTERNS = {
    "MONDAY": ("monday", "mon", "somvar", "sOMvaar"),
    "TUESDAY": ("tuesday", "tue", "mangal"),
    "WEDNESDAY": ("wednesday", "wed", "budh"),
    "THURSDAY": ("thursday", "thu", "thurs", "guru"),
    "FRIDAY": ("friday", "fri", "shukra"),
}


def parse(message):
    """Return {"intent": ..., "section": 'A'|'B'|None, "weekday": ...|None,
    "subject": str|None, "hinglish": bool}."""
    text = (message or "").strip()
    lowered = text.lower()
    result = {
        "intent": None,
        "section": None,
        "weekday": None,
        "subject": None,
        "hinglish": any(marker in lowered for marker in HINGLISH_MARKERS),
    }

    # Section entity: "section a", "a section", "b ka", "sec-a"...
    match = SECTION_PATTERNS.search(lowered)
    if match:
        result["section"] = (match.group(1) or match.group(2) or "").upper()

    # Standalone "A"/"B" mention like "Show timetable for A".
    if result["section"] is None and re.search(r"\b([ab])\b", lowered):
        result["section"] = re.search(r"\b([ab])\b", lowered).group(1).upper()

    # Weekday entity.
    for weekday, keys in WEEKDAY_PATTERNS.items():
        if any(k in lowered for k in keys):
            result["weekday"] = weekday
            break

    if result["weekday"] and result["intent"] is None:
        result["intent"] = "timetable_weekday"

    # Subject entity — several phrasings, most specific first.
    lowered_work = lowered.rstrip("?").strip()
    m = re.search(
        r"([a-z][a-z0-9 \-]{2,40}?)\s+(?:ki|ka)\s+(?:class|lecture)\s+(?:kis|kaun|kon)\s+(?:faculty|teacher)",
        lowered_work,
    )
    if not m:
        m = re.search(
            r"(?:who\s+teaches|which\s+faculty\s+teaches|kaun\s+padhata|kaun\s+padhata\s+hai|kon\s+faculty|kaunsa\s+faculty)\s+(?:the\s+)?([a-z][a-z0-9 \-]{2,40}?)(?:\s+(?:class|lecture|kab|kaun|kis)|$)",
            lowered_work,
        )
    if not m:
        m = re.search(
            r"(?:class|lecture)\s+(?:of|kaunsa|konsa)\s+([a-z][a-z0-9 \-]{2,40}?)(?:\s+(?:kis|kaun|hai)|$)",
            lowered_work,
        )
    if m:
        candidate = m.group(1).strip()
        junk = {"next", "today", "tomorrow", "a", "b", "what", "which", "hai", "kya", "the"}
        if candidate and candidate not in junk:
            result["subject"] = candidate.title()

    # Intent detection — order matters (specific before generic).
    checks = [
        ("time_remaining", INTENTS["time_remaining"]),
        ("attendance_percentage", INTENTS["attendance_percentage"]),
        ("low_attendance", INTENTS["low_attendance"]),
        ("attendance_week", INTENTS["attendance_week"]),
        ("faculty_of_subject", INTENTS["faculty_of_subject"]),
        ("free_rooms", INTENTS["free_rooms"]),
        ("compare_sections", INTENTS["compare_sections"]),
        ("timetable_tomorrow", INTENTS["timetable_tomorrow"]),
        ("timetable_today", INTENTS["timetable_today"]),
        ("timetable_full", INTENTS["timetable_full"]),
        ("attendance_status", INTENTS["attendance_status"]),
        ("cancelled_check", INTENTS["cancelled_check"]),
        ("current_class", INTENTS["current_class"]),
        ("next_class", INTENTS["next_class"]),
        ("digest", INTENTS["digest"]),
        ("tasks", INTENTS["tasks"]),
        ("updates", INTENTS["updates"]),
        ("help", INTENTS["help"]),
    ]
    for intent, keys in checks:
        if any(key in lowered for key in keys):
            result["intent"] = intent
            break

    if result["intent"] is None and "attendance" in lowered:
        result["intent"] = "attendance_status"
    if result["intent"] is None and ("timetable" in lowered or "schedule" in lowered):
        result["intent"] = "timetable_today" if "today" in lowered or "aaj" in lowered else "timetable_full"
    if result["intent"] is None and ("class" in lowered or "lecture" in lowered):
        result["intent"] = "current_class"

    # "<section> ka schedule/timetable" without week keywords → today's plan
    # for that section (more natural than dumping the whole week).
    if result["intent"] == "timetable_full" and result["section"] and not any(
        k in lowered for k in ("complete", "full", "poora", "pura", "week", "whole")
    ):
        result["intent"] = "timetable_today"

    return result
