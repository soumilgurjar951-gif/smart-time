from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsHOD
from tasks.models import DepartmentTask, TaskUpdate
from tasks.serializers import DepartmentTaskSerializer, TaskUpdateSerializer


class DepartmentTaskViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentTaskSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["assigned_faculty", "status", "priority"]
    search_fields = ["title", "description"]
    ordering_fields = ["deadline", "created_at", "priority", "progress"]

    def get_queryset(self):
        DepartmentTask.objects.filter(
            deadline__lt=timezone.localdate(),
            status__in=[DepartmentTask.Status.PENDING, DepartmentTask.Status.IN_PROGRESS],
        ).update(status=DepartmentTask.Status.OVERDUE)
        qs = DepartmentTask.objects.select_related(
            "assigned_faculty",
            "assigned_by",
        ).prefetch_related("updates", "updates__submitted_by")
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

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

    def perform_update(self, serializer):
        user = self.request.user
        task = self.get_object()
        if user.is_faculty:
            if task.assigned_faculty.user_id != user.id:
                raise PermissionDenied("You can only update tasks assigned to you.")
            allowed = {"progress", "submission_notes", "status"}
            extra = set(serializer.validated_data.keys()) - allowed
            if extra:
                raise PermissionDenied("Faculty may only update progress, notes, and status.")
            status_value = serializer.validated_data.get("status")
            if status_value and status_value not in {
                DepartmentTask.Status.IN_PROGRESS,
                DepartmentTask.Status.COMPLETED,
            }:
                raise PermissionDenied("Faculty can only set status to IN_PROGRESS or COMPLETED.")
        serializer.save()

    @action(detail=True, methods=["post"], url_path="updates")
    def submit_update(self, request, pk=None):
        task = self.get_object()
        user = request.user
        if user.is_faculty and task.assigned_faculty.user_id != user.id:
            raise PermissionDenied("You can only submit updates for your assigned tasks.")
        serializer = TaskUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = serializer.save(task=task, submitted_by=user)
        task.progress = update.progress
        task.submission_notes = update.notes
        if update.progress >= 100:
            task.status = DepartmentTask.Status.COMPLETED
        elif task.status in {DepartmentTask.Status.PENDING, DepartmentTask.Status.OVERDUE}:
            task.status = DepartmentTask.Status.IN_PROGRESS
        task.save()
        return Response(DepartmentTaskSerializer(task).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="request-update", permission_classes=[IsHOD])
    def request_update(self, request, pk=None):
        task = self.get_object()
        task.update_requested_at = timezone.now()
        task.save(update_fields=["update_requested_at", "updated_at"])
        return Response(DepartmentTaskSerializer(task).data)

    @action(detail=True, methods=["post"], url_path="review", permission_classes=[IsHOD])
    def review(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get("status")
        if new_status not in {DepartmentTask.Status.COMPLETED, DepartmentTask.Status.REJECTED, DepartmentTask.Status.IN_PROGRESS}:
            return Response(
                {"detail": "Review status must be COMPLETED, REJECTED, or IN_PROGRESS."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = new_status
        task.reviewed_at = timezone.now()
        if new_status == DepartmentTask.Status.COMPLETED:
            task.progress = 100
        task.save()
        return Response(DepartmentTaskSerializer(task).data)
