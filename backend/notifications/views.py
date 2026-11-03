from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from accounts.permissions import IsHOD
from notifications.models import AuditLog, Notification
from notifications.serializers import AuditLogSerializer, NotificationSerializer


class NotificationViewSet(ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_read", "notification_type"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"marked_read": count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread": count})


class AuditLogViewSet(ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsHOD]
    queryset = AuditLog.objects.select_related("actor").all()
    filterset_fields = ["entity_type", "actor"]
    search_fields = ["action", "entity_type"]
    ordering_fields = ["timestamp"]

