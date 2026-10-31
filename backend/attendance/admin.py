from django.contrib import admin

from attendance.models import AttendanceRecord, AttendanceRoster


@admin.register(AttendanceRoster)
class AttendanceRosterAdmin(admin.ModelAdmin):
    list_display = ("roll_number", "full_name", "section", "is_active")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("lecture", "roster", "status", "marked_by")
    list_filter = ("status",)
