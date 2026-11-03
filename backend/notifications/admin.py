from django.contrib import admin

from notifications.models import AuditLog, Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read")
    search_fields = ("title", "message", "recipient__email")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity_type", "entity_id", "actor", "timestamp")
    list_filter = ("entity_type",)
    search_fields = ("action", "entity_type", "actor__email")
    readonly_fields = ("actor", "action", "entity_type", "entity_id", "timestamp", "metadata", "ip_address")
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

