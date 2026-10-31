from django.contrib import admin

from lectures.models import Lecture, Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "semester", "is_lab")


@admin.register(Lecture)
class LectureAdmin(admin.ModelAdmin):
    list_display = ("subject", "assigned_faculty", "section", "date", "start_time", "classroom", "status")
    list_filter = ("section", "status", "lecture_type")
