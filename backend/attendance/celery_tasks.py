"""
Celery task for weekly attendance report.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="attendance.celery_tasks.generate_weekly_attendance_report")
def generate_weekly_attendance_report() -> None:
    """
    Automation 11 — Weekly Monday at 06:00.
    Sends the HOD a brief attendance summary for the past week.
    """
    from datetime import timedelta

    from django.db.models import Count, Q
    from django.utils import timezone

    from accounts.models import User
    from attendance.models import AttendanceRecord
    from notifications.helpers import notify
    from notifications.models import Notification

    today = timezone.localdate()
    week_start = today - timedelta(days=7)

    # Per-class summary: every notification retains its class ID so records
    # never mix between classes.
    qs = AttendanceRecord.objects.filter(lecture__date__range=(week_start, today))
    class_ids = list(
        qs.exclude(lecture__academic_class__isnull=True)
        .values_list("lecture__academic_class_id", flat=True)
        .distinct()
    )
    from classes.models import AcademicClass

    hods = User.objects.filter(role=User.Role.HOD, is_active=True)
    for class_id in class_ids:
        class_obj = AcademicClass.objects.filter(pk=class_id).first()
        cls_records = qs.filter(lecture__academic_class_id=class_id)
        totals = cls_records.aggregate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
        )
        total = totals["total"] or 1
        pct = round((totals["present"] / total) * 100, 1)
        by_subject = cls_records.values("lecture__subject__code").annotate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
        )
        subject_lines = [
            f"  {row['lecture__subject__code']}: {row['present']}/{row['total']} present"
            for row in by_subject
        ]
        message = (
            f"{class_obj.display_name if class_obj else class_id} — weekly attendance "
            f"{week_start} to {today}:\n"
            f"Overall: {totals['present']}/{totals['total']} present ({pct}%), "
            f"{totals['absent']} absent, {totals['on_leave']} on leave\n"
            + "\n".join(subject_lines)
        )
        for hod in hods:
            notify(
                recipient=hod,
                title=f"Weekly attendance report — {class_obj.display_name if class_obj else class_id} "
                f"({week_start} – {today})",
                message=message,
                notification_type=Notification.NotificationType.ATTENDANCE,
                department_class=class_id,
            )

    # Records without a resolvable class unit are reported as a fallback
    # summary (no class is attached, and records never merge into any
    # class-scoped report above).
    orphans = qs.filter(lecture__academic_class__isnull=True)
    orphan_totals = orphans.aggregate(
        total=Count("id"),
        present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
    )
    first_hod = hods.first()
    if first_hod:
        notify(
            recipient=first_hod,
            title=f"Weekly attendance report ({week_start} – {today})",
            message=(
                f"Records not linked to a class unit: "
                f"{orphan_totals['total']} (present {orphan_totals['present']})."
            ),
            notification_type=Notification.NotificationType.ATTENDANCE,
        )

