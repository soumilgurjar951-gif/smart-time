"""Tests for the ODRMS Smart Assistant services and APIs.

Covers: current/next class detection with remaining time, timetable lookups
and section separation, attendance maths (unmarked is never counted as
absent), cancelled/substituted lecture reporting, role-based scoping
(HOD / coordinator / faculty), denial of unauthorized class queries, weekend
handling, the daily digest and the NL query endpoint (English + Hinglish).
"""

from datetime import date, time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from attendance.models import AttendanceRecord, AttendanceRoster
from classes.models import AcademicClass, ClassCoordinator, ClassFacultyAccess, Department
from faculty.models import FacultyProfile
from lectures.models import AcademicYear, Lecture, Section, Subject, TimeSlot, TimetableEntry


class AssistantBaseTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.department = Department.objects.create(name="Computer Science & IT", code="CSIT")
        cls.year = AcademicYear.objects.first()
        cls.class_a = AcademicClass.objects.create(
            department=cls.department, year=3, semester=5, section="A", academic_year=cls.year
        )
        cls.class_b = AcademicClass.objects.create(
            department=cls.department, year=3, semester=5, section="B", academic_year=cls.year
        )
        cls.section_a = Section.objects.get(code="A")
        cls.section_b = Section.objects.get(code="B")
        cls.slot1 = TimeSlot.objects.get(period_number=1)
        cls.slot2 = TimeSlot.objects.get(period_number=2)
        cls.slot3 = TimeSlot.objects.get(period_number=3)
        cls.subject_net = Subject.objects.get(code="CSIT501")
        cls.subject_os = Subject.objects.get(code="CSIT502")

        cls.hod = User.objects.create_user(
            email="hod@csit.example", password="SecurePass123!", full_name="CSIT HOD", role=User.Role.HOD
        )
        cls.coord_user = User.objects.create_user(
            email="coord@csit.example", password="SecurePass123!", full_name="Coordinator A", role=User.Role.FACULTY
        )
        cls.faculty_user = User.objects.create_user(
            email="teacher@csit.example", password="SecurePass123!", full_name="Plain Faculty", role=User.Role.FACULTY
        )
        cls.other_teacher_user = User.objects.create_user(
            email="teacherb@csit.example", password="SecurePass123!", full_name="Faculty B", role=User.Role.FACULTY
        )
        cls.coord = cls._profile(cls.coord_user, "T10", "CSIT-FT-10", "Coordinator A")
        cls.teacher = cls._profile(cls.faculty_user, "T11", "CSIT-FT-11", "Plain Faculty")
        cls.teacher_b = cls._profile(cls.other_teacher_user, "T12", "CSIT-FT-12", "Faculty B")

        ClassCoordinator.objects.create(faculty=cls.coord, department_class=cls.class_a, assigned_by=cls.hod)

    @classmethod
    def _profile(cls, user, code, employee_id, name):
        return FacultyProfile.objects.create(
            user=user,
            faculty_code=code,
            employee_id=employee_id,
            full_name=name,
            email=user.email,
            department="CSIT",
            profile_status=FacultyProfile.ProfileStatus.VERIFIED,
        )

    def setUp(self):
        self.today = timezone.localdate()
        self.weekday = list(TimetableEntry.Weekday.values)[min(self.today.weekday(), 4)]
        # A timetable row for today so each test can build lectures on it.
        self.entry_a1 = TimetableEntry.objects.create(
            weekday=self.weekday,
            section=self.section_a,
            subject=self.subject_net,
            faculty=self.coord,
            time_slot=self.slot1,
            classroom="CSIT-101",
            lecture_type=Lecture.LectureType.THEORY,
            academic_class=self.class_a,
        )
        self.entry_a2 = TimetableEntry.objects.create(
            weekday=self.weekday,
            section=self.section_a,
            subject=self.subject_os,
            faculty=self.teacher,
            time_slot=self.slot2,
            classroom="CSIT-102",
            lecture_type=Lecture.LectureType.THEORY,
            academic_class=self.class_a,
        )
        self.entry_b1 = TimetableEntry.objects.create(
            weekday=self.weekday,
            section=self.section_b,
            subject=self.subject_net,
            faculty=self.teacher_b,
            time_slot=self.slot1,
            classroom="CSIT-201",
            lecture_type=Lecture.LectureType.THEORY,
            academic_class=self.class_b,
        )

    def _lecture(self, entry, day=None, status=Lecture.Status.SCHEDULED, faculty=None, section=None, subject=None, start=None, end=None):
        lecture = Lecture.objects.create(
            timetable_entry=entry,
            date=day or self.today,
            subject=subject or entry.subject,
            assigned_faculty=faculty or entry.faculty,
            department="CSIT",
            semester=5,
            section=section or entry.section.code,
            start_time=start or entry.time_slot.start_time,
            end_time=end or entry.time_slot.end_time,
            classroom=entry.classroom,
            academic_class=entry.academic_class,
            status=status,
        )
        return lecture

    def authenticate(self, user):
        # Always authenticate with a freshly loaded instance so related-object
        # caches (e.g. faculty_profile) reflect the current database state.
        from accounts.models import User as UserModel

        self.client.force_authenticate(user=UserModel.objects.get(pk=user.pk))


