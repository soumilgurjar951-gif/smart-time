"""
Management command: seed_data

Populates the database with the initial CSIT 5th Semester data:
  - 8 subjects (theory + labs + minor project)
  - Sample resource types (classrooms, labs, seminar hall)

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear   # wipe and re-seed

Idempotent — safe to run multiple times without duplicating records.
"""

from django.core.management.base import BaseCommand

SUBJECTS = [
    {"code": "CSIT-501", "name": "Theory of Computation",              "credits": 4, "is_lab": False},
    {"code": "CSIT-502", "name": "Database Management Systems",         "credits": 4, "is_lab": False},
    {"code": "CSIT-503", "name": "Design and Analysis of Algorithms",  "credits": 4, "is_lab": False},
    {"code": "CSIT-504", "name": "Software Engineering",               "credits": 4, "is_lab": False},
    {"code": "CSIT-505", "name": "Web Technologies",                   "credits": 4, "is_lab": False},
    {"code": "CSIT-506", "name": "Database Management Systems Lab",    "credits": 2, "is_lab": True},
    {"code": "CSIT-507", "name": "Design and Analysis of Algorithms Lab", "credits": 2, "is_lab": True},
    {"code": "CSIT-508", "name": "Minor Project",                      "credits": 2, "is_lab": True},
]

RESOURCES = [
    {"name": "CS Lab 1",       "type": "LAB",       "location": "Block A, Ground Floor", "capacity": 60},
    {"name": "CS Lab 2",       "type": "LAB",       "location": "Block A, First Floor",  "capacity": 60},
    {"name": "CS Room 101",    "type": "CLASSROOM", "location": "Block A, First Floor",  "capacity": 70},
    {"name": "CS Room 102",    "type": "CLASSROOM", "location": "Block A, First Floor",  "capacity": 70},
    {"name": "CS Room 201",    "type": "CLASSROOM", "location": "Block A, Second Floor", "capacity": 70},
    {"name": "CS Room 202",    "type": "CLASSROOM", "location": "Block A, Second Floor", "capacity": 70},
    {"name": "Seminar Hall A", "type": "HALL",      "location": "Block B, Ground Floor", "capacity": 150},
    {"name": "Projector 1",    "type": "EQUIPMENT", "location": "CS Dept Store",         "capacity": 1},
    {"name": "Projector 2",    "type": "EQUIPMENT", "location": "CS Dept Store",         "capacity": 1},
]


class Command(BaseCommand):
    help = "Seed initial CSIT 5th Semester subjects and department resources."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing subjects and resources before seeding.",
        )

    def handle(self, *args, **options):
        from lectures.models import Subject
        from resources.models import Resource

        if options["clear"]:
            Subject.objects.all().delete()
            Resource.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing subjects and resources."))

        # Subjects
        created_subjects = 0
        for data in SUBJECTS:
            _, created = Subject.objects.get_or_create(code=data["code"], defaults=data)
            if created:
                created_subjects += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Subjects: {created_subjects} created, {len(SUBJECTS) - created_subjects} already existed."
            )
        )

        # Resources
        created_resources = 0
        for data in RESOURCES:
            _, created = Resource.objects.get_or_create(name=data["name"], defaults=data)
            if created:
                created_resources += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Resources: {created_resources} created, {len(RESOURCES) - created_resources} already existed."
            )
        )

        self.stdout.write(
            self.style.SUCCESS(
                "\nSeed complete. Next: python manage.py createsuperuser (to create HOD account)"
            )
        )

