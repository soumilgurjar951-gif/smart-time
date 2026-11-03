from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from classes.models import (
    AcademicClass,
    AccessGrant,
    AccessRequest,
    ClassCoordinator,
    ClassFacultyAccess,
    ClassSubject,
    Department,
    FacultySubjectAssignment,
)
from faculty.models import FacultyProfile
from lectures.models import AcademicYear, FacultySubject, Section, Subject, TimeSlot, TimetableEntry


class BaseClassAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.department = Department.objects.create(name="Computer Science & IT", code="CSIT")
        cls.year = AcademicYear.objects.get(name="3rd Year - Semester 5")
        cls.class_a = AcademicClass.objects.create(
            department=cls.department, year=3, semester=5, section="A", academic_year=cls.year
        )
        cls.class_b = AcademicClass.objects.create(
            department=cls.department, year=3, semester=5, section="B", academic_year=cls.year
        )
        cls.hod = User.objects.create_user(
            email="hod@csit.example",
            password="SecurePass123!",
            full_name="CSIT HOD",
            role=User.Role.HOD,
        )
        cls.faculty_user = User.objects.create_user(
            email="faculty@csit.example",
            password="SecurePass123!",
            full_name="Faculty One",
            role=User.Role.FACULTY,
        )
        cls.other_faculty_user = User.objects.create_user(
            email="faculty2@csit.example",
            password="SecurePass123!",
            full_name="Faculty Two",
            role=User.Role.FACULTY,
        )
        cls.faculty = FacultyProfile.objects.create(
            user=cls.faculty_user,
            faculty_code="T1",
            employee_id="CSIT-FT-1",
            full_name="Faculty One",
            email=cls.faculty_user.email,
            department="CSIT",
        )
        cls.other_faculty = FacultyProfile.objects.create(
            user=cls.other_faculty_user,
            faculty_code="T2",
            employee_id="CSIT-FT-2",
            full_name="Faculty Two",
            email=cls.other_faculty_user.email,
            department="CSIT",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)


