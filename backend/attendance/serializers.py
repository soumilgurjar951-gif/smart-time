from django.db import IntegrityError
from rest_framework import serializers

from attendance.models import AttendanceRecord, AttendanceRoster
from odrms.constants import DEPARTMENT_CSIT, SEMESTER_FIFTH


class AttendanceRosterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRoster
        fields = (
            "id",
            "roll_number",
            "full_name",
            "department",
            "semester",
            "section",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        attrs["department"] = DEPARTMENT_CSIT
        attrs["semester"] = SEMESTER_FIFTH
        return attrs


class AttendanceRecordSerializer(serializers.ModelSerializer):
    roster_roll_number = serializers.CharField(source="roster.roll_number", read_only=True)
    roster_name = serializers.CharField(source="roster.full_name", read_only=True)
    lecture_date = serializers.DateField(source="lecture.date", read_only=True)
    subject = serializers.IntegerField(source="lecture.subject_id", read_only=True)
    subject_code = serializers.CharField(source="lecture.subject.code", read_only=True)
    subject_name = serializers.CharField(source="lecture.subject.name", read_only=True)
    section = serializers.CharField(source="lecture.section", read_only=True)
    faculty_name = serializers.CharField(source="lecture.assigned_faculty.full_name", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.full_name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "lecture",
            "roster",
            "roster_roll_number",
            "roster_name",
            "status",
            "remarks",
            "lecture_date",
            "subject",
            "subject_code",
            "subject_name",
            "section",
            "faculty_name",
            "marked_by",
            "marked_by_name",
            "marked_at",
            "updated_at",
        )
        read_only_fields = ("id", "marked_by", "marked_at", "updated_at")

    def validate(self, attrs):
        lecture = attrs.get("lecture") or getattr(self.instance, "lecture", None)
        roster = attrs.get("roster") or getattr(self.instance, "roster", None)
        if lecture and roster:
            if roster.section != lecture.section:
                raise serializers.ValidationError(
                    {"roster": "Roster section does not match the lecture section."}
                )
            if not roster.is_active:
                raise serializers.ValidationError({"roster": "This roster entry is inactive."})
        return attrs

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"detail": "Attendance already recorded for this roster and lecture."}
            ) from exc


class BulkAttendanceSerializer(serializers.Serializer):
    lecture = serializers.IntegerField()
    entries = serializers.ListSerializer(child=serializers.DictField())

    def validate(self, attrs):
        from lectures.models import Lecture

        try:
            lecture = Lecture.objects.select_related("assigned_faculty").get(pk=attrs["lecture"])
        except Lecture.DoesNotExist as exc:
            raise serializers.ValidationError({"lecture": "Lecture not found."}) from exc
        attrs["lecture_obj"] = lecture
        for entry in attrs["entries"]:
            if "roster" not in entry or "status" not in entry:
                raise serializers.ValidationError(
                    {"entries": "Each entry requires roster and status."}
                )
            if entry["status"] not in AttendanceRecord.Status.values:
                raise serializers.ValidationError({"entries": "Invalid attendance status."})
            if entry.get("lecture"):
                try:
                    nested_lecture_id = int(getattr(entry["lecture"], "id", entry["lecture"]))
                except (TypeError, ValueError) as exc:
                    raise serializers.ValidationError({"entries": "Invalid lecture reference."}) from exc
                if nested_lecture_id != lecture.id:
                    raise serializers.ValidationError({"entries": "All entries must belong to the same lecture."})
            try:
                entry["roster"] = AttendanceRoster.objects.get(pk=entry["roster"])
            except AttendanceRoster.DoesNotExist as exc:
                raise serializers.ValidationError({"entries": "Roster entry not found."}) from exc
            if entry["roster"].section != lecture.section or not entry["roster"].is_active:
                raise serializers.ValidationError({"entries": "Roster section must match the lecture and be active."})
        return attrs
