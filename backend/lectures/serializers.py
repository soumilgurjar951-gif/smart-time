from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from lectures.models import Lecture, Subject
from odrms.constants import DEPARTMENT_CSIT, SEMESTER_FIFTH
from odrms.utils import duration_minutes


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ("id", "code", "name", "department", "semester", "credits", "is_lab")

    def validate(self, attrs):
        attrs["department"] = DEPARTMENT_CSIT
        attrs["semester"] = SEMESTER_FIFTH
        return attrs


class LectureSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    faculty_name = serializers.CharField(source="assigned_faculty.full_name", read_only=True)
    faculty_employee_id = serializers.CharField(source="assigned_faculty.employee_id", read_only=True)
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Lecture
        fields = (
            "id",
            "subject",
            "subject_code",
            "subject_name",
            "assigned_faculty",
            "faculty_name",
            "faculty_employee_id",
            "department",
            "semester",
            "section",
            "date",
            "start_time",
            "end_time",
            "duration_minutes",
            "classroom",
            "lecture_type",
            "topic",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_duration_minutes(self, obj):
        return duration_minutes(obj.start_time, obj.end_time)

    def validate(self, attrs):
        attrs["department"] = DEPARTMENT_CSIT
        attrs["semester"] = SEMESTER_FIFTH
        current = self.instance
        lecture = Lecture(
            subject=attrs.get("subject") or (current.subject if current else None),
            assigned_faculty=attrs.get("assigned_faculty") or (current.assigned_faculty if current else None),
            department=DEPARTMENT_CSIT,
            semester=SEMESTER_FIFTH,
            section=attrs.get("section") or (current.section if current else None),
            date=attrs.get("date") or (current.date if current else None),
            start_time=attrs.get("start_time") or (current.start_time if current else None),
            end_time=attrs.get("end_time") or (current.end_time if current else None),
            classroom=attrs.get("classroom") or (current.classroom if current else ""),
            lecture_type=attrs.get("lecture_type")
            or (current.lecture_type if current else Lecture.LectureType.THEORY),
            status=attrs.get("status") or (current.status if current else Lecture.Status.SCHEDULED),
        )
        lecture.pk = current.pk if current else None
        try:
            lecture.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(getattr(exc, "message_dict", {"detail": exc.messages})) from exc
        faculty = lecture.assigned_faculty
        section = lecture.section
        if faculty and section and faculty.assigned_sections and section not in faculty.assigned_sections:
            raise serializers.ValidationError({"section": f"Faculty is not assigned to section {section}."})
        return attrs
