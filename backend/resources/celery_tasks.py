"""
Celery tasks for resource booking automations.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="resources.celery_tasks.notify_booking_request")
def notify_booking_request(booking_id: int) -> None:
    """
    Automation 10 — Triggered when a faculty creates a booking request.
    Notifies all HOD users.
    """
    from accounts.models import User
    from notifications.helpers import notify
    from notifications.models import Notification
    from resources.models import ResourceBooking

    try:
        booking = ResourceBooking.objects.select_related("resource", "requested_by").get(pk=booking_id)
    except ResourceBooking.DoesNotExist:
        return

    hods = User.objects.filter(role=User.Role.HOD, is_active=True)
    for hod in hods:
        notify(
            recipient=hod,
            title=f"Resource booking request: {booking.resource.name}",
            message=(
                f"{booking.requested_by.full_name} has requested to book "
                f"{booking.resource.name} ({booking.resource.type}).\n"
                f"Date: {booking.date}  Time: {booking.start_time}–{booking.end_time}\n"
                f"Purpose: {booking.purpose}"
            ),
            notification_type=Notification.NotificationType.BOOKING,
            related_object_type="ResourceBooking",
            related_object_id=booking_id,
        )


@shared_task(name="resources.celery_tasks.notify_booking_decision")
def notify_booking_decision(booking_id: int) -> None:
    """
    Triggered when HOD approves or rejects a booking request.
    Notifies the requesting faculty member.
    """
    from notifications.helpers import notify
    from notifications.models import Notification
    from resources.models import ResourceBooking

    try:
        booking = ResourceBooking.objects.select_related("resource", "requested_by", "reviewed_by").get(pk=booking_id)
    except ResourceBooking.DoesNotExist:
        return

    approved = booking.status == ResourceBooking.Status.APPROVED
    reviewer = booking.reviewed_by.full_name if booking.reviewed_by else "HOD"
    status_label = "approved ✓" if approved else "rejected ✗"

    notify(
        recipient=booking.requested_by,
        title=f"Booking {status_label}: {booking.resource.name}",
        message=(
            f"Your booking request for {booking.resource.name} on {booking.date} "
            f"({booking.start_time}–{booking.end_time}) has been {booking.status.lower()} by {reviewer}.\n"
            + (f"\nNotes: {booking.review_notes}" if booking.review_notes else "")
        ),
        notification_type=(
            Notification.NotificationType.SUCCESS if approved else Notification.NotificationType.WARNING
        ),
        related_object_type="ResourceBooking",
        related_object_id=booking_id,
    )

