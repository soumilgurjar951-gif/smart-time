from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsHOD
from faculty.models import FacultyProfile
from faculty.serializers import FacultyProfileSerializer


class FacultyViewSet(viewsets.ModelViewSet):
    serializer_class = FacultyProfileSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["account_status", "designation"]
    search_fields = ["full_name", "email", "employee_id", "designation"]
    ordering_fields = ["full_name", "employee_id", "created_at"]

    def get_queryset(self):
        qs = FacultyProfile.objects.select_related("user").prefetch_related("assigned_subjects")
        user = self.request.user
        if user.is_hod:
            return qs
        profile = getattr(user, "faculty_profile", None)
        if not profile:
            return qs.none()
        return qs.filter(pk=profile.pk)

    def get_permissions(self):
        if self.action in {"create", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()

    def perform_create(self, serializer):
        if not self.request.user.is_hod:
            raise PermissionDenied("Only HOD can create faculty records.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user.is_hod:
            raise ValidationError("The HOD account cannot be deleted.")
        if instance.lectures.exclude(status="CANCELLED").exists():
            raise ValidationError("Reassign or cancel lectures before deleting this faculty member.")
        user = instance.user
        instance.delete()
        user.delete()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_faculty and instance.user_id != request.user.id:
            raise PermissionDenied("Faculty may only update their own profile.")
        if request.user.is_faculty:
            allowed = {"contact_number", "full_name"}
            extra = set(request.data.keys()) - allowed - {"password"}
            if extra:
                raise PermissionDenied("Faculty may only update contact information and name.")
        return super().update(request, *args, **kwargs)
