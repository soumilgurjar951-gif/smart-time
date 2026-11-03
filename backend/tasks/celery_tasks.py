"""
Celery tasks for task / update automations.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="tasks.celery_tasks.send_deadline_reminders")
def send_deadline_reminders() -> int:
    """
    Automation 3 — Daily at 08:00.
    Notify faculty for every task whose deadline is within 24 hours.
    """
    from datetime import timedelta

    from django.utils import timezone

    from notifications.helpers import notify
    from notifications.models import Notification
    from tasks.models import DepartmentTask

    tomorrow = timezone.localdate() + timedelta(days=1)
    due_soon = DepartmentTask.objects.filter(
        deadline=tomorrow,
        status__in=[DepartmentTask.Status.PENDING, DepartmentTask.Status.IN_PROGRESS],
    ).select_related("assigned_faculty__user")

    count = 0
    for task in due_soon:
        user = task.assigned_faculty.user
        notify(
            recipient=user,
            title=f"Task deadline tomorrow: {task.title}",
            message=(
                f'Your task "{task.title}" is due on {task.deadline}.\n'
                f"Current progress: {task.progress}%.\n"
                "Please submit your update before the deadline."
            ),
            notification_type=Notification.NotificationType.WARNING,
            related_object_type="DepartmentTask",
            related_object_id=task.id,
        )
        count += 1
    logger.info("Deadline reminders sent: %d", count)
    return count


@shared_task(name="tasks.celery_tasks.flag_overdue_tasks")
def flag_overdue_tasks() -> int:
    """
    Automation 4 — Daily at 09:00.
    Mark all past-deadline tasks as OVERDUE and notify the assigned faculty.
    """
    from django.utils import timezone

    from notifications.helpers import notify
    from notifications.models import Notification
    from tasks.models import DepartmentTask

    today = timezone.localdate()
    overdue_qs = DepartmentTask.objects.filter(
        deadline__lt=today,
        status__in=[DepartmentTask.Status.PENDING, DepartmentTask.Status.IN_PROGRESS],
    ).select_related("assigned_faculty__user")

    ids = list(overdue_qs.values_list("id", flat=True))
    DepartmentTask.objects.filter(pk__in=ids).update(status=DepartmentTask.Status.OVERDUE)

    count = 0
    for task in overdue_qs:
        notify(
            recipient=task.assigned_faculty.user,
            title=f"Task overdue: {task.title}",
            message=(
                f'Your task "{task.title}" was due on {task.deadline} and is now marked overdue.\n'
                "Contact your HOD if you need an extension."
            ),
            notification_type=Notification.NotificationType.WARNING,
            related_object_type="DepartmentTask",
            related_object_id=task.id,
        )
        count += 1
    logger.info("Flagged %d overdue tasks.", count)
    return count


@shared_task(name="tasks.celery_tasks.send_pending_task_summary_to_hod")
def send_pending_task_summary_to_hod() -> None:
    """
    Automation 5 — Daily at 08:15.
    Send the HOD a summary of all pending and overdue tasks.
    """
    from django.db.models import Q

    from accounts.models import User
    from notifications.helpers import notify
    from notifications.models import Notification
    from tasks.models import DepartmentTask

    pending = DepartmentTask.objects.filter(
        status__in=[DepartmentTask.Status.PENDING, DepartmentTask.Status.OVERDUE]
    ).select_related("assigned_faculty")

    if not pending.exists():
        return

    hods = User.objects.filter(role=User.Role.HOD, is_active=True)
    lines = [
        f"• [{t.priority}] {t.title} — {t.assigned_faculty.full_name} (due {t.deadline}, {t.status})"
        for t in pending[:25]
    ]
    message = f"Pending/overdue tasks ({pending.count()} total):\n" + "\n".join(lines)
    for hod in hods:
        notify(
            recipient=hod,
            title="Daily pending-task summary",
            message=message,
            notification_type=Notification.NotificationType.TASK,
        )


@shared_task(name="tasks.celery_tasks.notify_faculty_task_assigned")
def notify_faculty_task_assigned(task_id: int) -> None:
    """
    Automation 6 — Triggered when a task is created.
    Notifies the assigned faculty.
    """
    from notifications.helpers import notify
    from notifications.models import Notification
    from tasks.models import DepartmentTask

    try:
        task = DepartmentTask.objects.select_related("assigned_faculty__user", "assigned_by").get(pk=task_id)
    except DepartmentTask.DoesNotExist:
        return

    notify(
        recipient=task.assigned_faculty.user,
        title=f"New task assigned: {task.title}",
        message=(
            f'You have been assigned a new task by {task.assigned_by.full_name}.\n'
            f"Priority: {task.priority}  Deadline: {task.deadline}\n\n"
            f"{task.description}"
        ),
        notification_type=Notification.NotificationType.TASK,
        related_object_type="DepartmentTask",
        related_object_id=task_id,
    )


@shared_task(name="tasks.celery_tasks.notify_hod_task_update")
def notify_hod_task_update(update_id: int) -> None:
    """
    Automation 7 — Triggered when a faculty submits a task update.
    Notifies all HOD users.
    """
    from accounts.models import User
    from notifications.helpers import notify
    from notifications.models import Notification
    from tasks.models import TaskUpdate

    try:
        update = TaskUpdate.objects.select_related("task", "submitted_by").get(pk=update_id)
    except TaskUpdate.DoesNotExist:
        return

    hods = User.objects.filter(role=User.Role.HOD, is_active=True)
    for hod in hods:
        notify(
            recipient=hod,
            title=f"Task update: {update.task.title}",
            message=(
                f"{update.submitted_by.full_name} submitted an update for "
                f'"{update.task.title}".\n'
                f"Progress: {update.progress}%\n\n{update.notes}"
            ),
            notification_type=Notification.NotificationType.TASK,
            related_object_type="TaskUpdate",
            related_object_id=update_id,
        )

