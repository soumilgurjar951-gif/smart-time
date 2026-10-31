from pathlib import Path

from django.conf import settings
from rest_framework import serializers

from achievements.models import FacultyAchievement


class FacultyAchievementSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True, default=None)

    class Meta:
        model = FacultyAchievement
        fields = (
            "id",
            "faculty",
            "faculty_name",
            "title",
            "category",
            "description",
            "date",
            "issuing_organization",
            "supporting_document",
            "verification_status",
            "review_notes",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "verification_status",
            "review_notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {"faculty": {"required": False}}

    def validate_supporting_document(self, value):
        if not value:
            return value
        suffix = Path(value.name).suffix.lower()
        if suffix not in settings.ALLOWED_ACHIEVEMENT_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed: {', '.join(sorted(settings.ALLOWED_ACHIEVEMENT_EXTENSIONS))}"
            )
        if value.size > settings.MAX_UPLOAD_SIZE:
            raise serializers.ValidationError("File size cannot exceed 5 MB.")
        return value


class AchievementReviewSerializer(serializers.Serializer):
    verification_status = serializers.ChoiceField(
        choices=[
            FacultyAchievement.VerificationStatus.APPROVED,
            FacultyAchievement.VerificationStatus.REJECTED,
        ]
    )
    review_notes = serializers.CharField(required=False, allow_blank=True)
