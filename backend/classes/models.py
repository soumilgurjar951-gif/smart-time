from django.core.exceptions import ValidationError
from django.db import models

from odrms.constants import YEAR_THIRD, SEMESTER_FIFTH

SECTION_PATTERN = r"^[A-Z]$"


class Department(models.Model):
    """A department such as CSIT. Additional departments can be added by the HOD."""

    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=16, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class AcademicClass(models.Model):
    """A class/section management unit, e.g. CSIT 3rd Year 5th Semester Section A.

    Every class operates independently. All class-specific records elsewhere in
    the system must trace back to one of these rows.
    """

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="classes",
    )
    year = models.PositiveSmallIntegerField(default=YEAR_THIRD)
    semester = models.PositiveSmallIntegerField(default=SEMESTER_FIFTH)
    section = models.CharField(max_length=1)
    academic_year = models.ForeignKey(
        "lectures.AcademicYear",
        on_delete=models.SET_NULL,
        related_name="classes",
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_classes",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["department__code", "year", "semester", "section"]
        verbose_name_plural = "classes"
        constraints = [
            models.UniqueConstraint(
                fields=["department", "year", "semester", "section", "academic_year"],
                name="unique_class_dept_year_semester_section_year",
            ),
            models.UniqueConstraint(
                fields=["department", "year", "semester", "section"],
                condition=models.Q(academic_year__isnull=True),
                name="unique_class_no_academic_year",
            ),
        ]
        indexes = [
            models.Index(fields=["department", "section"]),
        ]

    def clean(self):
        import re

        errors = {}
        if not re.match(SECTION_PATTERN, self.section or ""):
            errors["section"] = "Section must be a single uppercase letter, e.g. A or B."
        if self.year is not None and not 1 <= self.year <= 5:
            errors["year"] = "Year must be between 1 and 5."
        if self.semester is not None and not 1 <= self.semester <= 10:
            errors["semester"] = "Semester must be between 1 and 10."
        if self.academic_year_id and self.academic_year.year_number != self.year:
            errors["academic_year"] = "Academic year must match the class year."
        if errors:
            raise ValidationError(errors)

    @property
    def display_name(self):
        return f"{self.department.code} {self.year} Year Sem {self.semester} Section {self.section}"

    def __str__(self):
        return self.display_name


class ClassSubject(models.Model):
    """A subject offered to one specific class."""

    department_class = models.ForeignKey(
        AcademicClass,
        on_delete=models.CASCADE,
        related_name="subjects",
    )
    subject = models.ForeignKey(
        "lectures.Subject",
        on_delete=models.CASCADE,
        related_name="class_links",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["department_class__section", "subject__code"]
        constraints = [
            models.UniqueConstraint(
                fields=["department_class", "subject"],
                name="unique_subject_per_class",
            )
        ]

    def clean(self):
        errors = {}
        cls = self.department_class
        subject = self.subject
        if cls and subject:
            if subject.semester != cls.semester:
                errors["subject"] = "Subject semester must match the class semester."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.department_class.display_name} — {self.subject.code}"


class FacultySubjectAssignment(models.Model):
    """A faculty member teaching one subject of one specific class."""

    faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.CASCADE,
        related_name="class_subject_assignments",
    )
    class_subject = models.ForeignKey(
        ClassSubject,
        on_delete=models.CASCADE,
        related_name="faculty_assignments",
    )
    academic_year = models.ForeignKey(
        "lectures.AcademicYear",
        on_delete=models.CASCADE,
        related_name="class_faculty_assignments",
        null=True,
        blank=True,
    )
    assigned_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="class_subject_assignments_made",
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["class_subject__department_class__section", "class_subject__subject__code"]
        constraints = [
            models.UniqueConstraint(
                fields=["faculty", "class_subject", "academic_year"],
                name="unique_faculty_class_subject_year",
            )
        ]

    def clean(self):
        errors = {}
        if self.faculty_id and self.class_subject_id:
            subject = self.class_subject.subject
            if not self.faculty.assigned_subjects.filter(pk=subject.pk).exists():
                errors["faculty"] = "Faculty must have this subject in their assigned subjects first."
        if self.class_subject_id and self.academic_year_id and self.class_subject.department_class.academic_year_id:
            if self.class_subject.department_class.academic_year_id != self.academic_year_id:
                errors["academic_year"] = "Academic year must match the class academic year."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.faculty} — {self.class_subject}"


