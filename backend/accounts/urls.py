from django.urls import path

from accounts.views import (
    GoogleOAuthCallbackView,
    GoogleOAuthView,
    LoginView,
    LogoutView,
    PasswordChangeView,
    ProfileView,
    RefreshView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("profile/", ProfileView.as_view(), name="auth-profile"),
    path("password/", PasswordChangeView.as_view(), name="auth-password"),
    path("google/authorize/", GoogleOAuthView.as_view(), name="auth-google-authorize"),
    path("google/callback/", GoogleOAuthCallbackView.as_view(), name="auth-google-callback"),
]
