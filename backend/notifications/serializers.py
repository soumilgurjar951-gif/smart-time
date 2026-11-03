from rest_framework import serializers

from notifications.models import AuditLog, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "title",
            "message",
            "notification_type",
            "related_object_type",
            "related_object_id",
            "is_read",
            "created_at",
        )
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_name",
            "action",
            "entity_type",
            "entity_id",
            "timestamp",
            "metadata",
            "ip_address",
        )
        read_only_fields = fields

