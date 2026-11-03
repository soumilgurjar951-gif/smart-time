from django.contrib import admin

from .models import (
    AcademicClass,
    ClassFacultyAccess,
    ClassSubject,
    Department,
    FacultySubjectAssignment,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_active", "created_at"]
    search_fields = ["code", "name"]


@admin.register(AcademicClass)
class AcademicClassAdmin(admin.ModelAdmin):
    list_display = ["display_name", "department", "year", "semester", "section", "academic_year", "is_active"]
    list_filter = ["department", "year", "semester", "section", "is_active"]
    search_fields = ["section", "department__code"]


@admin.register(ClassSubject)
class ClassSubjectAdmin(admin.ModelAdmin):
    list_display = ["department_class", "subject", "is_active"]
    list_filter = ["department_class"]


@admin.register(FacultySubjectAssignment)
class FacultySubjectAssignmentAdmin(admin.ModelAdmin):
    list_display = ["faculty", "class_subject", "is_active", "created_at"]
    list_filter = ["is_active"]


@admin.register(ClassFacultyAccess)
class ClassFacultyAccessAdmin(admin.ModelAdmin):
    list_display = ["faculty", "department_class", "is_active", "granted_at", "revoked_at", "granted_by"]
    list_filter = ["is_active", "department_class"]
    search_fields = ["faculty__full_name"]
