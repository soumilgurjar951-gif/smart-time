from django.conf import settings
from django.db import models


class Notification(models.Model):
    """In-app notification for a recipient user."""

    class NotificationType(models.TextChoices):
        INFO = "INFO", "Info"
        SUCCESS = "SUCCESS", "Success"
        WARNING = "WARNING", "Warning"
        TASK = "TASK", "Task"
        ACHIEVEMENT = "ACHIEVEMENT", "Achievement"
        BOOKING = "BOOKING", "Booking"
        LECTURE = "LECTURE", "Lecture"
        ATTENDANCE = "ATTENDANCE", "Attendance"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=16,
        choices=NotificationType.choices,
        default=NotificationType.INFO,
    )
    # Generic relation to any object (optional)
    related_object_type = models.CharField(max_length=64, blank=True)
    related_object_id = models.PositiveBigIntegerField(null=True, blank=True)
    # Class the notification belongs to. Class-specific notifications always
    # retain this ID so automated jobs never mix records between classes.
    department_class = models.ForeignKey(
        "classes.AcademicClass",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient_id}"


class AuditLog(models.Model):
    """Immutable record of important system events."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=64)
    entity_id = models.PositiveBigIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["actor", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.action} on {self.entity_type}:{self.entity_id} by {self.actor_id}"

