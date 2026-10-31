from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsHOD
from attendance.models import AttendanceRecord, AttendanceRoster
from attendance.serializers import AttendanceRecordSerializer, AttendanceRosterSerializer
from lectures.models import Lecture


def _can_mark_lecture(user, lecture: Lecture) -> bool:
    if user.is_hod:
        return True
    profile = getattr(user, "faculty_profile", None)
    return bool(profile and lecture.assigned_faculty_id == profile.id)


class AttendanceRosterViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRoster.objects.all()
    serializer_class = AttendanceRosterSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["section", "is_active"]
    search_fields = ["roll_number", "full_name"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]
    filterset_fields = ["lecture", "status", "roster"]
    search_fields = ["roster__roll_number", "roster__full_name", "lecture__subject__code"]

    def get_queryset(self):
        qs = AttendanceRecord.objects.select_related(
            "lecture",
            "lecture__subject",
            "lecture__assigned_faculty",
            "roster",
            "marked_by",
        )
        params = self.request.query_params
        if params.get("date"):
            qs = qs.filter(lecture__date=params["date"])
        if params.get("subject"):
            qs = qs.filter(lecture__subject_id=params["subject"])
        if params.get("section"):
            qs = qs.filter(lecture__section=params["section"])
        user = self.request.user
        if user.is_hod:
            return qs
        profile = getattr(user, "faculty_profile", None)
        if not profile:
            return qs.none()
        return qs.filter(lecture__assigned_faculty=profile)

    def create(self, request, *args, **kwargs):
        lecture_id = request.data.get("lecture")
        try:
            lecture = Lecture.objects.get(pk=lecture_id)
        except (Lecture.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError({"lecture": "Valid lecture is required."}) from exc
        if not _can_mark_lecture(request.user, lecture):
            raise PermissionDenied("You can only mark attendance for your assigned lectures.")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    def perform_update(self, serializer):
        lecture = serializer.instance.lecture
        if not _can_mark_lecture(self.request.user, lecture):
            raise PermissionDenied("You can only update attendance for your assigned lectures.")
        serializer.save(marked_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="reports")
    def reports(self, request):
        qs = self.filter_queryset(self.get_queryset())
        summary = qs.aggregate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
        )
        total = summary["total"] or 0
        by_lecture = (
            qs.values(
                "lecture_id",
                "lecture__date",
                "lecture__section",
                "lecture__subject__code",
                "lecture__assigned_faculty__full_name",
            )
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
                absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
                on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
            )
            .order_by("lecture__date")
        )
        return Response(
            {
                "summary": {
                    **summary,
                    "present_percentage": round((summary["present"] / total) * 100, 2) if total else 0,
                },
                "by_lecture": list(by_lecture),
            }
        )
