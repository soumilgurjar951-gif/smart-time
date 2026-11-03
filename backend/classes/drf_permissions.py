from rest_framework.permissions import BasePermission

from . import permissions


class RequiresClassPermission(BasePermission):
    """DRF gate: the request user must hold the class permission(s) declared on the view.

    Set `required_class_permissions` on the view, e.g.:
        class MyView(views.APIView):
            permission_classes = [IsAuthenticated, RequiresClassPermission]
            required_class_permissions = [ClassFacultyAccess.Permission.MANAGE_TIMETABLE]
    """

    required_class_permissions = None

    def has_permission(self, request, view):
        from classes.models import AcademicClass

        class_id = (
            view.kwargs.get("pk")
            or view.kwargs.get("class_id")
            or request.data.get("department_class")
            or request.data.get("class_id")
            or request.query_params.get("class_id")
        )
        if class_id in (None, ""):
            return False
        try:
            cls = AcademicClass.objects.get(pk=class_id)
        except (AcademicClass.DoesNotExist, ValueError, TypeError):
            return False
        return permissions.user_can_access_class(request.user, cls, self.required_class_permissions)
