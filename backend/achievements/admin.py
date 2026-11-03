from django.contrib import admin

from achievements.models import FacultyAchievement


@admin.register(FacultyAchievement)
class FacultyAchievementAdmin(admin.ModelAdmin):
    list_display = ("title", "faculty", "category", "verification_status", "date", "created_at")
    list_filter = ("category", "verification_status")
    search_fields = ("title", "faculty__full_name", "issuing_organization")
    readonly_fields = ("created_at", "updated_at", "reviewed_at", "reviewed_by")
    date_hierarchy = "date"

    def save_model(self, request, obj, form, change):
        if change and "verification_status" in form.changed_data:
            obj.reviewed_by = request.user
            from django.utils import timezone
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
