"""
Celery tasks for lecture-related automations.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="lectures.celery_tasks.send_daily_lecture_schedule")
def send_daily_lecture_schedule() -> int:
    """
    Automation 1 — Daily at 07:00.
    Send each faculty member a notification listing their lectures for today.
    Returns the number of notifications created.
    """
    from django.utils import timezone

    from accounts.models import User
    from lectures.models import Lecture
    from notifications.helpers import notify
    from notifications.models import Notification

    today = timezone.localdate()
    lectures_today = (
        Lecture.objects.filter(date=today)
        .exclude(status=Lecture.Status.CANCELLED)
        .select_related("subject", "assigned_faculty", "assigned_faculty__user")
        .order_by("start_time")
    )

    # Group by faculty
    by_faculty: dict[int, list[Lecture]] = {}
    for lec in lectures_today:
        faculty_user_id = lec.assigned_faculty.user_id
        by_faculty.setdefault(faculty_user_id, []).append(lec)

    count = 0
    for user_id, lecs in by_faculty.items():
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            continue
        lines = [
            f"• {lec.start_time.strftime('%H:%M')}–{lec.end_time.strftime('%H:%M')} "
            f"{lec.subject.code} | Section {lec.section} | {lec.classroom}"
            for lec in lecs
        ]
        notify(
            recipient=user,
            title=f"Your lectures for {today.strftime('%d %b %Y')}",
            message="\n".join(lines) or "No lectures scheduled today.",
            notification_type=Notification.NotificationType.LECTURE,
        )
        count += 1
    logger.info("Daily lecture schedule sent to %d faculty.", count)
    return count


@shared_task(name="lectures.celery_tasks.notify_faculty_lecture_assigned")
def notify_faculty_lecture_assigned(lecture_id: int) -> None:
    """
    Automation 2 — Triggered when a lecture is created or reassigned.
    Notifies the assigned faculty member.
    """
    from lectures.models import Lecture
    from notifications.helpers import notify, audit
    from notifications.models import Notification

    try:
        lec = Lecture.objects.select_related("subject", "assigned_faculty__user", "academic_class").get(pk=lecture_id)
    except Lecture.DoesNotExist:
        return

    faculty_user = lec.assigned_faculty.user
    notify(
        recipient=faculty_user,
        title="New lecture assigned",
        message=(
            f"You have been assigned a {lec.lecture_type.lower()} lecture:\n"
            f"Subject: {lec.subject.name} ({lec.subject.code})\n"
            f"Date: {lec.date}  Time: {lec.start_time}–{lec.end_time}\n"
            f"Classroom: {lec.classroom}  Section: {lec.section}"
        ),
        notification_type=Notification.NotificationType.LECTURE,
        related_object_type="Lecture",
        related_object_id=lecture_id,
        department_class=lec.academic_class,
    )

