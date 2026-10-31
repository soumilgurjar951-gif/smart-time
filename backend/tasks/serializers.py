from rest_framework import serializers

from tasks.models import DepartmentTask, TaskUpdate


class TaskUpdateSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(source="submitted_by.full_name", read_only=True)

    class Meta:
        model = TaskUpdate
        fields = ("id", "task", "submitted_by", "submitted_by_name", "progress", "notes", "created_at")
        read_only_fields = ("id", "task", "submitted_by", "created_at")

    def validate_progress(self, value):
        if value > 100:
            raise serializers.ValidationError("Progress cannot exceed 100.")
        return value


class DepartmentTaskSerializer(serializers.ModelSerializer):
    assigned_faculty_name = serializers.CharField(source="assigned_faculty.full_name", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.full_name", read_only=True)
    updates = TaskUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = DepartmentTask
        fields = (
            "id",
            "title",
            "description",
            "assigned_faculty",
            "assigned_faculty_name",
            "assigned_by",
            "assigned_by_name",
            "priority",
            "deadline",
            "status",
            "progress",
            "submission_notes",
            "update_requested_at",
            "reviewed_at",
            "created_at",
            "updated_at",
            "updates",
        )
        read_only_fields = (
            "id",
            "assigned_by",
            "update_requested_at",
            "reviewed_at",
            "created_at",
            "updated_at",
            "updates",
        )

    def validate_progress(self, value):
        if value > 100:
            raise serializers.ValidationError("Progress cannot exceed 100.")
        return value
