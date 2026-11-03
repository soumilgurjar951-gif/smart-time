from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from odrms.constants import (
    ALLOWED_SECTIONS,
    DEPARTMENT_CSIT,
    SECTION_CHOICES,
    SEMESTER_FIFTH,
    YEAR_THIRD,
)
from odrms.utils import duration_minutes, time_ranges_overlap


class Subject(models.Model):
    class SubjectType(models.TextChoices):
        THEORY = "THEORY", "Theory"
        PRACTICAL = "PRACTICAL", "Practical"
        LAB = "LAB", "Lab"
        PROJECT = "PROJECT", "Project"
        ACTIVITY = "ACTIVITY", "Activity"
        UNSPECIFIED = "UNSPECIFIED", "Unspecified"

    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=150)
    department = models.CharField(max_length=16, default=DEPARTMENT_CSIT)
    semester = models.PositiveSmallIntegerField(default=SEMESTER_FIFTH)
    credits = models.PositiveSmallIntegerField(null=True, blank=True)
    is_lab = models.BooleanField(default=False)
    subject_type = models.CharField(
        max_length=16,
        choices=SubjectType.choices,
        default=SubjectType.UNSPECIFIED,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.CheckConstraint(condition=models.Q(department=DEPARTMENT_CSIT), name="subject_csit_only"),
            models.CheckConstraint(condition=models.Q(semester=SEMESTER_FIFTH), name="subject_fifth_semester_only"),
        ]

    def __str__(self):
        return f"{self.code} — {self.name}"


class AcademicYear(models.Model):
    name = models.CharField(max_length=100, unique=True)
    year_number = models.PositiveSmallIntegerField(default=YEAR_THIRD)
    semester = models.PositiveSmallIntegerField(default=SEMESTER_FIFTH)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(condition=models.Q(year_number=YEAR_THIRD), name="academic_year_third_year_only"),
            models.CheckConstraint(
                condition=models.Q(semester=SEMESTER_FIFTH),
                name="academic_year_fifth_semester_only",
            ),
        ]

    def __str__(self):
        return self.name


class Section(models.Model):
    code = models.CharField(max_length=1, choices=SECTION_CHOICES, unique=True)
    department = models.CharField(max_length=16, default=DEPARTMENT_CSIT)
    semester = models.PositiveSmallIntegerField(default=SEMESTER_FIFTH)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.CheckConstraint(condition=models.Q(department=DEPARTMENT_CSIT), name="section_csit_only"),
            models.CheckConstraint(condition=models.Q(semester=SEMESTER_FIFTH), name="section_fifth_semester_only"),
        ]

    def __str__(self):
        return f"Section {self.code}"


