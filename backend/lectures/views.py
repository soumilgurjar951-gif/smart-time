from datetime import datetime, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsProfileApproved
from rest_framework.response import Response

from accounts.permissions import IsHOD
from classes import permissions as class_perms
from faculty.models import FacultyProfile
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
from lectures.serializers import (
    AcademicYearSerializer,
    FacultySubjectSerializer,
    LectureSerializer,
    SectionSerializer,
    SubjectSerializer,
    TimeSlotSerializer,
    TimetableEntrySerializer,
    TimetableHistorySerializer,
)
from notifications.helpers import notify
from notifications.models import Notification
from odrms.utils import parse_date


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]
    search_fields = ["code", "name"]
    filterset_fields = ["is_lab"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()


class SectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]


class FacultySubjectViewSet(viewsets.ModelViewSet):
    serializer_class = FacultySubjectSerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]
    filterset_fields = ["faculty", "subject", "section", "academic_year", "is_verified"]

    def get_queryset(self):
        qs = FacultySubject.objects.select_related("faculty", "subject", "section", "academic_year")
        if self.request.user.is_hod:
            return qs
        profile = getattr(self.request.user, "faculty_profile", None)
        return qs.filter(faculty=profile) if profile else qs.none()

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        entries = TimetableEntry.objects.filter(
            faculty_id=instance.faculty_id,
            subject_id=instance.subject_id,
        )
        if instance.section_id:
            entries = entries.filter(section_id=instance.section_id)
        if instance.academic_year_id:
            entries = entries.filter(academic_year_id=instance.academic_year_id)
        if entries.exists():
            raise ValidationError("Remove or reassign timetable entries before deleting this allocation.")
        instance.delete()


class TimeSlotViewSet(viewsets.ModelViewSet):
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()


class TimetableHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TimetableHistory.objects.select_related("changed_by").all()
    serializer_class = TimetableHistorySerializer
    permission_classes = [IsHOD]
    filterset_fields = ["action", "entry_id"]
    ordering_fields = ["changed_at"]


def _entry_snapshot(entry):
    return {
        "weekday": entry.weekday,
        "section_id": entry.section_id,
        "section": entry.section.code,
        "subject_id": entry.subject_id,
        "subject_code": entry.subject.code,
        "faculty_id": entry.faculty_id,
        "faculty_code": entry.faculty.faculty_code,
        "time_slot_id": entry.time_slot_id,
        "period_number": entry.time_slot.period_number,
        "start_time": entry.time_slot.start_time.isoformat(),
        "end_time": entry.time_slot.end_time.isoformat(),
        "classroom": entry.classroom,
        "lecture_type": entry.lecture_type,
        "topic": entry.topic,
        "academic_year_id": entry.academic_year_id,
        "academic_class_id": entry.academic_class_id,
    }


def _notify_timetable_change(entry, *, title, message):
    profile = entry.faculty
    if profile.user_id and profile.user.is_active:
        notify(
            recipient=profile.user,
            title=title,
            message=message,
            notification_type=Notification.NotificationType.LECTURE,
            related_object_type="TimetableEntry",
            related_object_id=entry.pk,
            department_class=entry.academic_class,
        )


