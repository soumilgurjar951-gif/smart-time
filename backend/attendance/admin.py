from django.contrib import admin

from attendance.models import AttendanceRecord, AttendanceRoster


@admin.register(AttendanceRoster)
class AttendanceRosterAdmin(admin.ModelAdmin):
    list_display = ("roll_number", "full_name", "section", "semester", "is_active")
    list_filter = ("section", "is_active")
    search_fields = ("roll_number", "full_name")
    ordering = ("section", "roll_number")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("roster", "lecture", "status", "marked_by", "marked_at")
    list_filter = ("status",)
    search_fields = ("roster__roll_number", "roster__full_name", "lecture__subject__code")
    readonly_fields = ("marked_at", "updated_at")
    date_hierarchy = "marked_at"
