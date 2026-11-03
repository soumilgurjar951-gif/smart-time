"""
Notification helper utilities.

All notification creation goes through `notify()` so the business logic
in each app stays clean and notification delivery is centralized here.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from notifications.models import AuditLog, Notification

if TYPE_CHECKING:
    from accounts.models import User


def notify(
    *,
    recipient: "User",
    title: str,
    message: str,
    notification_type: str = Notification.NotificationType.INFO,
    related_object_type: str = "",
    related_object_id: int | None = None,
    department_class=None,
) -> Notification:
    """Create and return a Notification for *recipient*.

    Pass department_class on any class-specific notification so the record
    retains the class ID.
    """
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        related_object_type=related_object_type,
        related_object_id=related_object_id,
        department_class=department_class,
    )


def notify_all(*, recipients, title: str, message: str, **kwargs) -> list[Notification]:
    """Create a notification for every user in *recipients*."""
    return [notify(recipient=user, title=title, message=message, **kwargs) for user in recipients]


def audit(
    *,
    actor: "User | None",
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Record an immutable audit log entry."""
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata or {},
        ip_address=ip_address,
    )

