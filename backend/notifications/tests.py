from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from notifications import email_service as email_service_module
from notifications.email_service import send_access_decision_email, send_access_request_email, send_email


class GmailEmailServiceTests(APITestCase):
    def test_send_email_returns_not_configured_when_oauth_missing(self):
        with override_settings(
            GOOGLE_OAUTH_CLIENT_ID="",
            GOOGLE_OAUTH_CLIENT_SECRET="",
            GOOGLE_OAUTH_REFRESH_TOKEN="",
        ):
            result = send_email(to_email="hod@cdgi.local", subject="Test", body="Body")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "GMAIL_NOT_CONFIGURED")

    def test_send_email_success(self):
        service = MagicMock()
        send_action = service.users().messages().send
        send_action.return_value.execute.return_value = {"id": "msg-123"}
        with patch.object(email_service_module, "get_gmail_service", return_value=service):
            result = send_email(to_email="hod@cdgi.local", subject="Test", body="Body")
        self.assertTrue(result["success"])
        self.assertEqual(result["message_id"], "msg-123")
        send_action.assert_called_once()

    def test_send_email_handles_exception(self):
        service = MagicMock()
        service.users().messages().send().execute.side_effect = RuntimeError("gmail down")
        with patch.object(email_service_module, "get_gmail_service", return_value=service):
            result = send_email(to_email="hod@cdgi.local", subject="Test", body="Body")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "EMAIL_SEND_FAILED")

    def test_access_request_email_content(self):
        with patch.object(email_service_module, "send_email") as send_mock:
            result = send_access_request_email(
                hod_email="hod@cdgi.local",
                hod_name="Demo HOD",
                department_class_label="CSIT 3 Year Sem 5 Section A",
                requested_record_types=["ATTENDANCE", "ACADEMIC_RECORDS"],
                reason="Final attendance review",
                access_duration_days=30,
            )
        self.assertTrue(result["success"])
        send_mock.assert_called_once()
        kwargs = send_mock.call_args.kwargs
        self.assertEqual(kwargs["to_email"], "hod@cdgi.local")
        self.assertIn("CSIT 3 Year Sem 5 Section A", kwargs["subject"])
        self.assertIn("Final attendance review", kwargs["body"])

    def test_access_decision_email_content(self):
        with patch.object(email_service_module, "send_email") as send_mock:
            result = send_access_decision_email(
                recipient_email="hod@cdgi.local",
                approved=True,
                department_class_label="CSIT 3 Year Sem 5 Section A",
                decided_by="Demo Coordinator",
            )
        self.assertTrue(result["success"])
        send_mock.assert_called_once()
        kwargs = send_mock.call_args.kwargs
        self.assertEqual(kwargs["subject"], "[ODRMS] Access Request APPROVED — CSIT 3 Year Sem 5 Section A")
        self.assertIn("APPROVED", kwargs["subject"])


class GoogleOAuthEndpointTests(APITestCase):
    def test_authorize_returns_google_auth_url(self):
        response = self.client.get("/api/auth/google/authorize/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["auth_url"].startswith("https://accounts.google.com"))
        self.assertTrue(response.data["state"])

    def test_callback_missing_code_returns_400(self):
        response = self.client.get("/api/auth/google/callback/")
        self.assertEqual(response.status_code, 400)

    def test_callback_success_stores_refresh_token(self):
        token_response = MagicMock()
        token_response.raise_for_status.return_value = None
        token_response.json.return_value = {
            "refresh_token": "mock-refresh-token",
            "token_uri": "https://oauth2.googleapis.com/token",
            "scope": "https://www.googleapis.com/auth/gmail.send",
        }
        with patch("accounts.views.requests_lib.post", return_value=token_response) as post_mock:
            response = self.client.get("/api/auth/google/callback/", {"code": "auth-code", "state": "st"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        post_mock.assert_called_once()
        stored = cache.get("odrms_google_oauth_tokens")
        self.assertIsNotNone(stored)
        self.assertIn("mock-refresh-token", stored)
