"""Seed the class/section architecture.

Creates the CSIT department plus independent class units for Section A and
Section B (CSIT 3rd Year / 5th Semester), and links existing timetable and
lecture rows to their class WITHOUT copying records across classes.

Run:  python manage.py seed_classes [--relink]
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from classes.models import AcademicClass, ClassSubject, Department
from lectures.models import AcademicYear, Lecture, Section, Subject, TimetableEntry
from odrms.constants import DEPARTMENT_CSIT, YEAR_THIRD, SEMESTER_FIFTH


class Command(BaseCommand):
    help = "Seed Department + AcademicClass structure and link existing records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--relink",
            action="store_true",
            help="Re-link existing timetable/lecture rows to their matching class.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dept, _ = Department.objects.get_or_create(
            code=DEPARTMENT_CSIT,
            defaults={"name": "Computer Science & IT"},
        )

        active_year = AcademicYear.objects.filter(
            is_active=True, year_number=YEAR_THIRD, semester=SEMESTER_FIFTH
        ).first()

        classes = {}
        for section in Section.objects.filter(department=DEPARTMENT_CSIT):
            cls, created = AcademicClass.objects.get_or_create(
                department=dept,
                year=YEAR_THIRD,
                semester=SEMESTER_FIFTH,
                section=section.code,
                academic_year=active_year,
                defaults={"is_active": True},
            )
            classes[section.code] = cls
            self.stdout.write(f"{'created' if created else 'exists'}: {cls.display_name}")

        # Ensure every CSIT 5th-semester subject is linked to each class. This
        # only creates ClassSubject rows — it does NOT create timetable
        # entries, so each class keeps its own (possibly empty) timetable.
        for code, cls in classes.items():
            for subject in Subject.objects.filter(
                department=DEPARTMENT_CSIT, semester=SEMESTER_FIFTH, is_active=True
            ):
                _, created = ClassSubject.objects.get_or_create(department_class=cls, subject=subject)
                if created:
                    self.stdout.write(f"linked subject {subject.code} -> Section {code}")

        if options.get("relink"):
            relinked = 0
            for entry in TimetableEntry.objects.filter(academic_class__isnull=True):
                cls = classes.get(entry.section.code)
                if cls:
                    entry.academic_class = cls
                    entry.save(update_fields=["academic_class"])
                    relinked += 1
            lecture_linked = 0
            for lecture in Lecture.objects.filter(academic_class__isnull=True):
                cls = classes.get(lecture.section)
                if cls:
                    lecture.academic_class = cls
                    lecture.save(update_fields=["academic_class"])
                    lecture_linked += 1
            self.stdout.write(f"relinked {relinked} timetable entries and {lecture_linked} lectures.")
        else:
            self.stdout.write("Tip: run with --relink to attach existing timetable/lecture rows to their class.")

        self.stdout.write(self.style.SUCCESS("Done."))
