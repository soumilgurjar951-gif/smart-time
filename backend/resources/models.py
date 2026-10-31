from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from odrms.utils import duration_minutes, time_ranges_overlap


class Resource(models.Model):
    class ResourceType(models.TextChoices):
        CLASSROOM = "CLASSROOM", "Classroom"
        LAB = "LAB", "Laboratory"
        EQUIPMENT = "EQUIPMENT", "Equipment"
        HALL = "HALL", "Seminar Hall"
        OTHER = "OTHER", "Other"

    name = models.CharField(max_length=150, unique=True)
    type = models.CharField(max_length=16, choices=ResourceType.choices)
    location = models.CharField(max_length=150)
    capacity = models.PositiveIntegerField(default=1)
    is_available = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ResourceBooking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    resource = models.ForeignKey(Resource, on_delete=models.PROTECT, related_name="bookings")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="resource_bookings",
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    purpose = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_bookings",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-start_time"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="booking_end_after_start",
            )
        ]

    def __str__(self):
        return f"{self.resource.name} {self.date} {self.status}"

    def clean(self):
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({"end_time": "End time must be after start time."})
            if duration_minutes(self.start_time, self.end_time) < 15:
                raise ValidationError({"end_time": "Booking duration must be at least 15 minutes."})
        if self.status == self.Status.APPROVED:
            self._validate_overlap()

    def _validate_overlap(self):
        qs = ResourceBooking.objects.filter(
            resource_id=self.resource_id,
            date=self.date,
            status=self.Status.APPROVED,
        )
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        for other in qs:
            if time_ranges_overlap(self.start_time, self.end_time, other.start_time, other.end_time):
                raise ValidationError(
                    {
                        "resource": (
                            f"This resource is already booked from {other.start_time} to {other.end_time}."
                        )
                    }
                )
