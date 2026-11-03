"""Celery tasks for class-level access lifecycle."""

from celery import shared_task
from django.utils import timezone

from classes.models import AccessGrant
from notifications.email_service import send_access_expiration_email
from notifications.helpers import audit, notify
from notifications.models import Notification


@shared_task
def expire_class_access_grants():
    """Revoke (and notify) access grants whose expiry time has passed."""
    now = timezone.now()
    grants = (
        AccessGrant.objects.filter(is_active=True, expires_at__isnull=False, expires_at__lt=now)
        .select_related("holder_user", "department_class")
    )
    expired_count = 0
    for grant in grants:
        grant.is_active = False
        grant.revoked_at = now
        grant.save(update_fields=["is_active", "revoked_at"])
        audit(
            actor=None,
            action="class_access_expired",
            entity_type="AccessGrant",
            entity_id=grant.pk,
            metadata={"class": grant.department_class_id, "holder": grant.holder_user_id},
        )
        if grant.holder_user.is_active:
            notify(
                recipient=grant.holder_user,
                title="Access expired",
                message=f"Your access to {grant.department_class.display_name} has expired.",
                notification_type=Notification.NotificationType.WARNING,
                department_class=grant.department_class,
            )
        send_access_expiration_email(
            recipient_email=grant.holder_user.email,
            department_class_label=grant.department_class.display_name,
        )
        expired_count += 1
    return {"expired_count": expired_count}
