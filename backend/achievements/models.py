from django.conf import settings
from django.db import models


class FacultyAchievement(models.Model):
    class Category(models.TextChoices):
        RESEARCH = "RESEARCH", "Research"
        PUBLICATION = "PUBLICATION", "Publication"
        AWARD = "AWARD", "Award"
        CERTIFICATION = "CERTIFICATION", "Certification"
        WORKSHOP = "WORKSHOP", "Workshop"
        OTHER = "OTHER", "Other"

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.CASCADE,
        related_name="achievements",
    )
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=32, choices=Category.choices)
    description = models.TextField()
    date = models.DateField()
    issuing_organization = models.CharField(max_length=200)
    supporting_document = models.FileField(upload_to="achievements/%Y/%m/", blank=True, null=True)
    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_achievements",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.verification_status})"