class FacultySubject(models.Model):
    faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.CASCADE,
        related_name="subject_assignments",
    )
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="faculty_assignments")
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="faculty_subject_assignments",
        null=True,
        blank=True,
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="faculty_subject_assignments",
        null=True,
        blank=True,
    )
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ["subject__code", "faculty__faculty_code"]
        indexes = [
            models.Index(fields=["subject", "section", "academic_year"]),
            models.Index(fields=["faculty", "academic_year"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["faculty", "subject", "section", "academic_year"],
                name="unique_faculty_subject_section_year",
            )
        ]

    def clean(self):
        errors = {}
        if self.faculty_id and self.faculty.department != DEPARTMENT_CSIT:
            errors["faculty"] = "Only CSIT faculty can be assigned."
        if self.subject_id and (
            self.subject.department != DEPARTMENT_CSIT or self.subject.semester != SEMESTER_FIFTH
        ):
            errors["subject"] = "Only CSIT 5th semester subjects can be assigned."
        if self.section_id and (
            self.section.department != DEPARTMENT_CSIT or self.section.semester != SEMESTER_FIFTH
        ):
            errors["section"] = "Only CSIT 5th semester sections can be assigned."
        if self.academic_year_id and (
            self.academic_year.year_number != YEAR_THIRD
            or self.academic_year.semester != SEMESTER_FIFTH
        ):
            errors["academic_year"] = "Only 3rd year / 5th semester assignments are supported."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        section = f" {self.section.code}" if self.section_id else ""
        return f"{self.faculty} — {self.subject}{section}"


class TimeSlot(models.Model):
    period_number = models.PositiveSmallIntegerField(unique=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False)

    class Meta:
        ordering = ["period_number"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="time_slot_end_after_start",
            )
        ]

    def clean(self):
        errors = {}
        if self.period_number is not None:
            if self.is_break and self.period_number != 0:
                errors["period_number"] = "The break must use period number 0."
            elif not self.is_break and not 1 <= self.period_number <= 8:
                errors["period_number"] = "Lecture periods must be numbered 1 through 8."
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            errors["end_time"] = "End time must be after start time."
        if not errors and self.start_time and self.end_time:
            overlapping = TimeSlot.objects.filter(
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            if overlapping.exists():
                errors["start_time"] = "Time slots cannot overlap."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        label = "Lunch break" if self.is_break else f"Period {self.period_number}"
        return f"{label} ({self.start_time:%H:%M}–{self.end_time:%H:%M})"


class TimetableEntry(models.Model):
    class Weekday(models.TextChoices):
        MONDAY = "MONDAY", "Monday"
        TUESDAY = "TUESDAY", "Tuesday"
        WEDNESDAY = "WEDNESDAY", "Wednesday"
        THURSDAY = "THURSDAY", "Thursday"
        FRIDAY = "FRIDAY", "Friday"

    class LectureType(models.TextChoices):
        THEORY = "THEORY", "Theory"
        PRACTICAL = "PRACTICAL", "Practical"
        LAB = "LAB", "Lab"
        PROJECT = "PROJECT", "Project"
        ACTIVITY = "ACTIVITY", "Activity"

    weekday = models.CharField(max_length=9, choices=Weekday.choices)
    section = models.ForeignKey(Section, on_delete=models.PROTECT, related_name="timetable_entries")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="timetable_entries")
    faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.PROTECT,
        related_name="timetable_entries",
    )
    time_slot = models.ForeignKey(TimeSlot, on_delete=models.PROTECT, related_name="timetable_entries")
    classroom = models.CharField(max_length=50)
    lecture_type = models.CharField(max_length=16, choices=LectureType.choices)
    topic = models.CharField(max_length=255, blank=True)
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.PROTECT,
        related_name="timetable_entries",
        null=True,
        blank=True,
    )
    # Every timetable row belongs to exactly one class/section unit. Resolved
    # automatically on save; protected so class rows cannot be hard-deleted
    # while records still reference them.
    academic_class = models.ForeignKey(
        "classes.AcademicClass",
        on_delete=models.PROTECT,
        related_name="timetable_entries",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["weekday", "time_slot__period_number", "section__code"]
        indexes = [
            models.Index(fields=["weekday", "section"]),
            models.Index(fields=["weekday", "faculty"]),
            models.Index(fields=["weekday", "classroom"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["weekday", "section", "time_slot"],
                name="unique_section_weekday_slot",
            )
        ]

    def clean(self):
        errors = {}
        if self.weekday and self.weekday not in self.Weekday.values:
            errors["weekday"] = "Timetable entries must be Monday through Friday."
        if self.section_id and (
            self.section.department != DEPARTMENT_CSIT
            or self.section.semester != SEMESTER_FIFTH
            or self.section.code not in ALLOWED_SECTIONS
        ):
            errors["section"] = "Only CSIT 5th semester Sections A and B are supported."
        if self.subject_id and (
            self.subject.department != DEPARTMENT_CSIT or self.subject.semester != SEMESTER_FIFTH
        ):
            errors["subject"] = "Only CSIT 5th semester subjects are supported."
        if self.subject_id and not self.subject.is_active:
            errors["subject"] = "Inactive subjects cannot be scheduled."
        if self.academic_year_id and (
            self.academic_year.year_number != YEAR_THIRD
            or self.academic_year.semester != SEMESTER_FIFTH
        ):
            errors["academic_year"] = "Only 3rd year / 5th semester is supported."
        if self.time_slot_id and self.time_slot.is_break:
            errors["time_slot"] = "A break cannot be assigned as a lecture period."
        if self.faculty_id and self.faculty.department != DEPARTMENT_CSIT:
            errors["faculty"] = "Only CSIT faculty can be assigned."

        if self.faculty_id and self.subject_id and self.section_id and not errors:
            assignments = FacultySubject.objects.filter(
                faculty_id=self.faculty_id,
                subject_id=self.subject_id,
                is_verified=True,
            ).filter(Q(section_id=self.section_id) | Q(section__isnull=True))
            if self.academic_year_id:
                assignments = assignments.filter(
                    Q(academic_year_id=self.academic_year_id) | Q(academic_year__isnull=True)
                )
            else:
                assignments = assignments.filter(academic_year__isnull=True)
            if not assignments.exists():
                errors["faculty"] = "Faculty must have a verified assignment for this subject and section."

        if self.weekday and self.section_id and self.faculty_id and self.time_slot_id and not errors:
            entries = TimetableEntry.objects.filter(weekday=self.weekday).select_related(
                "time_slot", "section", "faculty"
            )
            if self.pk:
                entries = entries.exclude(pk=self.pk)
            for other in entries:
                if not time_ranges_overlap(
                    self.time_slot.start_time,
                    self.time_slot.end_time,
                    other.time_slot.start_time,
                    other.time_slot.end_time,
                ):
                    continue
                if other.faculty_id == self.faculty_id:
                    errors["faculty"] = "Faculty already has a lecture at this time."
                if other.classroom.casefold() == self.classroom.casefold():
                    errors["classroom"] = "This classroom or laboratory is already booked at this time."
                if other.section_id == self.section_id:
                    errors["time_slot"] = "This section already has a lecture at this time."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.weekday} {self.section.code} {self.subject.code} P{self.time_slot.period_number}"

    def save(self, *args, **kwargs):
        if self.academic_class_id is None and self.section_id:
            self.academic_class = resolve_academic_class(
                department_code=self.section.department,
                semester=self.section.semester,
                section_code=self.section.code,
                academic_year_id=self.academic_year_id,
            )
        super().save(*args, **kwargs)


def resolve_academic_class(department_code, semester, section_code, academic_year_id=None):
    """Find the AcademicClass unit matching a section (class = dept+year+sem+section).

    Prefers an exact academic-year match, then the currently active year.
    Returns None when no class unit exists yet; callers must not copy records
    between classes to compensate.
    """
    from classes.models import AcademicClass

    qs = AcademicClass.objects.filter(
        department__code=department_code,
        semester=semester,
        section=section_code,
        is_active=True,
    )
    if academic_year_id:
        exact = qs.filter(academic_year_id=academic_year_id).first()
        if exact:
            return exact
    year_matched = qs.exclude(academic_year__isnull=True).order_by("-id").first()
    if year_matched:
        return year_matched
    return qs.filter(academic_year__isnull=True).order_by("-id").first()


class TimetableHistory(models.Model):
    class Action(models.TextChoices):
        CREATED = "CREATED", "Created"
        UPDATED = "UPDATED", "Updated"
        DELETED = "DELETED", "Deleted"

    entry_id = models.PositiveBigIntegerField(db_index=True)
    action = models.CharField(max_length=8, choices=Action.choices)
    snapshot = models.JSONField()
    changed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="timetable_changes",
        null=True,
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.action} timetable entry {self.entry_id}"


