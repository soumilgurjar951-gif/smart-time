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
