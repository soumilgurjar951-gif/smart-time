from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from attendance.models import AttendanceRoster
from faculty.models import FacultyProfile
from lectures.models import (
    AcademicYear,
    FacultySubject,
    Section,
    Subject,
    TimeSlot,
    TimetableHistory,
)
from notifications.models import Notification


class TimetableApiTests(APITestCase):
    def setUp(self):
        self.hod = User.objects.create_user(
            email="hod@csit.example",
            password="SecurePass123!",
            full_name="CSIT HOD",
            role=User.Role.HOD,
        )
        self.faculty_user = User.objects.create_user(
            email="faculty@csit.example",
            password="SecurePass123!",
            full_name="Faculty One",
            role=User.Role.FACULTY,
        )
        self.faculty = FacultyProfile.objects.create(
            user=self.faculty_user,
            faculty_code="TST",
            employee_id="CSIT-TEST-1",
            full_name="Faculty One",
            email=self.faculty_user.email,
            designation="Assistant Professor",
            department="CSIT",
            assigned_sections=["A", "B"],
            profile_status=FacultyProfile.ProfileStatus.VERIFIED,
        )
        self.sections = {section.code: section for section in Section.objects.all()}
        self.subject = Subject.objects.get(code="CSIT501")
        self.year = AcademicYear.objects.get(name="3rd Year - Semester 5")
        self.slot = TimeSlot.objects.get(period_number=1)
        self.second_slot = TimeSlot.objects.get(period_number=2)
        self.assignment = FacultySubject.objects.create(
            faculty=self.faculty,
            subject=self.subject,
            section=self.sections["A"],
            academic_year=self.year,
            is_verified=True,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def create_entry(self, **overrides):
        payload = {
            "weekday": "MONDAY",
            "section": self.sections["A"].id,
            "subject": self.subject.id,
            "faculty": self.faculty.id,
            "time_slot": self.slot.id,
            "classroom": "CSIT-101",
            "lecture_type": "THEORY",
            "topic": "Network layers",
            "academic_year": self.year.id,
        }
        payload.update(overrides)
        return self.client.post("/api/lectures/timetable/entries/", payload, format="json")

    def test_reference_data_has_supplied_slots_subjects_and_no_weekly_schedule(self):
        self.assertEqual(TimeSlot.objects.count(), 9)
        self.assertEqual(
            list(TimeSlot.objects.filter(is_break=False).values_list("period_number", flat=True)),
            list(range(1, 9)),
        )
        lunch = TimeSlot.objects.get(is_break=True)
        self.assertEqual((lunch.start_time.isoformat(), lunch.end_time.isoformat()), ("12:20:00", "13:00:00"))
        self.assertEqual(Subject.objects.filter(is_active=True).count(), 10)
        self.assertFalse(self.subject.timetable_entries.exists())
        self.assertTrue(
            FacultyProfile.objects.filter(faculty_code="SC", full_name="", email__isnull=True).exists()
        )
        self.assertTrue(
            FacultySubject.objects.filter(
                subject__code="CRT",
                section__code="B",
                faculty__full_name="Mr. Sheel Pandey",
                is_verified=False,
            ).exists()
        )

    def test_hod_can_create_entry_history_notification_and_occurrence_attendance(self):
        self.authenticate(self.hod)
        response = self.create_entry()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        entry_id = response.data["id"]
        self.assertEqual(TimetableHistory.objects.filter(entry_id=entry_id).count(), 1)
        self.assertTrue(Notification.objects.filter(recipient=self.faculty_user).exists())

        weekly = self.client.get("/api/lectures/timetable/entries/weekly/?section=A")
        self.assertEqual(weekly.status_code, status.HTTP_200_OK)
        self.assertEqual(weekly.data["count"], 1)
        daily = self.client.get("/api/lectures/timetable/entries/daily/?weekday=MONDAY&section=A")
        self.assertEqual(len(daily.data), 1)

        self.authenticate(self.faculty_user)
        occurrence = self.client.post(
            f"/api/lectures/timetable/entries/{entry_id}/occurrence/",
            {"date": "2026-11-02"},
            format="json",
        )
        self.assertEqual(occurrence.status_code, status.HTTP_201_CREATED, occurrence.data)
        roster = AttendanceRoster.objects.create(
            roll_number="CSIT-A-01",
            full_name="Roster Student",
            section="A",
        )
        attendance = self.client.post(
            "/api/attendance/bulk/",
            {
                "lecture": occurrence.data["id"],
                "entries": [{"roster": roster.id, "status": "PRESENT"}],
            },
            format="json",
        )
        self.assertEqual(attendance.status_code, status.HTTP_200_OK, attendance.data)

    def test_faculty_cannot_change_an_entry_and_only_sees_own_schedule(self):
        self.authenticate(self.hod)
        created = self.create_entry()
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)

        other_user = User.objects.create_user(
            email="other@csit.example",
            password="SecurePass123!",
            full_name="Other Faculty",
            role=User.Role.FACULTY,
        )
        other = FacultyProfile.objects.create(
            user=other_user,
            faculty_code="OTH",
            employee_id="CSIT-TEST-2",
            full_name="Other Faculty",
            email=other_user.email,
            designation="Assistant Professor",
            profile_status=FacultyProfile.ProfileStatus.VERIFIED,
        )
        FacultySubject.objects.create(
            faculty=other,
            subject=self.subject,
            section=self.sections["B"],
            academic_year=self.year,
            is_verified=True,
        )
        other_entry = self.create_entry(
            section=self.sections["B"].id,
            faculty=other.id,
            classroom="CSIT-102",
        )
        self.assertEqual(other_entry.status_code, status.HTTP_201_CREATED, other_entry.data)

        self.authenticate(self.faculty_user)
        listing = self.client.get("/api/lectures/timetable/entries/")
        self.assertEqual(listing.data["count"], 1)
        denied = self.client.patch(
            f"/api/lectures/timetable/entries/{created.data['id']}/",
            {"topic": "Changed by faculty"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_conflicting_faculty_and_room_assignments_are_rejected(self):
        self.authenticate(self.hod)
        first = self.create_entry()
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)

        FacultySubject.objects.create(
            faculty=self.faculty,
            subject=self.subject,
            section=self.sections["B"],
            academic_year=self.year,
            is_verified=True,
        )
        faculty_conflict = self.create_entry(
            section=self.sections["B"].id,
            classroom="CSIT-102",
        )
        self.assertEqual(faculty_conflict.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("faculty", faculty_conflict.data["error"]["details"])

        second_user = User.objects.create_user(
            email="second@csit.example",
            password="SecurePass123!",
            full_name="Second Faculty",
            role=User.Role.FACULTY,
        )
        second = FacultyProfile.objects.create(
            user=second_user,
            faculty_code="SEC",
            employee_id="CSIT-TEST-3",
            full_name="Second Faculty",
            email=second_user.email,
            designation="Assistant Professor",
        )
        FacultySubject.objects.create(
            faculty=second,
            subject=self.subject,
            section=self.sections["B"],
            academic_year=self.year,
            is_verified=True,
        )
        room_conflict = self.create_entry(
            section=self.sections["B"].id,
            faculty=second.id,
            classroom="CSIT-101",
        )
        self.assertEqual(room_conflict.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("classroom", room_conflict.data["error"]["details"])

    def test_unverified_initial_assignment_cannot_be_scheduled_or_verified(self):
        placeholder = FacultyProfile.objects.get(faculty_code="SC")
        mapping = FacultySubject.objects.get(faculty=placeholder, subject__code="CSIT501")
        self.authenticate(self.hod)

        response = self.create_entry(faculty=placeholder.id)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        verify = self.client.patch(
            f"/api/lectures/faculty-subjects/{mapping.id}/",
            {"is_verified": True},
            format="json",
        )
        self.assertEqual(verify.status_code, status.HTTP_400_BAD_REQUEST)
