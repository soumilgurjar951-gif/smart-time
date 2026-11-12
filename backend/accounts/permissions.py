from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsHOD(BasePermission):
    message = "HOD role is required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_hod)


class IsFaculty(BasePermission):
    message = "Faculty role is required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_faculty)


class IsHODOrFaculty(BasePermission):
    message = "Authenticated HOD or Faculty access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {request.user.Role.HOD, request.user.Role.FACULTY}
        )


class IsHODOrReadOwn(BasePermission):
    """HOD has full access. Faculty may read or update their own records."""

    message = "You do not have access to this record."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_hod:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "assigned_faculty", None)
        if owner is None and hasattr(obj, "faculty"):
            owner = obj.faculty
        if hasattr(owner, "user"):
            owner = owner.user
        if owner == user:
            return request.method in SAFE_METHODS or view.action in {"retrieve", "update", "partial_update"}
        return False


def faculty_profile_for(user):
    profile = getattr(user, "faculty_profile", None)
    return profile if profile and profile.account_status == profile.AccountStatus.ACTIVE else profile


class IsProfileApproved(BasePermission):
    """Departmental module gate: only HOD, or faculty with an HOD-approved
    (VERIFIED) and ACTIVE profile, may access protected module APIs.

    Unapproved faculty receive 403 with code ``profile_not_approved`` so the
    frontend can route them back to the onboarding/approval flow.
    """

    message = "Your faculty profile requires HOD approval before you can access departmental modules."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_hod:
            return True
        profile = getattr(user, "faculty_profile", None)
        if profile is None:
            raise PermissionDenied(self.message, code="profile_not_approved")
        from faculty.models import FacultyProfile

        approved = (
            user.is_active
            and profile.account_status == FacultyProfile.AccountStatus.ACTIVE
            and profile.profile_status == FacultyProfile.ProfileStatus.VERIFIED
        )
        if not approved:
            raise PermissionDenied(self.message, code="profile_not_approved")
        return True
