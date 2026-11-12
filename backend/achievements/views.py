from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsProfileApproved
from rest_framework.response import Response

from accounts.permissions import IsHOD
from achievements.models import FacultyAchievement
from achievements.serializers import AchievementReviewSerializer, FacultyAchievementSerializer


class FacultyAchievementViewSet(viewsets.ModelViewSet):
    serializer_class = FacultyAchievementSerializer
    permission_classes = [IsAuthenticated, IsProfileApproved]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]
    filterset_fields = ["faculty", "category", "verification_status"]
    search_fields = ["title", "issuing_organization", "description"]

    def get_queryset(self):
        qs = FacultyAchievement.objects.select_related("faculty", "reviewed_by")
        user = self.request.user
        if user.is_hod:
            return qs
        profile = getattr(user, "faculty_profile", None)
        if not profile:
            return qs.none()
        return qs.filter(faculty=profile)

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, "faculty_profile", None)
        faculty = serializer.validated_data.get("faculty")
        if user.is_hod:
            serializer.save()
            return
        if not profile:
            raise PermissionDenied("A faculty profile is required to submit achievements.")
        if faculty and faculty.id != profile.id:
            raise PermissionDenied("You can only submit achievements for yourself.")
        serializer.save(faculty=profile, verification_status=FacultyAchievement.VerificationStatus.PENDING)

    def perform_update(self, serializer):
        achievement = self.get_object()
        user = self.request.user
        if user.is_faculty:
            if achievement.faculty.user_id != user.id:
                raise PermissionDenied("You can only update your own achievements.")
            if achievement.verification_status != FacultyAchievement.VerificationStatus.PENDING:
                raise PermissionDenied("Reviewed achievements cannot be edited.")
        serializer.save()

    @action(detail=True, methods=["post"], url_path="review", permission_classes=[IsHOD])
    def review(self, request, pk=None):
        achievement = self.get_object()
        serializer = AchievementReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        achievement.verification_status = serializer.validated_data["verification_status"]
        achievement.review_notes = serializer.validated_data.get("review_notes", "")
        achievement.reviewed_by = request.user
        achievement.reviewed_at = timezone.now()
        achievement.save()
        return Response(FacultyAchievementSerializer(achievement, context={"request": request}).data)
