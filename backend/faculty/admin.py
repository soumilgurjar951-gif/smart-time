from django.contrib import admin

from faculty.models import FacultyProfile


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ("employee_id", "full_name", "designation", "account_status", "created_at")
    list_filter = ("account_status", "designation")
    search_fields = ("employee_id", "full_name", "email")
    readonly_fields = ("created_at", "updated_at")
    filter_horizontal = ("assigned_subjects",)
    fieldsets = (
        ("Identity", {"fields": ("user", "employee_id", "full_name", "email")}),
        ("Role", {"fields": ("designation", "department", "account_status")}),
        ("Contact", {"fields": ("contact_number",)}),
        ("Assignments", {"fields": ("assigned_subjects", "assigned_sections")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
