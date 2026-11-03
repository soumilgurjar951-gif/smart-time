from django.contrib import admin

from resources.models import Resource, ResourceBooking


class ResourceBookingInline(admin.TabularInline):
    model = ResourceBooking
    extra = 0
    readonly_fields = ("requested_by", "date", "start_time", "end_time", "purpose", "status", "reviewed_by", "reviewed_at")
    can_delete = False
    show_change_link = True


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "location", "capacity", "is_available")
    list_filter = ("type", "is_available")
    search_fields = ("name", "location")
    inlines = [ResourceBookingInline]


@admin.register(ResourceBooking)
class ResourceBookingAdmin(admin.ModelAdmin):
    list_display = ("resource", "requested_by", "date", "start_time", "end_time", "status")
    list_filter = ("status", "date")
    search_fields = ("resource__name", "requested_by__email", "purpose")
    readonly_fields = ("created_at", "updated_at", "reviewed_at", "reviewed_by")
    date_hierarchy = "date"
