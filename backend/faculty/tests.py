from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from faculty.models import FacultyProfile


class FacultyOnboardingTestCase(APITestCase):
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
        self.faculty = FacultyProfile.objects.create(
            user=self.faculty_user,
            employee_id="CSIT001",
            full_name="Anita Sharma",
            email="faculty@cdgi.edu.in",
            designation="Assistant Professor",
            contact_number="9876543210",
            assigned_sections=["A"],
            profile_status=FacultyProfile.ProfileStatus.INCOMPLETE,
        )

    def auth(self, user, password, designation=None):
        payload = {"email": user.email, "password": password}
        if designation is not None:
            payload["designation"] = designation
        response = self.client.post("/api/auth/login/", payload, format="json")
        if response.status_code != status.HTTP_200_OK:
            return response
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return response

    def test_faculty_login_designation_mismatch_is_rejected(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": "faculty@cdgi.edu.in",
                "password": "FacPass123!",
                "designation": "Professor",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("designation", str(response.data))

    def test_faculty_login_designation_match_returns_incomplete_status(self):
        response = self.auth(self.faculty_user, "FacPass123!", designation="Assistant Professor")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["profile_status"], FacultyProfile.ProfileStatus.INCOMPLETE)
        self.assertEqual(response.data["user"]["designation"], "Assistant Professor")
        self.assertEqual(response.data["user"]["employee_id"], "CSIT001")

    def test_faculty_login_without_designation_allowed_for_backward_compat(self):
        response = self.auth(self.faculty_user, "FacPass123!")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["profile_status"], FacultyProfile.ProfileStatus.INCOMPLETE)

    def test_faculty_submit_profile_marks_submitted(self):
        self.auth(self.faculty_user, "FacPass123!")
        response = self.client.patch(
            f"/api/faculty/{self.faculty.id}/",
            {
                "qualifications": "M.Tech in Computer Science",
                "specialization": "Distributed Systems",
                "date_of_joining": "2020-06-15",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.faculty.refresh_from_db()
        self.assertEqual(self.faculty.profile_status, FacultyProfile.ProfileStatus.SUBMITTED)
        self.assertEqual(self.faculty.qualifications, "M.Tech in Computer Science")
        self.faculty_user.refresh_from_db()
        self.assertTrue(self.faculty_user.is_active)

    def test_faculty_cannot_change_designation_or_college_id(self):
        self.auth(self.faculty_user, "FacPass123!")
        response = self.client.patch(
            f"/api/faculty/{self.faculty.id}/",
            {
                "designation": "Professor",
                "employee_id": "CSIT999",
                "account_status": FacultyProfile.AccountStatus.INACTIVE,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resubmission_after_changes_requested_flips_to_submitted(self):
        # HOD sends a CHANGES_REQUESTED review; the faculty then edits their
        # onboarding details again — the profile must return to SUBMITTED so it
        # reappears in the HOD review queue.
        self.faculty.profile_status = FacultyProfile.ProfileStatus.CHANGES_REQUESTED
        self.faculty.save(update_fields=["profile_status", "updated_at"])
        self.auth(self.faculty_user, "FacPass123!")
        response = self.client.patch(
            f"/api/faculty/{self.faculty.id}/",
            {"qualifications": "Ph.D. in Computer Science", "specialization": "Networks"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.faculty.refresh_from_db()
        self.assertEqual(self.faculty.profile_status, FacultyProfile.ProfileStatus.SUBMITTED)

    def test_hod_reviews_faculty_profile_verification(self):
        self.faculty.profile_status = FacultyProfile.ProfileStatus.SUBMITTED
        self.faculty.save()

        response = self.auth(self.hod, "HodPass123!")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review = self.client.post(
            f"/api/faculty/{self.faculty.id}/review/",
            {"action": "VERIFY"},
            format="json",
        )
        self.assertEqual(review.status_code, status.HTTP_200_OK)
        self.faculty.refresh_from_db()
        self.assertEqual(self.faculty.profile_status, FacultyProfile.ProfileStatus.VERIFIED)

    def test_hod_reviews_faculty_profile_changes_requested(self):
        self.faculty.profile_status = FacultyProfile.ProfileStatus.SUBMITTED
        self.faculty.save()

        response = self.auth(self.hod, "HodPass123!")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review = self.client.post(
            f"/api/faculty/{self.faculty.id}/review/",
            {"action": "CHANGES_REQUESTED"},
            format="json",
        )
        self.assertEqual(review.status_code, status.HTTP_200_OK)
        self.faculty.refresh_from_db()
        self.assertEqual(self.faculty.profile_status, FacultyProfile.ProfileStatus.CHANGES_REQUESTED)

    def test_faculty_cannot_review_own_profile(self):
        self.auth(self.faculty_user, "FacPass123!")
        response = self.client.post(
            f"/api/faculty/{self.faculty.id}/review/",
            {"action": "VERIFY"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
