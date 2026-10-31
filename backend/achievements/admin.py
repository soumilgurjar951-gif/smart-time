from django.contrib import admin

from achievements.models import FacultyAchievement


@admin.register(FacultyAchievement)
class FacultyAchievementAdmin(admin.ModelAdmin):
    list_display = ("title", "faculty", "category", "date", "verification_status")
    list_filter = ("verification_status", "category")
