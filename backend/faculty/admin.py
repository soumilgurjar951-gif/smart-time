from django.contrib import admin

from faculty.models import FacultyProfile


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ("employee_id", "full_name", "email", "designation", "account_status")
    search_fields = ("employee_id", "full_name", "email")
    filter_horizontal = ("assigned_subjects",)
