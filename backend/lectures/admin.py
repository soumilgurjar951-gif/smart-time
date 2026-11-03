from django.contrib import admin

from lectures.models import Lecture, Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "semester", "credits", "is_lab")
    search_fields = ("code", "name")
    list_filter = ("is_lab",)


@admin.register(Lecture)
class LectureAdmin(admin.ModelAdmin):
    list_display = ("subject", "assigned_faculty", "section", "date", "start_time", "end_time", "status")
    list_filter = ("section", "status", "lecture_type", "date")
    search_fields = ("topic", "classroom", "subject__code", "assigned_faculty__full_name")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "date"
    ordering = ("-date", "start_time")