class ClassFacultyAccess(models.Model):
    """HOD-granted access for a faculty member to a specific class.

    Revocation (is_active=False) must take effect immediately, so all access
    checks must filter on is_active and never on cached copies.
    """

    class Permission(models.TextChoices):
        VIEW = "VIEW", "View records"
        MANAGE_TIMETABLE = "MANAGE_TIMETABLE", "Manage timetable"
        MARK_ATTENDANCE = "MARK_ATTENDANCE", "Mark attendance"
        MANAGE_RESOURCES = "MANAGE_RESOURCES", "Manage resources"
        MANAGE_TASKS = "MANAGE_TASKS", "Manage tasks"

    DEFAULT_PERMISSIONS = [Permission.VIEW]

    faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.CASCADE,
        related_name="class_accesses",
    )
    department_class = models.ForeignKey(
        AcademicClass,
        on_delete=models.CASCADE,
        related_name="faculty_accesses",
    )
    granted_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="granted_class_accesses",
        null=True,
        blank=True,
    )
    permissions = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["department_class__section", "faculty__full_name"]
        verbose_name = "class faculty access"
        verbose_name_plural = "class faculty accesses"
        constraints = [
            models.UniqueConstraint(
                fields=["faculty", "department_class"],
                name="unique_access_per_class_faculty",
            )
        ]

    def clean(self):
        errors = {}
        if self.faculty_id and self.department_class_id:
            if self.faculty.department != self.department_class.department.code:
                errors["faculty"] = "Faculty must belong to the same department as the class."
        if isinstance(self.permissions, list) and self.permissions:
            valid = set(self.Permission.values)
            invalid = [item for item in self.permissions if item not in valid]
            if invalid:
                errors["permissions"] = f"Unknown permissions: {invalid}."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.permissions:
            self.permissions = list(self.DEFAULT_PERMISSIONS)
        if self.is_active:
            self.revoked_at = None
        super().save(*args, **kwargs)

    def revoke(self):
        from django.utils import timezone

        self.is_active = False
        self.revoked_at = timezone.now()
        self.save(update_fields=["is_active", "revoked_at"])

    def __str__(self):
        state = "active" if self.is_active else "revoked"
        return f"{self.faculty} → {self.department_class} ({state})"


class ClassCoordinator(models.Model):
    """A faculty member designated as the coordinator of one class/section."""

    faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.CASCADE,
        related_name="class_coordinators",
    )
    department_class = models.ForeignKey(
        AcademicClass,
        on_delete=models.CASCADE,
        related_name="coordinators",
    )
    assigned_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="coordinator_assignments",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["department_class__section", "faculty__full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["department_class"],
                name="unique_class_coordinator_per_class",
            ),
        ]

    def clean(self):
        errors = {}
        if self.faculty_id and self.department_class_id:
            if self.faculty.department != self.department_class.department.code:
                errors["faculty"] = "Coordinator must belong to the same department as the class."
        if errors:
            raise DjangoValidationError(errors)

    def __str__(self):
        return f"{self.faculty} → {self.department_class} (coordinator)"


class AccessGrant(models.Model):
    """Time-boxed access granted to a user (HOD or faculty) on a class."""

    class AccessType(models.TextChoices):
        HOD = "HOD", "HOD"
        FACULTY = "FACULTY", "Faculty"

    holder_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="class_access_grants",
    )
    holder_faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.CASCADE,
        related_name="access_grants",
        null=True,
        blank=True,
    )
    department_class = models.ForeignKey(
        AcademicClass,
        on_delete=models.CASCADE,
        related_name="access_grants",
    )
    access_type = models.CharField(max_length=16, choices=AccessType.choices)
    record_types = models.JSONField(default=list)
    granted_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_access_grants",
    )
    is_active = models.BooleanField(default=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["department_class__section", "-granted_at"]

    def clean(self):
        errors = {}
        if self.department_class_id and self.holder_user_id and self.department_class.department.code:
            if self.holder_user.role != "HOD" and self.holder_faculty_id and self.holder_faculty.department != self.department_class.department.code:
                errors["holder_faculty"] = "Faculty must belong to the class department."
        if errors:
            raise DjangoValidationError(errors)

    def save(self, *args, **kwargs):
        if self.is_active:
            self.revoked_at = None
        super().save(*args, **kwargs)

    def revoke(self):
        from django.utils import timezone

        self.is_active = False
        self.revoked_at = timezone.now()
        self.save(update_fields=["is_active", "revoked_at"])

    def is_expired(self):
        from django.utils import timezone

        return bool(self.expires_at and self.expires_at < timezone.now())


class AccessRequest(models.Model):
    """Workflow request for time-boxed access to a class's records."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"
        REVOKED = "REVOKED", "Revoked"

    requester = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="access_requests",
    )
    department_class = models.ForeignKey(
        AcademicClass,
        on_delete=models.CASCADE,
        related_name="access_requests",
    )
    record_types = models.JSONField(default=list)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    decided_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decided_access_requests",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    grant = models.ForeignKey(
        "AccessGrant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_request",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["requester", "department_class", "status"],
                condition=models.Q(status="PENDING"),
                name="unique_pending_request_per_requester_class",
            ),
        ]

    def __str__(self):
        return f"{self.requester} → {self.department_class} ({self.status})"
