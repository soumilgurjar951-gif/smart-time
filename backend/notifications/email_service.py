"""Reusable Gmail API email service for ODRMS.

Sends transactional emails through the Gmail API v1 using an OAuth 2.0 refresh
token configured on the backend (never exposed to the frontend).

Supported events:
    - HOD access request submitted to a class coordinator
    - Access approval / rejection notifications
    - Access revocation alerts
    - Access expiration alerts

All credentials are read from Django settings (populated from backend/.env) and
are never sent to the client.
"""

from __future__ import annotations

import base64
import json
import logging
from email.message import EmailMessage
from typing import Any

from django.conf import settings
from django.core.cache import cache

from google.auth.transport.requests import Request as GoogleRequestTransport
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
TOKEN_CACHE_KEY = "odrms_google_oauth_tokens"
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30


def _get_stored_refresh_token() -> str:
    stored = cache.get(TOKEN_CACHE_KEY)
    token = None
    if isinstance(stored, (str, bytes, bytearray)):
        try:
            parsed = json.loads(stored)
            token = parsed.get("refresh_token") if isinstance(parsed, dict) else None
        except Exception:
            token = None
    elif isinstance(stored, dict):
        token = stored.get("refresh_token")
    return token or ""


def _get_oauth_credentials():
    """Build an OAuth 2.0 Credentials object from backend env + cached token."""
    refresh_token = getattr(settings, "GOOGLE_OAUTH_REFRESH_TOKEN", "") or _get_stored_refresh_token()
    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""
    client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "") or ""
    if not (refresh_token and client_id and client_secret):
        return None
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri=getattr(settings, "GOOGLE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        client_id=client_id,
        client_secret=client_secret,
        scopes=[getattr(settings, "GMAIL_SCOPES", GMAIL_SEND_SCOPE)],
    )


def get_gmail_service():
    """Return an authenticated Gmail API service client, or None when unconfigured."""
    credentials = _get_oauth_credentials()
    if credentials is None:
        return None
    if not credentials.valid:
        credentials.refresh(GoogleRequestTransport())
    return build("gmail", "v1", credentials=credentials)


def _build_raw_message(to_email: str, subject: str, body: str) -> str:
    message = EmailMessage()
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    return base64.urlsafe_b64encode(message.as_bytes()).decode("ascii").rstrip("=")


def send_email(to_email: str, subject: str, body: str, *, html_body: str | None = None) -> dict[str, Any]:
    """Send an email through the Gmail API. Returns a small result dict."""
    service = get_gmail_service()
    if service is None:
        return {"success": False, "error": "GMAIL_NOT_CONFIGURED", "detail": "Gmail OAuth credentials are not configured on the server."}
    try:
        raw = _build_raw_message(to_email, subject, body)
        response = service.users().messages().send(userId="me", body={"raw": raw}).execute()
        return {"success": True, "message_id": response.get("id")}
    except HttpError as exc:
        logger.error("Gmail send failed for %s: %s", to_email, exc)
        return {"success": False, "error": "GMAIL_API_ERROR", "detail": str(exc)}
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Unexpected error while sending Gmail email to %s", to_email)
        return {"success": False, "error": "EMAIL_SEND_FAILED", "detail": str(exc)}


def send_access_request_email(
    *,
    hod_email: str,
    hod_name: str,
    department_class_label: str,
    requested_record_types: list[str],
    reason: str,
    access_duration_days: int,
) -> dict[str, Any]:
    """Notify a class coordinator about a new HOD access request."""
    subject = f"[ODRMS] Access Request — {department_class_label}"
    body = (
        f"Dear Coordinator,\n\n"
        f"{hod_name} (HOD) has requested access to the class records for {department_class_label}.\n\n"
        f"Requested record types: {', '.join(requested_record_types) or 'General'}\n"
        f"Reason: {reason or 'N/A'}\n"
        f"Requested access duration: {access_duration_days} days\n\n"
        f"Please review this request in the ODRMS access workflow."
    )
    return send_email(to_email=hod_email, subject=subject, body=body)


def send_access_decision_email(
    *,
    recipient_email: str,
    approved: bool,
    department_class_label: str,
    decided_by: str,
) -> dict[str, Any]:
    """Notify the HOD about the coordinator's approval or rejection decision."""
    status = "APPROVED" if approved else "REJECTED"
    subject = f"[ODRMS] Access Request {status} — {department_class_label}"
    body = (
        f"Your access request for {department_class_label} has been {status}.\n\n"
        f"Decided by: {decided_by}\n"
    )
    return send_email(to_email=recipient_email, subject=subject, body=body)


def send_access_revoked_email(
    *,
    recipient_email: str,
    department_class_label: str,
    revoked_by: str,
) -> dict[str, Any]:
    """Notify the HOD when access to a class is revoked."""
    subject = f"[ODRMS] Access Revoked — {department_class_label}"
    body = (
        f"Your access to {department_class_label} has been revoked.\n\n"
        f"Revoked by: {revoked_by}\n"
    )
    return send_email(to_email=recipient_email, subject=subject, body=body)


def send_access_expiration_email(
    *,
    recipient_email: str,
    department_class_label: str,
) -> dict[str, Any]:
    """Notify the HOD when a previously approved access expires."""
    subject = f"[ODRMS] Access Expired — {department_class_label}"
    body = (
        f"Your approved access to {department_class_label} has expired.\n\n"
        f"Please submit a new access request if required."
    )
    return send_email(to_email=recipient_email, subject=subject, body=body)
