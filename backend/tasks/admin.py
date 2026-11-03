from django.contrib import admin

from tasks.models import DepartmentTask, TaskUpdate


class TaskUpdateInline(admin.TabularInline):
    model = TaskUpdate
    extra = 0
    readonly_fields = ("submitted_by", "progress", "notes", "created_at")
    can_delete = False


@admin.register(DepartmentTask)
class DepartmentTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "assigned_faculty", "priority", "deadline", "status", "progress")
    list_filter = ("status", "priority")
    search_fields = ("title", "assigned_faculty__full_name")
    readonly_fields = ("assigned_by", "created_at", "updated_at", "update_requested_at", "reviewed_at")
    date_hierarchy = "deadline"
    inlines = [TaskUpdateInline]


@admin.register(TaskUpdate)
class TaskUpdateAdmin(admin.ModelAdmin):
    list_display = ("task", "submitted_by", "progress", "created_at")
    readonly_fields = ("task", "submitted_by", "created_at")
