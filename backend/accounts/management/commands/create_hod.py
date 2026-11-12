"""Provision the initial HOD account for ODRMS — no credentials are hardcoded.

Usage (interactive prompt for any missing value):

    python manage.py create_hod

Override via environment variables so automation can run it safely:

    DJANGO_HOD_EMAIL=hod@cdgi.edu.in
    DJANGO_HOD_PASSWORD=<strong-password>
    DJANGO_HOD_FULL_NAME="Dr. Head of Department"

Or via arguments (passwords passed as arguments are visible in shell history;
prefer environment variables or omit them to be prompted):

    python manage.py create_hod --email hod@cdgi.edu.in --update-password
"""
import getpass
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Provision the initial HOD account using environment configuration "
        "(DJANGO_HOD_EMAIL / DJANGO_HOD_PASSWORD / DJANGO_HOD_FULL_NAME). "
        "No credentials are hardcoded anywhere."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", default=None, help="Official college email of the HOD.")
        parser.add_argument("--full-name", default=None, help="Full name of the HOD.")
        parser.add_argument(
            "--password",
            default=None,
            help="Password (omit to be prompted safely; prefer DJANGO_HOD_PASSWORD).",
        )
        parser.add_argument(
            "--update-password",
            action="store_true",
            help="Reset the password if the account already exists.",
        )

    def handle(self, *args, **options):
        User = get_user_model()

        email = (options.get("email") or os.getenv("DJANGO_HOD_EMAIL") or "").strip().lower()
        full_name = (options.get("full_name") or os.getenv("DJANGO_HOD_FULL_NAME") or "").strip()
        password = options.get("password") or os.getenv("DJANGO_HOD_PASSWORD")
        update_password = bool(options.get("update_password"))

        if not email:
            email = input("HOD official email: ").strip().lower()
        if not full_name:
            full_name = input("HOD full name: ").strip()
        if not password:
            password = getpass.getpass("HOD password: ")
        if not email or not password:
            raise CommandError("Email and password are both required.")
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise CommandError("Provide a valid email address.")

        existing = User.objects.filter(email=email).first()
        if existing:
            if existing.role != User.Role.HOD:
                raise CommandError(
                    f"User {email} already exists with role {existing.role}. "
                    "Refusing to overwrite — use the Django admin to change roles explicitly."
                )
            if update_password:
                existing.set_password(password)
                existing.save(update_fields=["password", "updated_at"])
                self.stdout.write(self.style.WARNING(f"Password updated for existing HOD: {email}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"HOD account already exists: {email} (no changes)"))
            existing.is_staff = True
            existing.is_superuser = True
            existing.is_active = True
            existing.save(update_fields=["is_staff", "is_superuser", "is_active"])
            return

        user = User.objects.create_superuser(
            email=email,
            password=password,  # hashed immediately by the manager; never stored in plaintext
            full_name=full_name or "Head of Department",
            role=User.Role.HOD,
        )
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save(update_fields=["is_staff", "is_superuser", "is_active"])
        self.stdout.write(self.style.SUCCESS(f"HOD created: {email}"))
        self.stdout.write("No credentials were printed or stored in plaintext anywhere.")
