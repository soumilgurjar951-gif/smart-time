"""
Celery tasks for achievement automations.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="achievements.celery_tasks.notify_hod_achievement_submitted")
def notify_hod_achievement_submitted(achievement_id: int) -> None:
    """
    Automation 8 — Triggered when a faculty submits an achievement.
    Notifies all HOD users.
    """
    from accounts.models import User
    from achievements.models import FacultyAchievement
    from notifications.helpers import notify
    from notifications.models import Notification

    try:
        achievement = FacultyAchievement.objects.select_related("faculty").get(pk=achievement_id)
    except FacultyAchievement.DoesNotExist:
        return

    hods = User.objects.filter(role=User.Role.HOD, is_active=True)
    for hod in hods:
        notify(
            recipient=hod,
            title=f"Achievement submitted: {achievement.title}",
            message=(
                f"{achievement.faculty.full_name} submitted a new achievement for review.\n"
                f"Category: {achievement.category}\n"
                f"Title: {achievement.title}\n"
                f"Organisation: {achievement.issuing_organization}\n"
                f"Date: {achievement.date}"
            ),
            notification_type=Notification.NotificationType.ACHIEVEMENT,
            related_object_type="FacultyAchievement",
            related_object_id=achievement_id,
        )


@shared_task(name="achievements.celery_tasks.notify_faculty_achievement_reviewed")
def notify_faculty_achievement_reviewed(achievement_id: int) -> None:
    """
    Automation 9 — Triggered when HOD reviews an achievement.
    Notifies the faculty member of the decision.
    """
    from achievements.models import FacultyAchievement
    from notifications.helpers import notify
    from notifications.models import Notification

    try:
        achievement = FacultyAchievement.objects.select_related(
            "faculty__user", "reviewed_by"
        ).get(pk=achievement_id)
    except FacultyAchievement.DoesNotExist:
        return

    status = achievement.verification_status
    status_label = "approved ✓" if status == FacultyAchievement.VerificationStatus.APPROVED else "rejected ✗"
    reviewer = achievement.reviewed_by.full_name if achievement.reviewed_by else "HOD"

    notify(
        recipient=achievement.faculty.user,
        title=f'Achievement "{achievement.title}" {status_label}',
        message=(
            f'Your achievement "{achievement.title}" has been {status.lower()} by {reviewer}.\n'
            + (f"\nReview notes: {achievement.review_notes}" if achievement.review_notes else "")
        ),
        notification_type=(
            Notification.NotificationType.SUCCESS
            if status == FacultyAchievement.VerificationStatus.APPROVED
            else Notification.NotificationType.WARNING
        ),
        related_object_type="FacultyAchievement",
        related_object_id=achievement_id,
    )

