from django.contrib import admin

from accounts.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active")
    search_fields = ("email", "full_name")
    readonly_fields = ("date_joined", "updated_at", "last_login")
    ordering = ("full_name",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("full_name",)}),
        ("Role & access", {"fields": ("role", "is_active", "is_staff", "is_superuser")}),
        ("Timestamps", {"fields": ("date_joined", "updated_at", "last_login")}),
    )