class Lecture(models.Model):
    class LectureType(models.TextChoices):
        THEORY = "THEORY", "Theory"
        PRACTICAL = "PRACTICAL", "Practical"
        LAB = "LAB", "Lab"
        PROJECT = "PROJECT", "Project"
        ACTIVITY = "ACTIVITY", "Activity"
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
    timetable_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.SET_NULL,
        related_name="occurrences",
        null=True,
        blank=True,
    )
    # The class/section unit this lecture belongs to. Resolved automatically
    # on save so every occurrence is class-scoped in the database.
    academic_class = models.ForeignKey(
        "classes.AcademicClass",
        on_delete=models.PROTECT,
        related_name="lectures",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.CheckConstraint(condition=models.Q(department=DEPARTMENT_CSIT), name="lecture_csit_only"),
            models.CheckConstraint(condition=models.Q(semester=SEMESTER_FIFTH), name="lecture_fifth_semester_only"),
            models.CheckConstraint(condition=models.Q(end_time__gt=models.F("start_time")), name="lecture_end_after_start"),
            models.UniqueConstraint(
                fields=["timetable_entry", "date"],
                name="unique_timetable_occurrence_date",
            ),
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
        if self.section not in ALLOWED_SECTIONS:
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


    def save(self, *args, **kwargs):
        if self.academic_class_id is None:
            if self.timetable_entry_id and self.timetable_entry.academic_class_id:
                self.academic_class = self.timetable_entry.academic_class
            elif self.section:
                self.academic_class = resolve_academic_class(
                    department_code=self.department,
                    semester=self.semester,
                    section_code=self.section,
                )
        super().save(*args, **kwargs)

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
