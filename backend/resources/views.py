from django.utils import timezone
from rest_framework import generics, mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsHOD
from resources.models import Resource, ResourceBooking
from resources.serializers import BookingReviewSerializer, ResourceBookingSerializer, ResourceSerializer


class ResourceViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["type", "is_available"]
    search_fields = ["name", "location", "description"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update"}:
            return [IsHOD()]
        return super().get_permissions()


class ResourceBookingListCreateView(generics.ListCreateAPIView):
    serializer_class = ResourceBookingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["resource", "status", "date", "requested_by"]

    def get_queryset(self):
        qs = ResourceBooking.objects.select_related("resource", "requested_by", "reviewed_by")
        if self.request.user.is_faculty:
            return qs.filter(requested_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user, status=ResourceBooking.Status.PENDING)


class ResourceBookingReviewView(APIView):
    permission_classes = [IsHOD]

    def post(self, request, pk):
        try:
            booking = ResourceBooking.objects.select_related("resource").get(pk=pk)
        except ResourceBooking.DoesNotExist as exc:
            raise ValidationError({"detail": "Booking not found."}) from exc
        serializer = BookingReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking.status = serializer.validated_data["status"]
        booking.review_notes = serializer.validated_data.get("review_notes", "")
        booking.reviewed_by = request.user
        booking.reviewed_at = timezone.now()
        if booking.status == ResourceBooking.Status.APPROVED:
            try:
                booking.clean()
            except Exception as exc:
                raise ValidationError(getattr(exc, "message_dict", {"detail": str(exc)})) from exc
        booking.save()
        return Response(ResourceBookingSerializer(booking).data, status=status.HTTP_200_OK)
