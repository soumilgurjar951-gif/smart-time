from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from lectures.models import (
    AcademicYear,
    FacultySubject,
    Lecture,
    Section,
    Subject,
    TimeSlot,
    TimetableEntry,
    TimetableHistory,
)
from odrms.constants import DEPARTMENT_CSIT, SEMESTER_FIFTH, YEAR_THIRD
from odrms.utils import duration_minutes


class SubjectSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="code", read_only=True)
    subject_name = serializers.CharField(source="name", read_only=True)

    class Meta:
        model = Subject
        fields = (
            "id",
            "code",
            "name",
            "subject_code",
            "subject_name",
            "department",
            "semester",
            "credits",
            "is_lab",
            "subject_type",
            "is_active",
        )

    def validate(self, attrs):
        department = attrs.get("department", getattr(self.instance, "department", DEPARTMENT_CSIT))
        semester = attrs.get("semester", getattr(self.instance, "semester", SEMESTER_FIFTH))
        errors = {}
        if department != DEPARTMENT_CSIT:
            errors["department"] = "Only CSIT subjects are supported."
        if semester != SEMESTER_FIFTH:
            errors["semester"] = "Only 5th semester subjects are supported."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ("id", "name", "year_number", "semester", "is_active")
        read_only_fields = ("id",)

    def validate(self, attrs):
        year_number = attrs.get("year_number", getattr(self.instance, "year_number", YEAR_THIRD))
        semester = attrs.get("semester", getattr(self.instance, "semester", SEMESTER_FIFTH))
        if year_number != YEAR_THIRD or semester != SEMESTER_FIFTH:
            raise serializers.ValidationError("Only 3rd year / 5th semester is supported.")
        return attrs


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ("id", "code", "department", "semester")
        read_only_fields = fields


class FacultySubjectSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)
    faculty_code = serializers.CharField(source="faculty.faculty_code", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    section_code = serializers.CharField(source="section.code", read_only=True)

    class Meta:
        model = FacultySubject
        fields = (
            "id",
            "faculty",
            "faculty_name",
            "faculty_code",
            "subject",
            "subject_code",
            "subject_name",
            "section",
            "section_code",
            "academic_year",
            "is_verified",
        )
        read_only_fields = ("id", "faculty_name", "faculty_code", "subject_code", "subject_name", "section_code")

    def validate(self, attrs):
        faculty = attrs.get("faculty", getattr(self.instance, "faculty", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        section = attrs.get("section", getattr(self.instance, "section", None))
        academic_year = attrs.get("academic_year", getattr(self.instance, "academic_year", None))
        is_verified = attrs.get("is_verified", getattr(self.instance, "is_verified", False))
        if is_verified and faculty and not (
            faculty.user_id
            and faculty.account_status == faculty.AccountStatus.ACTIVE
            and faculty.full_name
            and faculty.employee_id
            and faculty.email
            and faculty.designation
        ):
            raise serializers.ValidationError(
                {"is_verified": "Complete and activate the faculty profile before verifying this assignment."}
            )
        if self.instance:
            scope_changed = (
                self.instance.faculty_id != getattr(faculty, "id", None)
                or self.instance.subject_id != getattr(subject, "id", None)
                or self.instance.section_id != getattr(section, "id", None)
                or self.instance.academic_year_id != getattr(academic_year, "id", None)
            )
            removing_verification = self.instance.is_verified and not is_verified
            if scope_changed or removing_verification:
                entries = TimetableEntry.objects.filter(
                    faculty_id=self.instance.faculty_id,
                    subject_id=self.instance.subject_id,
                )
                if self.instance.section_id:
                    entries = entries.filter(section_id=self.instance.section_id)
                if self.instance.academic_year_id:
                    entries = entries.filter(academic_year_id=self.instance.academic_year_id)
                if entries.exists():
                    raise serializers.ValidationError(
                        {"subject": "Remove or reassign timetable entries before changing this allocation."}
                    )
        return attrs


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = ("id", "period_number", "start_time", "end_time", "is_break")
        read_only_fields = ("id",)

    def validate(self, attrs):
        slot = TimeSlot(
            period_number=attrs.get("period_number", getattr(self.instance, "period_number", None)),
            start_time=attrs.get("start_time", getattr(self.instance, "start_time", None)),
            end_time=attrs.get("end_time", getattr(self.instance, "end_time", None)),
            is_break=attrs.get("is_break", getattr(self.instance, "is_break", False)),
        )
        try:
            slot.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(getattr(exc, "message_dict", {"detail": exc.messages})) from exc
        return attrs


class TimetableEntrySerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    faculty_name = serializers.SerializerMethodField()
    faculty_code = serializers.CharField(source="faculty.faculty_code", read_only=True)
    section_code = serializers.CharField(source="section.code", read_only=True)
    period_number = serializers.IntegerField(source="time_slot.period_number", read_only=True)
    start_time = serializers.TimeField(source="time_slot.start_time", read_only=True)
    end_time = serializers.TimeField(source="time_slot.end_time", read_only=True)

    class Meta:
        model = TimetableEntry
        fields = (
            "id",
            "weekday",
            "section",
            "section_code",
            "subject",
            "subject_code",
            "subject_name",
            "faculty",
            "faculty_name",
            "faculty_code",
            "time_slot",
            "period_number",
            "start_time",
            "end_time",
            "classroom",
            "lecture_type",
            "topic",
            "academic_year",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "section_code",
            "subject_code",
            "subject_name",
            "faculty_name",
            "faculty_code",
            "period_number",
            "start_time",
            "end_time",
            "created_at",
            "updated_at",
        )

    def get_faculty_name(self, obj):
        return obj.faculty.full_name or obj.faculty.faculty_code or "Profile incomplete"

    def validate(self, attrs):
        current = self.instance
        entry = TimetableEntry(
            weekday=attrs.get("weekday", getattr(current, "weekday", None)),
            section=attrs.get("section", getattr(current, "section", None)),
            subject=attrs.get("subject", getattr(current, "subject", None)),
            faculty=attrs.get("faculty", getattr(current, "faculty", None)),
            time_slot=attrs.get("time_slot", getattr(current, "time_slot", None)),
            classroom=attrs.get("classroom", getattr(current, "classroom", "")),
            lecture_type=attrs.get("lecture_type", getattr(current, "lecture_type", None)),
            topic=attrs.get("topic", getattr(current, "topic", "")),
            academic_year=attrs.get("academic_year", getattr(current, "academic_year", None)),
        )
        entry.pk = current.pk if current else None
        try:
            entry.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(getattr(exc, "message_dict", {"detail": exc.messages})) from exc
        return attrs


class TimetableHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = TimetableHistory
        fields = ("id", "entry_id", "action", "snapshot", "changed_by", "changed_by_name", "changed_at")


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
            "timetable_entry",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "timetable_entry", "created_at", "updated_at")

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
