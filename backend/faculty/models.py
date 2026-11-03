from django.conf import settings
from django.db import models

from odrms.constants import ALLOWED_SECTIONS, DEPARTMENT_CSIT, SECTION_CHOICES


class FacultyProfile(models.Model):
    class AccountStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        SUSPENDED = "SUSPENDED", "Suspended"

    class ProfileStatus(models.TextChoices):
        INCOMPLETE = "INCOMPLETE", "Incomplete"
        SUBMITTED = "SUBMITTED", "Submitted"
        VERIFIED = "VERIFIED", "Verified"
        CHANGES_REQUESTED = "CHANGES_REQUESTED", "Changes Requested"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="faculty_profile",
        null=True,
        blank=True,
    )
    faculty_code = models.CharField(max_length=16, unique=True, null=True, blank=True)
    employee_id = models.CharField(max_length=32, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=16, default=DEPARTMENT_CSIT)
    assigned_subjects = models.ManyToManyField(
        "lectures.Subject",
        blank=True,
        related_name="assigned_faculty_members",
    )
    assigned_sections = models.JSONField(default=list)
    account_status = models.CharField(
        max_length=16,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
    )
    profile_status = models.CharField(
        max_length=20,
        choices=ProfileStatus.choices,
        default=ProfileStatus.INCOMPLETE,
    )
    qualifications = models.CharField(max_length=255, blank=True)
    specialization = models.CharField(max_length=255, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(department=DEPARTMENT_CSIT),
                name="faculty_department_csit_only",
            )
        ]

    def __str__(self):
        return self.full_name or self.faculty_code or self.employee_id or f"Faculty {self.pk}"

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.department != DEPARTMENT_CSIT:
            raise ValidationError({"department": "Only the CSIT department is supported."})
        sections = self.assigned_sections or []
        if not isinstance(sections, list):
            raise ValidationError({"assigned_sections": "Assigned sections must be a list."})
        invalid = [item for item in sections if item not in ALLOWED_SECTIONS]
        if invalid:
            raise ValidationError({"assigned_sections": f"Invalid sections: {invalid}. Use A and/or B."})
