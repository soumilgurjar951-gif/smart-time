from django.core.exceptions import ValidationError
from django.db import models

from odrms.constants import DEPARTMENT_CSIT, SECTION_CHOICES, SEMESTER_FIFTH
from odrms.utils import duration_minutes, time_ranges_overlap


class Subject(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=150)
    department = models.CharField(max_length=16, default=DEPARTMENT_CSIT)
    semester = models.PositiveSmallIntegerField(default=SEMESTER_FIFTH)
    credits = models.PositiveSmallIntegerField(default=4)
    is_lab = models.BooleanField(default=False)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.CheckConstraint(condition=models.Q(department=DEPARTMENT_CSIT), name="subject_csit_only"),
            models.CheckConstraint(condition=models.Q(semester=SEMESTER_FIFTH), name="subject_fifth_semester_only"),
        ]

    def __str__(self):
        return f"{self.code} — {self.name}"


class Lecture(models.Model):
    class LectureType(models.TextChoices):
        THEORY = "THEORY", "Theory"
        LAB = "LAB", "Lab"
        TUTORIAL = "TUTORIAL", "Tutorial"

    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="lectures")
    assigned_faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.PROTECT,
        related_name="lectures",
    )
    department = models.CharField(max_length=16, default=DEPARTMENT_CSIT)
    semester = models.PositiveSmallIntegerField(default=SEMESTER_FIFTH)
    section = models.CharField(max_length=1, choices=SECTION_CHOICES)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    classroom = models.CharField(max_length=50)
    lecture_type = models.CharField(max_length=16, choices=LectureType.choices, default=LectureType.THEORY)
    topic = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.CheckConstraint(condition=models.Q(department=DEPARTMENT_CSIT), name="lecture_csit_only"),
            models.CheckConstraint(condition=models.Q(semester=SEMESTER_FIFTH), name="lecture_fifth_semester_only"),
            models.CheckConstraint(condition=models.Q(end_time__gt=models.F("start_time")), name="lecture_end_after_start"),
        ]
        indexes = [
            models.Index(fields=["date", "assigned_faculty"]),
            models.Index(fields=["section", "date"]),
        ]

    def __str__(self):
        return f"{self.subject.code} {self.section} {self.date} {self.start_time}"

    def clean(self):
        errors = {}
        if self.department != DEPARTMENT_CSIT:
            errors["department"] = "Only CSIT lectures are allowed."
        if self.semester != SEMESTER_FIFTH:
            errors["semester"] = "Only 5th semester lectures are allowed."
        if self.section not in {"A", "B"}:
            errors["section"] = "Section must be A or B."
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                errors["end_time"] = "End time must be after start time."
            else:
                minutes = duration_minutes(self.start_time, self.end_time)
                if minutes < 30:
                    errors["end_time"] = "Lecture duration must be at least 30 minutes."
                if minutes > 240:
                    errors["end_time"] = "Lecture duration cannot exceed 4 hours."
        if errors:
            raise ValidationError(errors)
        self._validate_faculty_overlap()

    def _validate_faculty_overlap(self):
        if not self.assigned_faculty_id or not self.date or not self.start_time or not self.end_time:
            return
        qs = Lecture.objects.filter(
            assigned_faculty_id=self.assigned_faculty_id,
            date=self.date,
        ).exclude(status=self.Status.CANCELLED)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        for other in qs:
            if time_ranges_overlap(self.start_time, self.end_time, other.start_time, other.end_time):
                raise ValidationError(
                    {
                        "assigned_faculty": (
                            f"Faculty already has a lecture overlapping {other.start_time}–{other.end_time} "
                            f"in {other.classroom}."
                        )
                    }
                )