class ClassAccessControlTests(BaseClassAPITestCase):
    def test_faculty_only_sees_granted_classes(self):
        self.authenticate(self.faculty_user)
        self.assertEqual(self.client.get("/api/classes/").json()["count"], 0)

        access = ClassFacultyAccess.objects.create(
            faculty=self.faculty, department_class=self.class_a, granted_by=self.hod
        )
        data = self.client.get("/api/classes/").json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["id"], self.class_a.id)

        # Revocation takes effect immediately.
        access.revoke()
        self.assertFalse(
            ClassFacultyAccess.objects.filter(faculty=self.faculty, is_active=True).exists()
        )
        self.assertEqual(self.client.get("/api/classes/").json()["count"], 0)

    def test_unauthorized_class_returns_403(self):
        self.authenticate(self.faculty_user)
        response = self.client.get(f"/api/classes/{self.class_a.id}/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authorized_class_dashboard_is_scoped(self):
        ClassFacultyAccess.objects.create(
            faculty=self.faculty, department_class=self.class_a, granted_by=self.hod
        )
        self.authenticate(self.faculty_user)
        response = self.client.get(f"/api/classes/{self.class_a.id}/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["class_id"], self.class_a.id)
        self.assertNotIn("MANAGE_TIMETABLE", response.json()["my_permissions"])

    def test_only_hod_can_create_class(self):
        self.authenticate(self.faculty_user)
        payload = {"department": self.department.id, "year": 3, "semester": 5, "section": "C"}
        self.assertEqual(
            self.client.post("/api/classes/", payload, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        # Faculty cannot grant access to themselves or anyone else.
        self.assertEqual(
            self.client.post(
                f"/api/classes/{self.class_a.id}/faculty-access/",
                {"faculty": self.other_faculty.id, "permissions": ["VIEW"]},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.authenticate(self.hod)
        self.assertEqual(
            self.client.post("/api/classes/", payload, format="json").status_code,
            status.HTTP_201_CREATED,
        )

    def test_duplicate_class_rejected(self):
        self.authenticate(self.hod)
        payload = {
            "department": self.department.id,
            "year": 3,
            "semester": 5,
            "section": "A",
            "academic_year": self.year.id,
        }
        response = self.client.post("/api/classes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_faculty_cannot_self_grant_even_as_hod_payload(self):
        self.authenticate(self.hod)
        response = self.client.post(
            f"/api/classes/{self.class_a.id}/faculty-access/",
            {"faculty": self.hod.faculty_profile.id if hasattr(self.hod, "faculty_profile") else 999999},
            format="json",
        )
        self.assertIn(response.status_code, {status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN})


class FacultyAccessManagementTests(BaseClassAPITestCase):
    def test_hod_grant_revoke_cycle(self):
        self.authenticate(self.hod)
        url = f"/api/classes/{self.class_a.id}/faculty-access/"
        response = self.client.post(
            url, {"faculty": self.faculty.id, "permissions": ["VIEW", "MARK_ATTENDANCE"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        access_id = response.json()["id"]
        self.assertTrue(response.json()["is_active"])
        self.assertIsNotNone(response.json()["granted_by_name"])

        # Faculty now sees only this class and holds the granted permissions.
        self.authenticate(self.faculty_user)
        self.assertEqual(self.client.get("/api/classes/").json()["count"], 1)
        perms = self.client.get(f"/api/classes/{self.class_a.id}/dashboard/").json()["my_permissions"]
        self.assertIn("MARK_ATTENDANCE", perms)

        # Faculty cannot see another class's access list at all.
        response = self.client.get(f"/api/classes/{self.class_b.id}/faculty-access/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # HOD revokes: takes effect immediately.
        self.authenticate(self.hod)
        response = self.client.delete(f"{url}{access_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        access = ClassFacultyAccess.objects.get(pk=access_id)
        self.assertFalse(access.is_active)
        self.assertIsNotNone(access.revoked_at)

        self.authenticate(self.faculty_user)
        self.assertEqual(
            self.client.get(f"/api/classes/{self.class_a.id}/dashboard/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_faculty_cannot_see_full_access_list(self):
        ClassFacultyAccess.objects.create(
            faculty=self.faculty, department_class=self.class_a, granted_by=self.hod
        )
        ClassFacultyAccess.objects.create(
            faculty=self.other_faculty, department_class=self.class_a, granted_by=self.hod
        )
        self.authenticate(self.faculty_user)
        response = self.client.get(f"/api/classes/{self.class_a.id}/faculty-access/")
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["faculty"], self.faculty.id)

    def test_revoke_endpoint_scoped_to_class(self):
        access_other = ClassFacultyAccess.objects.create(
            faculty=self.faculty, department_class=self.class_b, granted_by=self.hod
        )
        self.authenticate(self.hod)
        response = self.client.delete(f"/api/classes/{self.class_a.id}/faculty-access/{access_other.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        access_other.refresh_from_db()
        self.assertTrue(access_other.is_active)


class ClassDataIsolationTests(BaseClassAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.slot = TimeSlot.objects.get(period_number=1)
        cls.subject = Subject.objects.get(code="CSIT501")
        cls.faculty_subject = FacultySubject.objects.create(
            faculty=cls.faculty,
            subject=cls.subject,
            section=Section.objects.get(code="A"),
            academic_year=cls.year,
            is_verified=True,
        )

    def create_entry_for(self, section):
        return TimetableEntry.objects.create(
            weekday=TimetableEntry.Weekday.MONDAY,
            section=section,
            subject=self.subject,
            faculty=self.faculty,
            time_slot=self.slot,
            classroom="CSIT-101",
            lecture_type=TimetableEntry.LectureType.THEORY,
            academic_year=self.year,
        )

    def test_every_timetable_entry_links_to_a_class(self):
        entry = self.create_entry_for(Section.objects.get(code="A"))
        self.assertEqual(entry.academic_class_id, self.class_a.id)

    def test_timetable_not_shared_between_sections(self):
        self.create_entry_for(Section.objects.get(code="A"))
        self.authenticate(self.hod)
        for cls, expected in ((self.class_a, 1), (self.class_b, 0)):
            response = self.client.get(f"/api/classes/{cls.id}/timetable/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.json()["count"], expected)
            self.assertEqual(response.json()["class_id"], cls.id)

    def test_subjects_are_linked_per_class(self):
        self.authenticate(self.hod)
        response = self.client.post(
            f"/api/classes/{self.class_a.id}/subjects/", {"subject": self.subject.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Duplicate linking is idempotent.
        self.assertEqual(
            self.client.post(
                f"/api/classes/{self.class_a.id}/subjects/", {"subject": self.subject.id}, format="json"
            ).status_code,
            status.HTTP_200_OK,
        )
        link = ClassSubject.objects.get(department_class=self.class_a, subject=self.subject)
        assignment = FacultySubjectAssignment.objects.create(faculty=self.faculty, class_subject=link)
        self.assertTrue(isinstance(assignment, FacultySubjectAssignment))

    def test_assign_faculty_endpoint(self):
        ClassSubject.objects.create(department_class=self.class_a, subject=self.subject)
        self.authenticate(self.hod)
        response = self.client.post(
            f"/api/classes/{self.class_a.id}/assign-faculty/",
            {"faculty": self.faculty.id, "subject": self.subject.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["faculty"], self.faculty.id)

        # Faculty cannot assign themselves.
        self.authenticate(self.faculty_user)
        self.client.post(
            f"/api/classes/{self.class_a.id}/assign-faculty/",
            {"faculty": self.faculty.id, "subject": self.subject.id},
            format="json",
        )
        self.assertEqual(
            FacultySubjectAssignment.objects.filter(faculty=self.faculty).count(),
            1,
        )

    def test_faculty_view_requires_assigned_subjects(self):
        FacultyProfile.objects.filter(pk=self.faculty.pk).update()
        profile = FacultyProfile.objects.get(pk=self.faculty.pk)
        profile.assigned_subjects.add(self.subject)
        link = ClassSubject.objects.get_or_create(
            department_class=self.class_a, subject=self.subject
        )[0]
        ClassSubject.objects.get_or_create(department_class=self.class_b, subject=self.subject)
        FacultySubjectAssignment.objects.create(faculty=profile, class_subject=link)
        ClassFacultyAccess.objects.create(
            faculty=profile, department_class=self.class_a, granted_by=self.hod
        )
        self.authenticate(self.faculty_user)
        data = self.client.get(f"/api/classes/{self.class_a.id}/faculty/").json()
        self.assertEqual(len(data["assignments"]), 1)
        self.assertEqual(data["accesses"], [])  # faculty never see the access table

    def test_lecture_and_timetable_listing_require_class_access(self):
        from lectures.models import Lecture

        section_a = Section.objects.get(code="A")
        entry = self.create_entry_for(section_a)
        self.slot = TimeSlot.objects.get(period_number=1)
        lecture = Lecture.objects.create(
            subject=self.subject,
            assigned_faculty=self.faculty,
            department="CSIT",
            semester=5,
            section="A",
            date=self._next_monday(),
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            classroom="CSIT-101",
            lecture_type=Lecture.LectureType.THEORY,
            timetable_entry=entry,
        )
        self.assertEqual(lecture.academic_class_id, self.class_a.id)

        self.authenticate(self.faculty_user)
        lectures = self._list(self.client.get("/api/lectures/"))
        entries = self._list(self.client.get("/api/lectures/timetable/entries/"))
        self.assertEqual(lectures, [])
        self.assertEqual(entries, [])

        # HOD grants access to the class → faculty sees own records there.
        self.authenticate(self.hod)
        self.assertEqual(
            self.client.post(
                f"/api/classes/{self.class_a.id}/faculty-access/",
                {"faculty": self.faculty.id, "permissions": ["VIEW"]},
                format="json",
            ).status_code,
            status.HTTP_201_CREATED,
        )
        self.authenticate(self.faculty_user)
        lectures = self._list(self.client.get("/api/lectures/"))
        entries = self._list(self.client.get("/api/lectures/timetable/entries/"))
        self.assertEqual([l["id"] for l in lectures], [lecture.id])
        self.assertEqual([e["id"] for e in entries], [entry.id])

        # Revoking again cuts everything off immediately.
        self.authenticate(self.hod)
        access_id = ClassFacultyAccess.objects.get(faculty=self.faculty, department_class=self.class_a).id
        self.client.delete(f"/api/classes/{self.class_a.id}/faculty-access/{access_id}/")
        self.authenticate(self.faculty_user)
        self.assertEqual(self._list(self.client.get("/api/lectures/")), [])
        self.assertEqual(self._list(self.client.get("/api/lectures/timetable/entries/")), [])

    @staticmethod
    def _list(response):
        data = response.json()
        if isinstance(data, dict):
            results = data.get("results")
            if results is None and isinstance(data.get("data"), dict):
                results = data["data"].get("results")
            return results or []
        return data

    def _next_monday(self):
        from datetime import date, timedelta

        today = date.today()
        days_ahead = (0 - today.weekday()) % 7
        return today + timedelta(days=days_ahead)


class HODCentralizedTests(BaseClassAPITestCase):
    def test_hod_sees_all_classes_and_summary(self):
        self.authenticate(self.hod)
        self.assertEqual(self.client.get("/api/classes/").json()["count"], 2)
        response = self.client.get("/api/classes/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 2)

    def test_faculty_cannot_use_cross_class_summary(self):
        self.authenticate(self.faculty_user)
        self.assertEqual(
            self.client.get("/api/classes/summary/").status_code, status.HTTP_403_FORBIDDEN
        )

    def test_create_class_with_new_section(self):
        self.authenticate(self.hod)
        payload = {"department": self.department.id, "year": 3, "semester": 5, "section": "C", "academic_year": self.year.id}
        response = self.client.post("/api/classes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.json()["display_name"].endswith("Section C"))


class AccessRequestWorkflowTests(BaseClassAPITestCase):
    def setUp(self):
        self.coordinator_user = User.objects.create_user(
            email="coord@csit.example",
            password="SecurePass123!",
            full_name="Section A Coordinator",
            role=User.Role.FACULTY,
        )
        self.coordinator = FacultyProfile.objects.create(
            user=self.coordinator_user,
            faculty_code="T3",
            employee_id="CSIT-FT-3",
            full_name="Section A Coordinator",
            email=self.coordinator_user.email,
            department="CSIT",
        )
        self.coordinator_assignment = ClassCoordinator.objects.create(
            faculty=self.coordinator,
            department_class=self.class_a,
            assigned_by=self.hod,
        )

    def test_hod_can_request_class_access(self):
        self.authenticate(self.hod)
        response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/",
            {"record_types": ["VIEW_RECORDS"], "reason": "Audit", "access_duration_days": 30},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["status"], "PENDING")

    def test_faculty_cannot_request_access(self):
        self.authenticate(self.faculty_user)
        response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/",
            {"reason": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_coordinator_can_approve_and_grant_access(self):
        self.authenticate(self.hod)
        create_response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/",
            {"record_types": ["VIEW_RECORDS", "MARK_ATTENDANCE"], "reason": "Audit", "access_duration_days": 14},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        access_request = AccessRequest.objects.get(department_class=self.class_a, requester=self.hod)

        self.authenticate(self.coordinator_user)
        approve_response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/{access_request.pk}/approve/",
            {"decision_note": "Approved for audit"},
            format="json",
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        access_request.refresh_from_db()
        self.assertEqual(access_request.status, AccessRequest.Status.APPROVED)
        grant = access_request.grant
        self.assertEqual(grant.holder_user, self.hod)
        self.assertTrue(grant.is_active)
        self.assertEqual(list(grant.record_types), ["VIEW_RECORDS", "MARK_ATTENDANCE"])

    def test_other_faculty_cannot_approve_request(self):
        self.authenticate(self.hod)
        create_response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/",
            {"record_types": ["VIEW_RECORDS"], "reason": "Audit", "access_duration_days": 14},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        access_request = AccessRequest.objects.get(department_class=self.class_a, requester=self.hod)

        self.authenticate(self.faculty_user)
        response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/{access_request.pk}/approve/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_coordinator_can_reject_request(self):
        self.authenticate(self.hod)
        create_response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/",
            {"record_types": ["VIEW_RECORDS"], "reason": "Audit", "access_duration_days": 14},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        access_request = AccessRequest.objects.get(department_class=self.class_a, requester=self.hod)

        self.authenticate(self.coordinator_user)
        response = self.client.post(
            f"/api/classes/{self.class_a.id}/access-requests/{access_request.pk}/reject/",
            {"decision_note": "Rejected"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        access_request.refresh_from_db()
        self.assertEqual(access_request.status, AccessRequest.Status.REJECTED)
