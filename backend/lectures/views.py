from datetime import timedelta

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsHOD
from lectures.models import Lecture, Subject
from lectures.serializers import LectureSerializer, SubjectSerializer
from odrms.utils import parse_date


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["code", "name"]
    filterset_fields = ["is_lab"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()


class LectureViewSet(viewsets.ModelViewSet):
    serializer_class = LectureSerializer
    permission_classes = [IsAuthenticated]
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
        return qs.filter(assigned_faculty=profile)

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
