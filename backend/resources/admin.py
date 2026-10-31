from django.contrib import admin

from resources.models import Resource, ResourceBooking


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "location", "capacity", "is_available")


@admin.register(ResourceBooking)
class ResourceBookingAdmin(admin.ModelAdmin):
    list_display = ("resource", "requested_by", "date", "start_time", "end_time", "status")
    list_filter = ("status",)
