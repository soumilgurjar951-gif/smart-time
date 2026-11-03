import json
import secrets
from urllib.parse import urlencode

import requests as requests_lib

from django.conf import settings
from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.serializers import (
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    UserProfileSerializer,
)

GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GMAIL_SEND_SCOPE_FALLBACK = "https://www.googleapis.com/auth/gmail.send"


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"success": True, "message": "Logged out successfully."}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "message": "Password updated successfully."})


class GoogleOAuthView(APIView):
    """Return the Google OAuth 2.0 consent URL used for Gmail send access."""

    permission_classes = [AllowAny]

    def get(self, request):
        state = secrets.token_urlsafe(16)
        params = {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_AUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": settings.GMAIL_SCOPES[0] if settings.GMAIL_SCOPES else GMAIL_SEND_SCOPE_FALLBACK,
            "access_type": "offline",
            "state": state,
        }
        auth_url = f"{GOOGLE_AUTH_BASE_URL}?{urlencode(params)}"
        return Response({"auth_url": auth_url, "state": state})


class GoogleOAuthCallbackView(APIView):
    """Exchange the Google OAuth authorization code for tokens and store the refresh token."""

    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response({"success": False, "error": "MISSING_CODE"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token_resp = requests_lib.post(
                settings.GOOGLE_TOKEN_URI or "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_AUTH_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                timeout=10,
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
        except Exception as exc:
            return Response(
                {"success": False, "error": "TOKEN_EXCHANGE_FAILED", "detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        refresh_token = token_data.get("refresh_token")
        if refresh_token:
            cache.set(
                "odrms_google_oauth_tokens",
                json.dumps(
                    {
                        "refresh_token": refresh_token,
                        "token_uri": token_data.get("token_uri") or settings.GOOGLE_TOKEN_URI,
                        "scopes": token_data.get("scope") or list(settings.GMAIL_SCOPES or [GMAIL_SEND_SCOPE_FALLBACK]),
                    }
                ),
                timeout=60 * 60 * 24 * 30,
            )
        return Response(
            {
                "success": True,
                "scopes": token_data.get("scope") or list(settings.GMAIL_SCOPES or [GMAIL_SEND_SCOPE_FALLBACK]),
            }
        )
