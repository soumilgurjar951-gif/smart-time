from rest_framework import serializers

from faculty.models import FacultyProfile
from lectures.models import AcademicYear, Subject

from .models import (
    AcademicClass,
    AccessGrant,
    AccessRequest,
    ClassFacultyAccess,
    ClassSubject,
    Department,
    FacultySubjectAssignment,
)


class DepartmentSerializer(serializers.ModelSerializer):
    class_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "code", "is_active", "class_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class AcademicClassSerializer(serializers.ModelSerializer):
    department_code = serializers.CharField(source="department.code", read_only=True)
    display_name = serializers.CharField(read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True, default=None)
    subject_count = serializers.IntegerField(read_only=True)
    faculty_count = serializers.SerializerMethodField()

    class Meta:
        model = AcademicClass
        fields = [
            "id",
            "department",
            "department_code",
            "year",
            "semester",
            "section",
            "academic_year",
            "academic_year_name",
            "is_active",
            "display_name",
            "subject_count",
            "faculty_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_faculty_count(self, obj):
        return obj.faculty_accesses.filter(is_active=True).count()

    def validate_section(self, value):
        return (value or "").upper()

    def validate(self, attrs):
        cls = AcademicClass(**attrs)
        # Run model-level validation for year/semester/section rules without
        # hitting the database (FKs are being resolved during serialization).
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            cls.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                getattr(exc, "message_dict", {"non_field_errors": exc.messages})
            ) from exc
        return attrs

    def get_unique_together_validators(self):
        # Rely on DB constraints + IntegrityError handling in the view.
        return []


class ClassSubjectSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_type = serializers.CharField(source="subject.subject_type", read_only=True)
    faculty = serializers.SerializerMethodField()

    class Meta:
        model = ClassSubject
        fields = [
            "id",
            "subject",
            "subject_code",
            "subject_name",
            "subject_type",
            "faculty",
            "is_active",
        ]
        read_only_fields = ["id"]

    def get_faculty(self, obj):
        rows = obj.faculty_assignments.filter(is_active=True).select_related("faculty")
        return [
            {
                "faculty_id": row.faculty_id,
                "full_name": row.faculty.full_name,
                "faculty_code": row.faculty.faculty_code,
            }
            for row in rows
        ]


class FacultySubjectAssignmentSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="class_subject.subject.code", read_only=True)
    subject_name = serializers.CharField(source="class_subject.subject.name", read_only=True)
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)

    class Meta:
        model = FacultySubjectAssignment
        fields = [
            "id",
            "faculty",
            "faculty_name",
            "class_subject",
            "subject_code",
            "subject_name",
            "is_active",
        ]
        read_only_fields = ["id"]


class FacultySummarySerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True, default=None)

    class Meta:
        model = FacultyProfile
        fields = ["id", "faculty_code", "full_name", "designation", "email", "user_id"]


class ClassFacultyAccessSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)
    faculty_code = serializers.CharField(source="faculty.faculty_code", read_only=True)
    granted_by_name = serializers.CharField(source="granted_by.full_name", read_only=True, default=None)

    class Meta:
        model = ClassFacultyAccess
        fields = [
            "id",
            "faculty",
            "faculty_name",
            "faculty_code",
            "permissions",
            "is_active",
            "granted_by",
            "granted_by_name",
            "granted_at",
            "revoked_at",
        ]
        read_only_fields = ["id", "granted_by", "granted_at", "revoked_at"]

    def validate_faculty(self, value):
        user = self.context["request"].user
        if not user.is_hod:
            raise serializers.ValidationError("Only the HOD can manage faculty access.")
        requester_profile = getattr(user, "faculty_profile", None)
        if requester_profile and requester_profile.id == value.id:
            raise serializers.ValidationError("Faculty cannot grant access to themselves.")
        return value

    def validate_permissions(self, value):
        if value in (None, "", []):
            return list(ClassFacultyAccess.DEFAULT_PERMISSIONS)
        if not isinstance(value, list):
            raise serializers.ValidationError("Permissions must be a list.")
        valid = set(ClassFacultyAccess.Permission.values)
        invalid = [item for item in value if item not in valid]
        if invalid:
            raise serializers.ValidationError(f"Unknown permissions: {invalid}.")
        return list(dict.fromkeys(value))  # de-duplicate, keep order


class ClassDashboardSerializer(serializers.Serializer):
    """Payload consumed by GET /api/classes/{id}/dashboard/."""

    class_id = serializers.IntegerField()
    display_name = serializers.CharField()
    is_active = serializers.BooleanField()
    totals = serializers.DictField()
    timetable_today = serializers.ListField()
    recent_attendance = serializers.DictField()


class ClassTimetableSerializer(serializers.Serializer):
    class_id = serializers.IntegerField()
    display_name = serializers.CharField()
    count = serializers.IntegerField()
    entries = serializers.ListField()
    conflicts = serializers.ListField()


class ClassAttendanceSerializer(serializers.Serializer):
    class_id = serializers.IntegerField()
    summary = serializers.DictField()
    sessions = serializers.ListField()


class ClassReportSerializer(serializers.Serializer):
    class_id = serializers.IntegerField()
    display_name = serializers.CharField()
    attendance = serializers.DictField(required=False)
    lectures = serializers.DictField(required=False)


class AccessRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessRequest
        fields = [
            "id",
            "requester",
            "department_class",
            "record_types",
            "reason",
            "status",
            "decided_by",
            "decided_at",
            "decision_note",
            "grant",
            "created_at",
            "updated_at",
        ]


class AccessGrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessGrant
        fields = [
            "id",
            "holder_user",
            "holder_faculty",
            "department_class",
            "access_type",
            "record_types",
            "granted_by",
            "is_active",
            "granted_at",
            "revoked_at",
            "expires_at",
        ]
