from django.contrib import admin

from tasks.models import DepartmentTask, TaskUpdate


class TaskUpdateInline(admin.TabularInline):
    model = TaskUpdate
    extra = 0
    readonly_fields = ("submitted_by", "progress", "notes", "created_at")


@admin.register(DepartmentTask)
class DepartmentTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "assigned_faculty", "priority", "deadline", "status", "progress")
    inlines = [TaskUpdateInline]
