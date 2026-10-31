from rest_framework import serializers

from resources.models import Resource, ResourceBooking


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = (
            "id",
            "name",
            "type",
            "location",
            "capacity",
            "is_available",
            "description",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ResourceBookingSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source="resource.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True, default=None)

    class Meta:
        model = ResourceBooking
        fields = (
            "id",
            "resource",
            "resource_name",
            "requested_by",
            "requested_by_name",
            "date",
            "start_time",
            "end_time",
            "purpose",
            "status",
            "review_notes",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "requested_by",
            "status",
            "review_notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        booking = ResourceBooking(
            resource=attrs.get("resource") or getattr(self.instance, "resource", None),
            date=attrs.get("date") or getattr(self.instance, "date", None),
            start_time=attrs.get("start_time") or getattr(self.instance, "start_time", None),
            end_time=attrs.get("end_time") or getattr(self.instance, "end_time", None),
            status=ResourceBooking.Status.PENDING,
        )
        if booking.start_time and booking.end_time and booking.end_time <= booking.start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        resource = booking.resource
        if resource and not resource.is_available:
            raise serializers.ValidationError({"resource": "This resource is currently unavailable."})
        return attrs


class BookingReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[ResourceBooking.Status.APPROVED, ResourceBooking.Status.REJECTED]
    )
    review_notes = serializers.CharField(required=False, allow_blank=True)
