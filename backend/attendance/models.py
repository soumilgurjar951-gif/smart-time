from django.conf import settings
from django.db import models

from odrms.constants import DEPARTMENT_CSIT, SECTION_CHOICES, SEMESTER_FIFTH


class AttendanceRoster(models.Model):
    """Identity for a person on a lecture roster.

    This is intentionally not a user account. A future student portal can map
    these roster rows to student users without changing attendance records.
    """

    roll_number = models.CharField(max_length=32)
    full_name = models.CharField(max_length=150)
    department = models.CharField(max_length=16, default=DEPARTMENT_CSIT)
    semester = models.PositiveSmallIntegerField(default=SEMESTER_FIFTH)
    section = models.CharField(max_length=1, choices=SECTION_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["section", "roll_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["roll_number", "semester", "section"],
                name="unique_roster_roll_semester_section",
            ),
            models.CheckConstraint(condition=models.Q(department=DEPARTMENT_CSIT), name="roster_csit_only"),
            models.CheckConstraint(condition=models.Q(semester=SEMESTER_FIFTH), name="roster_fifth_semester_only"),
        ]

    def __str__(self):
        return f"{self.roll_number} — {self.full_name}"


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        ON_LEAVE = "ON_LEAVE", "On Leave"

    lecture = models.ForeignKey("lectures.Lecture", on_delete=models.CASCADE, related_name="attendance_records")
    roster = models.ForeignKey(AttendanceRoster, on_delete=models.PROTECT, related_name="attendance_records")
    status = models.CharField(max_length=16, choices=Status.choices)
    remarks = models.CharField(max_length=255, blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="marked_attendance",
    )
    marked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["lecture_id", "roster_id"]
        constraints = [
            models.UniqueConstraint(fields=["lecture", "roster"], name="unique_attendance_per_lecture_roster"),
        ]

    def __str__(self):
        return f"{self.lecture_id}:{self.roster.roll_number}={self.status}"
