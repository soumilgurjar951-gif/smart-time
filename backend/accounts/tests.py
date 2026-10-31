from datetime import date, time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from attendance.models import AttendanceRoster
from faculty.models import FacultyProfile
from lectures.models import Lecture, Subject
from resources.models import Resource


class ODRMSAPITestCase(APITestCase):
    def setUp(self):
        self.hod = User.objects.create_user(
            email="hod@cdgi.edu.in",
            password="HodPass123!",
            full_name="CSIT HOD",
            role=User.Role.HOD,
        )
        self.faculty_user = User.objects.create_user(
            email="faculty@cdgi.edu.in",
            password="FacPass123!",
            full_name="Anita Sharma",
            role=User.Role.FACULTY,
        )
        self.other_user = User.objects.create_user(
            email="other@cdgi.edu.in",
            password="FacPass123!",
            full_name="Rahul Verma",
            role=User.Role.FACULTY,
        )
        self.faculty = FacultyProfile.objects.create(
            user=self.faculty_user,
            employee_id="CSIT001",
            full_name="Anita Sharma",
            email="faculty@cdgi.edu.in",
            designation="Assistant Professor",
            contact_number="9876543210",
            assigned_sections=["A"],
        )
        self.other = FacultyProfile.objects.create(
            user=self.other_user,
            employee_id="CSIT002",
            full_name="Rahul Verma",
            email="other@cdgi.edu.in",
            designation="Assistant Professor",
            assigned_sections=["B"],
        )
        self.subject = Subject.objects.create(code="CS501", name="Computer Networks")

    def auth(self, user, password):
        response = self.client.post(
            "/api/auth/login/",
            {"email": user.email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return response.data

    def test_login_and_profile(self):
        tokens = self.auth(self.hod, "HodPass123!")
        self.assertIn("refresh", tokens)
        profile = self.client.get("/api/auth/profile/")
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data["role"], "HOD")

    def test_invalid_login_is_unauthorized(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "hod@cdgi.edu.in", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_faculty_cannot_list_other_faculty(self):
        self.auth(self.faculty_user, "FacPass123!")
        response = self.client.get("/api/faculty/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["employee_id"], "CSIT001")

    def test_faculty_cannot_create_faculty(self):
        self.auth(self.faculty_user, "FacPass123!")
        response = self.client.post(
            "/api/faculty/",
            {
                "employee_id": "CSIT003",
                "full_name": "New Person",
                "email": "new@cdgi.edu.in",
                "designation": "Lecturer",
                "password": "NewPass123!",
                "assigned_sections": ["A"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hod_creates_faculty(self):
        self.auth(self.hod, "HodPass123!")
        response = self.client.post(
            "/api/faculty/",
            {
                "employee_id": "CSIT003",
                "full_name": "New Person",
                "email": "new@cdgi.edu.in",
                "designation": "Lecturer",
                "password": "NewPass123!",
                "assigned_sections": ["A", "B"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="new@cdgi.edu.in", role=User.Role.FACULTY).exists())

    def test_lecture_overlap_rejected(self):
        self.auth(self.hod, "HodPass123!")
        payload = {
            "subject": self.subject.id,
            "assigned_faculty": self.faculty.id,
            "section": "A",
            "date": "2026-11-02",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "classroom": "CS-101",
            "lecture_type": "THEORY",
            "topic": "IP Addressing",
        }
        first = self.client.post("/api/lectures/", payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        payload["classroom"] = "CS-102"
        payload["start_time"] = "10:30:00"
        payload["end_time"] = "11:30:00"
        second = self.client.post("/api/lectures/", payload, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_faculty_sees_only_own_lectures(self):
        Lecture.objects.create(
            subject=self.subject,
            assigned_faculty=self.faculty,
            section="A",
            date=date(2026, 11, 2),
            start_time=time(9, 0),
            end_time=time(10, 0),
            classroom="CS-101",
        )
        Lecture.objects.create(
            subject=self.subject,
            assigned_faculty=self.other,
            section="B",
            date=date(2026, 11, 2),
            start_time=time(9, 0),
            end_time=time(10, 0),
            classroom="CS-201",
        )
        self.auth(self.faculty_user, "FacPass123!")
        response = self.client.get("/api/lectures/")
        self.assertEqual(response.data["count"], 1)

    def test_attendance_duplicate_and_permissions(self):
        lecture = Lecture.objects.create(
            subject=self.subject,
            assigned_faculty=self.faculty,
            section="A",
            date=date(2026, 11, 2),
            start_time=time(9, 0),
            end_time=time(10, 0),
            classroom="CS-101",
        )
        roster = AttendanceRoster.objects.create(
            roll_number="CSIT5A01",
            full_name="Student One",
            section="A",
        )
        self.auth(self.faculty_user, "FacPass123!")
        payload = {"lecture": lecture.id, "roster": roster.id, "status": "PRESENT"}
        first = self.client.post("/api/attendance/", payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        duplicate = self.client.post("/api/attendance/", payload, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

        self.auth(self.other_user, "FacPass123!")
        denied = self.client.post(
            "/api/attendance/",
            {"lecture": lecture.id, "roster": roster.id, "status": "ABSENT"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_task_update_and_achievement_review(self):
        self.auth(self.hod, "HodPass123!")
        task = self.client.post(
            "/api/tasks/",
            {
                "title": "Lab manual",
                "description": "Prepare CN lab manual",
                "assigned_faculty": self.faculty.id,
                "priority": "HIGH",
                "deadline": (timezone.localdate() + timedelta(days=7)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(task.status_code, status.HTTP_201_CREATED)
        task_id = task.data["id"]

        self.auth(self.faculty_user, "FacPass123!")
        update = self.client.post(
            f"/api/tasks/{task_id}/updates/",
            {"progress": 40, "notes": "Draft started"},
            format="json",
        )
        self.assertEqual(update.status_code, status.HTTP_201_CREATED)

        achievement = self.client.post(
            "/api/achievements/",
            {
                "title": "Best Paper",
                "category": "AWARD",
                "description": "Conference award",
                "date": "2026-01-15",
                "issuing_organization": "IEEE",
            },
            format="json",
        )
        self.assertEqual(achievement.status_code, status.HTTP_201_CREATED)

        review_denied = self.client.post(
            f"/api/achievements/{achievement.data['id']}/review/",
            {"verification_status": "APPROVED"},
            format="json",
        )
        self.assertEqual(review_denied.status_code, status.HTTP_403_FORBIDDEN)

        self.auth(self.hod, "HodPass123!")
        review = self.client.post(
            f"/api/achievements/{achievement.data['id']}/review/",
            {"verification_status": "APPROVED", "review_notes": "Verified"},
            format="json",
        )
        self.assertEqual(review.status_code, status.HTTP_200_OK)
        self.assertEqual(review.data["verification_status"], "APPROVED")

    def test_resource_booking_overlap(self):
        resource = Resource.objects.create(
            name="Seminar Hall 1",
            type=Resource.ResourceType.HALL,
            location="Block A",
            capacity=120,
        )
        self.auth(self.faculty_user, "FacPass123!")
        booking = self.client.post(
            "/api/resources/bookings/",
            {
                "resource": resource.id,
                "date": "2026-11-10",
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "purpose": "Workshop",
            },
            format="json",
        )
        self.assertEqual(booking.status_code, status.HTTP_201_CREATED)

        self.auth(self.hod, "HodPass123!")
        approved = self.client.post(
            f"/api/resources/bookings/{booking.data['id']}/review/",
            {"status": "APPROVED"},
            format="json",
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)

        other = self.client.post(
            "/api/resources/bookings/",
            {
                "resource": resource.id,
                "date": "2026-11-10",
                "start_time": "11:00:00",
                "end_time": "13:00:00",
                "purpose": "Meeting",
            },
            format="json",
        )
        self.assertEqual(other.status_code, status.HTTP_201_CREATED)
        conflict = self.client.post(
            f"/api/resources/bookings/{other.data['id']}/review/",
            {"status": "APPROVED"},
            format="json",
        )
        self.assertEqual(conflict.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reports_require_auth(self):
        response = self.client.get("/api/reports/tasks/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.auth(self.hod, "HodPass123!")
        ok = self.client.get("/api/reports/tasks/")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