class LectureViewSet(viewsets.ModelViewSet):
    serializer_class = LectureSerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]
    filterset_fields = ["section", "date", "subject", "assigned_faculty", "status", "lecture_type"]
    search_fields = ["topic", "classroom", "subject__code", "subject__name"]
    ordering_fields = ["date", "start_time", "section"]

    def get_queryset(self):
        qs = Lecture.objects.select_related("subject", "assigned_faculty", "assigned_faculty__user")
        user = self.request.user
        if user.is_hod:
            return qs
        profile = getattr(user, "faculty_profile", None)
        if not profile:
            return qs.none()
        # Spec: faculty can access only explicitly authorized classes. Own
        # records inside an authorized class always show; records with no
        # class unit linked (legacy data) show to their owner only.
        ids = class_perms.accessible_class_ids(user)
        return qs.filter(
            Q(assigned_faculty=profile) & (Q(academic_class_id__in=ids) | Q(academic_class__isnull=True))
        )

    def get_permissions(self):
        if self.action in {"create", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_faculty:
            lecture = self.get_object()
            if lecture.assigned_faculty.user_id != user.id:
                raise PermissionDenied("Faculty may only update their own lectures.")
            allowed = {"topic", "status"}
            extra = set(serializer.validated_data.keys()) - allowed
            if extra:
                raise PermissionDenied("Faculty may only update topic and status.")
        serializer.save()

    def _timetable_queryset(self):
        return self.filter_queryset(self.get_queryset())

    @action(detail=False, methods=["get"], url_path="timetable/daily")
    def daily_timetable(self, request):
        try:
            day = parse_date(request.query_params.get("date"))
        except ValueError as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD."}) from exc
        qs = self._timetable_queryset().filter(date=day).order_by("start_time", "section")
        return Response(
            {
                "date": day,
                "count": qs.count(),
                "results": LectureSerializer(qs, many=True).data,
            }
        )

    @action(detail=False, methods=["get"], url_path="timetable/weekly")
    def weekly_timetable(self, request):
        try:
            start = parse_date(request.query_params.get("week_start"))
        except ValueError as exc:
            raise ValidationError({"week_start": "Use YYYY-MM-DD."}) from exc
        start = start - timedelta(days=start.weekday())
        end = start + timedelta(days=6)
        qs = self._timetable_queryset().filter(date__range=(start, end)).order_by("date", "start_time")
        return Response(
            {
                "week_start": start,
                "week_end": end,
                "count": qs.count(),
                "results": LectureSerializer(qs, many=True).data,
            }
        )


class TimetableEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableEntrySerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]
    filterset_fields = ["weekday", "section", "subject", "faculty", "time_slot", "academic_year"]
    ordering_fields = ["weekday", "time_slot__period_number", "section__code"]

    def get_queryset(self):
        qs = TimetableEntry.objects.select_related(
            "section", "subject", "faculty", "faculty__user", "time_slot", "academic_year"
        )
        if self.request.user.is_hod:
            return qs
        profile = getattr(self.request.user, "faculty_profile", None)
        if not profile:
            return qs.none()
        # Faculty can view only schedules of classes they are authorized to
        # access (their own rows in legacy/unlinked classes still show).
        ids = class_perms.accessible_class_ids(self.request.user)
        return qs.filter(
            Q(faculty=profile) & (Q(academic_class_id__in=ids) | Q(academic_class__isnull=True))
        )

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()

    def perform_create(self, serializer):
        with transaction.atomic():
            entry = serializer.save()
            TimetableHistory.objects.create(
                entry_id=entry.pk,
                action=TimetableHistory.Action.CREATED,
                snapshot={"after": _entry_snapshot(entry)},
                changed_by=self.request.user,
            )
            _notify_timetable_change(
                entry,
                title="Timetable assignment added",
                message=f"{entry.subject.name} for Section {entry.section.code} was added to your timetable.",
            )

    def perform_update(self, serializer):
        previous = _entry_snapshot(serializer.instance)
        with transaction.atomic():
            entry = serializer.save()
            TimetableHistory.objects.create(
                entry_id=entry.pk,
                action=TimetableHistory.Action.UPDATED,
                snapshot={"before": previous, "after": _entry_snapshot(entry)},
                changed_by=self.request.user,
            )
            affected = {entry.faculty_id, previous["faculty_id"]}
            for profile in FacultyProfile.objects.filter(pk__in=affected).select_related("user"):
                if profile.user_id and profile.user.is_active:
                    notify(
                        recipient=profile.user,
                        title="Timetable assignment changed",
                        message=f"A timetable assignment for Section {entry.section.code} has changed.",
                        notification_type=Notification.NotificationType.LECTURE,
                        related_object_type="TimetableEntry",
                        related_object_id=entry.pk,
                        department_class=entry.academic_class,
                    )

    def perform_destroy(self, instance):
        with transaction.atomic():
            snapshot = _entry_snapshot(instance)
            TimetableHistory.objects.create(
                entry_id=instance.pk,
                action=TimetableHistory.Action.DELETED,
                snapshot={"before": snapshot},
                changed_by=self.request.user,
            )
            _notify_timetable_change(
                instance,
                title="Timetable assignment removed",
                message=f"{instance.subject.name} for Section {instance.section.code} was removed from your timetable.",
            )
            instance.delete()

    @action(detail=False, methods=["post"], url_path="conflicts")
    def validate_conflicts(self, request):
        """Preview validation without creating the entry (smart conflict resolver)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = TimetableEntry(**serializer.validated_data)
        conflicts = []
        try:
            instance.clean()
            valid = True
        except DjangoValidationError as exc:
            valid = False
            detail = getattr(exc, "message_dict", None) or {"non_field_errors": exc.messages}
            conflicts = [{"field": field, "messages": messages} for field, messages in detail.items()]
        return Response({"valid": valid, "conflicts": conflicts})

    @action(detail=True, methods=["post"], url_path="occurrence")
    def create_occurrence(self, request, pk=None):
        entry = self.get_object()
        raw_date = request.data.get("date")
        try:
            lecture_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
        except (TypeError, ValueError) as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD."}) from exc
        if lecture_date.weekday() > 4:
            raise ValidationError({"date": "Lectures can only occur Monday through Friday."})
        weekday = list(TimetableEntry.Weekday.values)[lecture_date.weekday()]
        if weekday != entry.weekday:
            raise ValidationError({"date": "The date does not match this timetable entry's weekday."})
        lecture = Lecture.objects.filter(timetable_entry=entry, date=lecture_date).first()
        if lecture:
            return Response(LectureSerializer(lecture).data, status=status.HTTP_200_OK)
        lecture = Lecture(
            timetable_entry=entry,
            date=lecture_date,
            subject=entry.subject,
            assigned_faculty=entry.faculty,
            department=entry.section.department,
            semester=entry.section.semester,
            section=entry.section.code,
            start_time=entry.time_slot.start_time,
            end_time=entry.time_slot.end_time,
            classroom=entry.classroom,
            lecture_type=entry.lecture_type,
            topic=entry.topic,
        )
        try:
            lecture.clean()
            with transaction.atomic():
                lecture.save()
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, "message_dict", {"detail": exc.messages})) from exc
        except IntegrityError:
            lecture = Lecture.objects.get(timetable_entry=entry, date=lecture_date)
            return Response(LectureSerializer(lecture).data, status=status.HTTP_200_OK)
        return Response(LectureSerializer(lecture).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="daily")
    def daily_timetable(self, request):
        weekday = request.query_params.get("weekday", "").upper()
        if weekday not in TimetableEntry.Weekday.values:
            raise ValidationError({"weekday": "Provide a weekday from Monday through Friday."})
        qs = self.get_queryset().filter(weekday=weekday)
        if request.query_params.get("section"):
            qs = qs.filter(section__code=request.query_params["section"])
        return Response(TimetableEntrySerializer(qs.order_by("time_slot__period_number", "section__code"), many=True).data)

    @action(detail=False, methods=["get"], url_path="weekly")
    def weekly_timetable(self, request):
        qs = self.get_queryset()
        if request.query_params.get("section"):
            qs = qs.filter(section__code=request.query_params["section"])
        results = TimetableEntrySerializer(
            qs.order_by("weekday", "time_slot__period_number", "section__code"),
            many=True,
        ).data
        return Response({"count": len(results), "results": results})

    @action(detail=False, methods=["get"], url_path="faculty")
    def faculty_timetable(self, request):
        profile = getattr(request.user, "faculty_profile", None)
        if request.user.is_hod:
            faculty_id = request.query_params.get("faculty")
            if not faculty_id:
                raise ValidationError({"faculty": "HOD must provide a faculty profile ID."})
            qs = self.get_queryset().filter(faculty_id=faculty_id)
        elif profile:
            qs = self.get_queryset().filter(faculty=profile)
        else:
            qs = self.get_queryset().none()
        results = TimetableEntrySerializer(
            qs.order_by("weekday", "time_slot__period_number"),
            many=True,
        ).data
        return Response({"count": len(results), "results": results})
