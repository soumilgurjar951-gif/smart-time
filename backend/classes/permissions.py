"""Access rules for class-scoped data.

- HOD has centralized access to every class in every department.
- Faculty can only access classes with an ACTIVE ClassFacultyAccess row,
  granted by the HOD. Revocation is effective immediately because no
  permission check result is ever cached.
- All authorization checks happen in the backend on every request.
"""

from accounts.permissions import IsHOD as IsHOD  # noqa: F401  (re-exported)


def holds_all_permissions(holder_permissions, required):
    if not required:
        return True
    held = set(holder_permissions or [])
    return set(required).issubset(held)


def accessible_class_ids(user, permissions=None):
    """Return IDs of the classes *user* may access.

    permissions: optional iterable of permissions to require. When provided,
    the user must hold ALL of them on the class.
    """
    from classes.models import ClassFacultyAccess

    required = set(permissions or [])

    if getattr(user, "is_hod", False):
        ids = ClassFacultyAccess.objects.filter(
            department_class__is_active=True,
        ).values_list("department_class_id", flat=True)
        # HOD implicitly holds every permission, so the requirement is moot.
        return list(ids)

    profile = getattr(user, "faculty_profile", None)
    if not profile:
        return []

    from classes.models import ClassCoordinator

    coordinator_class_ids = list(
        ClassCoordinator.objects.filter(faculty=profile, is_active=True).values_list("department_class_id", flat=True)
    )
    if coordinator_class_ids:
        # Class coordinators manage their assigned classes/sections.
        return coordinator_class_ids

    accesses = ClassFacultyAccess.objects.filter(
        faculty=profile,
        is_active=True,
        department_class__is_active=True,
    )
    return [
        access.department_class_id
        for access in accesses
        if holds_all_permissions(access.permissions, required)
    ]


def user_can_access_class(user, department_class, permissions=None):
    """Boolean check: may *user* touch *department_class*?"""
    from classes.models import ClassCoordinator, ClassFacultyAccess

    if user is None or not getattr(user, "is_authenticated", False):
        return False
    required = set(permissions or [])
    if user.is_hod:
        return True
    profile = getattr(user, "faculty_profile", None)
    if not profile:
        return False
    if ClassCoordinator.objects.filter(
        faculty=profile, department_class=department_class, is_active=True
    ).exists():
        # Class coordinators manage their assigned class/section.
        return True
    access = ClassFacultyAccess.objects.filter(
        faculty=profile,
        department_class=department_class,
        is_active=True,
    ).first()
    return bool(access and holds_all_permissions(access.permissions, required))


def class_permissions_for(user, department_class):
    """Return the permission list *user* holds on *department_class*."""
    from classes.models import ClassCoordinator, ClassFacultyAccess

    if user.is_hod:
        return list(ClassFacultyAccess.Permission.values)
    profile = getattr(user, "faculty_profile", None)
    if not profile:
        return []
    if ClassCoordinator.objects.filter(
        faculty=profile, department_class=department_class, is_active=True
    ).exists():
        # Class coordinators hold full access to their assigned class/section.
        return list(ClassFacultyAccess.Permission.values)
    access = ClassFacultyAccess.objects.filter(
        faculty=profile,
        department_class=department_class,
        is_active=True,
    ).first()
    return list(access.permissions) if access else []


def assert_class_access(user, department_class, permissions=None):
    """Raise an HTTP-appropriate DRF exception unless access requirements hold."""
    if user is None or not getattr(user, "is_authenticated", False):
        from rest_framework.exceptions import NotAuthenticated

        raise NotAuthenticated("Authentication required.")
    if not user_can_access_class(user, department_class, permissions):
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied(
            "You do not have access to this class."
        )