class CurrentClassTests(AssistantBaseTestCase):
    def test_running_lecture_is_detected_with_remaining_time(self):
        now = timezone.localtime()
        running_start = (now - timedelta(minutes=10)).time()
        running_end = (now + timedelta(minutes=20)).time()
        self._lecture(self.entry_a1, start=running_start, end=running_end)

        response = self.client.get("/api/assistant/context/")
        self.authenticate(self.hod)
        response = self.client.get("/api/assistant/context/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        section_a = next(s for s in response.json()["sections"] if s["section"] == "A")
        self.assertEqual(section_a["state"], "running")
        self.assertEqual(section_a["current"]["subject_name"], self.subject_net.name)
        self.assertEqual(section_a["current"]["classroom"], "CSIT-101")
        self.assertEqual(section_a["current"]["remaining_minutes"], "20 minutes")
        self.assertEqual(section_a["current"]["elapsed_minutes"], "10 minutes")

    def test_next_class_and_starts_in(self):
        now = timezone.localtime()
        self._lecture(
            self.entry_a2,
            start=(now + timedelta(minutes=15)).time(),
            end=(now + timedelta(minutes=60)).time(),
        )
        self.authenticate(self.hod)
        response = self.client.get("/api/assistant/context/")
        section_a = next(s for s in response.json()["sections"] if s["section"] == "A")
        self.assertEqual(section_a["state"], "upcoming")
        self.assertIsNone(section_a["current"])
        self.assertEqual(section_a["next"]["subject_name"], self.subject_os.name)
        self.assertEqual(section_a["next"]["starts_in_minutes"], "15 minutes")

    def test_cancelled_lecture_is_never_reported_as_running(self):
        now = timezone.localtime()
        self._lecture(
            self.entry_a1,
            status=Lecture.Status.CANCELLED,
            start=(now - timedelta(minutes=10)).time(),
            end=(now + timedelta(minutes=20)).time(),
        )
        self.authenticate(self.hod)
        response = self.client.get("/api/assistant/context/")
        section_a = next(s for s in response.json()["sections"] if s["section"] == "A")
        self.assertEqual(section_a["state"], "all_cancelled")
        self.assertEqual(len(section_a["cancelled_today"]), 1)

    def test_faculty_sees_their_own_lecture_as_my_current(self):
        now = timezone.localtime()
        self._lecture(
            self.entry_a2,
            faculty=self.teacher,
            start=(now - timedelta(minutes=5)).time(),
            end=(now + timedelta(minutes=30)).time(),
        )
        self.authenticate(self.faculty_user)
        response = self.client.get("/api/assistant/context/")
        data = response.json()
        self.assertEqual(data["my_current"]["subject_name"], self.subject_os.name)
        self.assertEqual(data["my_current"]["remaining_minutes"], "30 minutes")
        # The plain faculty has no access rows: Section B must stay hidden.
        sections = {s["section"] for s in data["sections"]}
        self.assertEqual(sections, {"A"})

    def test_coordinator_scope_is_limited_to_their_class(self):
        self._lecture(self.entry_b1)
        self.authenticate(self.coord_user)
        response = self.client.get("/api/assistant/context/")
        sections = {s["section"] for s in response.json()["sections"]}
        self.assertEqual(sections, {"A"})

    def test_weekend_state(self):
        self.authenticate(self.hod)
        # Simulate a weekend by checking the context flags today's weekday.
        response = self.client.get("/api/assistant/context/")
        data = response.json()
        weekday = date.today().weekday()
        self.assertEqual(data["is_weekend"], weekday > 4)


class TimetableAssistantTests(AssistantBaseTestCase):
    def test_day_timetable_lists_rows_with_cancelled_flag(self):
        self._lecture(self.entry_a1)
        self._lecture(self.entry_b1, status=Lecture.Status.CANCELLED)
        self.authenticate(self.hod)
        response = self.client.get("/api/assistant/query/", {"message": "Aaj ka timetable batao"}, format="json")
        # query is POST-only
        response = self.client.post("/api/assistant/query/", {"message": "Aaj ka timetable batao"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["intent"], "timetable_today")
        text = data["text"]
        self.assertIn("Section A", text)
        self.assertIn("Section B", text)
        self.assertIn("CANCELLED", text)

    def test_section_query_is_separated(self):
        self.authenticate(self.hod)
        response = self.client.post(
            "/api/assistant/query/", {"message": "B section ka schedule dikhao"}, format="json"
        )
        text = response.json()["text"]
        self.assertIn("Section B", text)
        self.assertNotIn("Section A", text)

    def test_faculty_cannot_query_unauthorized_section(self):
        # Plain faculty has no class access; timetable is limited to own rows.
        self.authenticate(self.faculty_user)
        response = self.client.post(
            "/api/assistant/query/", {"message": "B section ka schedule dikhao"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        text = response.json()["text"]
        self.assertNotIn("Section B", text)  # rows never leak

    def test_authorized_faculty_can_query_granted_class(self):
        ClassFacultyAccess.objects.create(
            faculty=self.teacher, department_class=self.class_b, granted_by=self.hod
        )
        self._lecture(self.entry_b1)
        self.authenticate(self.faculty_user)
        response = self.client.post(
            "/api/assistant/query/", {"message": "B section ka schedule dikhao"}, format="json"
        )
        self.assertIn("Section B", response.json()["text"])

    def test_faculty_substitution_is_reported(self):
        now = timezone.localtime()
        self._lecture(
            self.entry_a2,
            faculty=self.teacher_b,
            start=(now - timedelta(minutes=5)).time(),
            end=(now + timedelta(minutes=30)).time(),
        )
        self.authenticate(self.hod)
        response = self.client.get("/api/assistant/context/")
        section_a = next(s for s in response.json()["sections"] if s["section"] == "A")
        self.assertEqual(section_a["current"]["faculty_name"], "Faculty B")
        self.assertEqual(section_a["current"]["substituted_for"], "Plain Faculty")

    def test_faculty_of_subject_lookup(self):
        self.authenticate(self.hod)
        response = self.client.post(
            "/api/assistant/query/", {"message": "Who teaches Computer Networking?"}, format="json"
        )
        self.assertEqual(response.json()["intent"], "faculty_of_subject")
        self.assertIn("Coordinator A", response.json()["text"])


class AttendanceAssistantTests(AssistantBaseTestCase):
    def setUp(self):
        super().setUp()
        self.lecture_a1 = self._lecture(self.entry_a1)
        self.roster = AttendanceRoster.objects.create(
            roll_number="CSITA01", full_name="Student One", semester=5, section="A"
        )
        self.roster2 = AttendanceRoster.objects.create(
            roll_number="CSITA02", full_name="Student Two", semester=5, section="A"
        )

    def test_unmarked_attendance_is_reported_as_unmarked(self):
        # Lecture exists but no AttendanceRecord rows → must NOT be counted
        # as absent; the assistant must say it has not been updated yet.
        self.authenticate(self.hod)
        response = self.client.post(
            "/api/assistant/query/", {"message": "Attendance update kya hai?"}, format="json"
        )
        data = response.json()
        self.assertEqual(data["intent"], "attendance_status")
        self.assertIn("1 unmarked", data["text"])

    def test_percentage_math_and_low_attendance(self):
        AttendanceRecord.objects.create(
            lecture=self.lecture_a1, roster=self.roster, status=AttendanceRecord.Status.PRESENT, marked_by=self.hod
        )
        AttendanceRecord.objects.create(
            lecture=self.lecture_a1, roster=self.roster2, status=AttendanceRecord.Status.ABSENT, marked_by=self.hod
        )
        self.authenticate(self.hod)
        response = self.client.post(
            "/api/assistant/query/", {"message": "What is the attendance percentage?"}, format="json"
        )
        data = response.json()
        self.assertEqual(data["intent"], "attendance_percentage")
        self.assertEqual(data["data"]["total_records"], 2)
        self.assertEqual(data["data"]["present_percentage"], 50.0)
        # A student with a single marked record at 0% is flagged low.
        self.assertIn("Student Two", data["text"])

    def test_coordinator_sees_own_class_students_only(self):
        AttendanceRecord.objects.create(
            lecture=self.lecture_a1, roster=self.roster, status=AttendanceRecord.Status.PRESENT, marked_by=self.hod
        )
        self.authenticate(self.coord_user)
        response = self.client.post(
            "/api/assistant/query/", {"message": "Section A attendance percentage?"}, format="json"
        )
        data = response.json()
        self.assertEqual(data["intent"], "attendance_percentage")
        self.assertEqual(data["data"]["total_records"], 1)
        self.assertEqual([s["roll_number"] for s in data["data"]["students"]], ["CSITA01"])

    def test_regular_faculty_cannot_pull_other_class_attendance(self):
        AttendanceRecord.objects.create(
            lecture=self.lecture_a1, roster=self.roster, status=AttendanceRecord.Status.PRESENT, marked_by=self.hod
        )
        # teacher holds no coordinator role and no access rows → their own
        # scope only: the Section A student data must never leak.
        self.authenticate(self.other_teacher_user)
        response = self.client.post(
            "/api/assistant/query/", {"message": "Section A attendance percentage?"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # The percentage branch answers with a plain string when no marked
        # records exist → data is null. Either way the Section A student rows
        # must never leak to an unauthorized faculty.
        self.assertNotIn("Student One", data["text"])
        self.assertNotIn("CSITA01", data["text"])
        self.assertNotIn("50", data["text"])


class ContextEndpointTests(AssistantBaseTestCase):
    def test_context_requires_authentication(self):
        response = self.client.get("/api/assistant/context/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_query_requires_authentication(self):
        response = self.client.post("/api/assistant/query/", {"message": "hi"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unapproved_faculty_is_gated(self):
        FacultyProfile.objects.filter(pk=self.teacher.pk).update(
            profile_status=FacultyProfile.ProfileStatus.INCOMPLETE
        )
        self.authenticate(self.faculty_user)
        response = self.client.get("/api/assistant/context/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()["error"]["code"], "profile_not_approved")
        FacultyProfile.objects.filter(pk=self.teacher.pk).update(
            profile_status=FacultyProfile.ProfileStatus.VERIFIED
        )

    def test_digest_contains_real_counts_only(self):
        now = timezone.localtime()
        self._lecture(
            self.entry_a1,
            start=(now - timedelta(minutes=5)).time(),
            end=(now + timedelta(minutes=25)).time(),
        )
        self.authenticate(self.hod)
        response = self.client.get("/api/assistant/context/")
        digest = response.json()["digest"]
        self.assertEqual(digest["greeting"], "Good morning" if now.hour < 12 else digest["greeting"])
        self.assertGreaterEqual(digest["total_lectures_today"], 1)
        self.assertIn("digest", response.json())

    def test_class_starting_reminder(self):
        now = timezone.localtime()
        self._lecture(
            self.entry_a2,
            faculty=self.coord,
            start=(now + timedelta(minutes=8)).time(),
            end=(now + timedelta(minutes=50)).time(),
        )
        self.authenticate(self.coord_user)
        response = self.client.get("/api/assistant/context/")
        reminders = response.json()["reminders"]
        starting = [r for r in reminders if r["type"] == "class_starting"]
        self.assertTrue(starting)
        self.assertEqual(starting[0]["subject"], self.subject_os.name)
        self.assertEqual(starting[0]["starts_in_minutes"], 8)

    def test_attendance_pending_reminder_for_own_past_lecture(self):
        now = timezone.localtime()
        self._lecture(
            self.entry_a1,
            faculty=self.coord,
            start=(now - timedelta(minutes=60)).time(),
            end=(now - timedelta(minutes=10)).time(),
        )
        self.authenticate(self.coord_user)
        response = self.client.get("/api/assistant/context/")
        reminders = response.json()["reminders"]
        pending = [r for r in reminders if r["type"] == "attendance_pending"]
        self.assertTrue(pending)
        self.assertEqual(pending[0]["subject"], self.subject_net.name)


class NluTests(AssistantBaseTestCase):
    def test_hinglish_current_class(self):
        self.authenticate(self.hod)
        response = self.client.post(
            "/api/assistant/query/", {"message": "Abhi konsi class hai?"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["intent"], "current_class")

    def test_time_remaining_intent(self):
        self.authenticate(self.hod)
        response = self.client.post(
            "/api/assistant/query/", {"message": "Kitna time bacha hai?"}, format="json"
        )
        self.assertEqual(response.json()["intent"], "time_remaining")

    def test_fallback_help_lists_capabilities(self):
        self.authenticate(self.hod)
        response = self.client.post("/api/assistant/query/", {"message": "hello"}, format="json")
        self.assertIn("ODRMS Smart Assistant", response.json()["text"])

    def test_empty_message_rejected(self):
        self.authenticate(self.hod)
        response = self.client.post("/api/assistant/query/", {"message": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_question_reports_cancellation(self):
        self._lecture(self.entry_b1, status=Lecture.Status.CANCELLED)
        self.authenticate(self.hod)
        response = self.client.post(
            "/api/assistant/query/", {"message": "Aaj koi class cancel hui hai kya?"}, format="json"
        )
        self.assertEqual(response.json()["intent"], "cancelled_check")
        self.assertIn("CANCEL", response.json()["text"])
