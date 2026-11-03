from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from attendance.models import AttendanceRecord, AttendanceRoster
from classes.models import AccessGrant, AcademicClass, ClassSubject, Department, FacultySubjectAssignment
from faculty.models import FacultyProfile
from lectures.models import AcademicYear, FacultySubject, Lecture, Section, Subject, TimeSlot, TimetableEntry
from odrms.constants import DEPARTMENT_CSIT, SEMESTER_FIFTH


class AttendanceSummarySectionTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Computer Science & IT", code="CSIT")
        self.year = AcademicYear.objects.get(name="3rd Year - Semester 5")
        self.class_a = AcademicClass.objects.create(
            department=self.department, year=3, semester=5, section="A", academic_year=self.year
        )
        self.class_b = AcademicClass.objects.create(
            department=self.department, year=3, semester=5, section="B", academic_year=self.year
        )
        self.hod = User.objects.create_user(
            email="hod@csit.example", password="SecurePass123!", full_name="CSIT HOD", role=User.Role.HOD
        )
        self.faculty_user = User.objects.create_user(
            email="faculty@csit.example", password="SecurePass123!", full_name="Faculty One", role=User.Role.FACULTY
        )
        self.faculty = FacultyProfile.objects.create(
            user=self.faculty_user,
            faculty_code="T1",
            employee_id="CSIT-FT-1",
            full_name="Faculty One",
            email=self.faculty_user.email,
            department="CSIT",
        )
        self.subject = Subject.objects.create(code="CSIT901", name="Computer Networking")
        self.slot = TimeSlot.objects.get(period_number=1)
        self.class_subject_a = ClassSubject.objects.create(department_class=self.class_a, subject=self.subject)
        self.class_subject_b = ClassSubject.objects.create(department_class=self.class_b, subject=self.subject)
        self.assignment_a = FacultySubjectAssignment.objects.create(
            faculty=self.faculty, class_subject=self.class_subject_a, is_active=True
        )
        self.assignment_b = FacultySubjectAssignment.objects.create(
            faculty=self.faculty, class_subject=self.class_subject_b, is_active=True
        )
        self.section_a = Section.objects.get(code="A")
        self.section_b = Section.objects.get(code="B")
        self.lecture_a = Lecture.objects.create(
            subject=self.subject,
            assigned_faculty=self.faculty,
            department=DEPARTMENT_CSIT,
            semester=SEMESTER_FIFTH,
            section="A",
            date=date.today() + timedelta(days=1),
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            classroom="CSIT-101",
            lecture_type=Lecture.LectureType.THEORY,
            academic_class=self.class_a,
        )
        self.lecture_b = Lecture.objects.create(
            subject=self.subject,
            assigned_faculty=self.faculty,
            department=DEPARTMENT_CSIT,
            semester=SEMESTER_FIFTH,
            section="B",
            date=date.today() + timedelta(days=2),
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            classroom="CSIT-102",
            lecture_type=Lecture.LectureType.THEORY,
            academic_class=self.class_b,
        )
        self.roster = AttendanceRoster.objects.create(
            roll_number="R100",
            full_name="Student One",
            department=DEPARTMENT_CSIT,
            semester=SEMESTER_FIFTH,
            section="A",
            is_active=True,
        )
        AttendanceRecord.objects.create(
            lecture=self.lecture_a,
            roster=self.roster,
            status=AttendanceRecord.Status.PRESENT,
            marked_by=self.hod,
        )

    def test_faculty_attendance_summary_scoped_to_assigned_section(self):
        self.client.force_authenticate(user=self.faculty_user)
        response = self.client.get("/api/reports/attendance/", {"section": "A"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["summary"]["total"], 1)

        response_b = self.client.get("/api/reports/attendance/", {"section": "B"})
        self.assertEqual(response_b.status_code, status.HTTP_200_OK)
        self.assertEqual(response_b.json()["summary"]["total"], 0)

    def test_hod_section_access_requires_approved_grant(self):
        self.client.force_authenticate(user=self.hod)
        denied = self.client.get("/api/reports/attendance/", {"section": "A"})
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        AccessGrant.objects.create(
            holder_user=self.hod,
            holder_faculty=None,
            department_class=self.class_a,
            access_type=AccessGrant.AccessType.HOD,
            record_types=["VIEW_RECORDS"],
            granted_by=self.hod,
            is_active=True,
            expires_at=timezone.now() + timedelta(days=30),
        )
        allowed = self.client.get("/api/reports/attendance/", {"section": "A"})
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)
        self.assertEqual(allowed.json()["summary"]["total"], 1)
