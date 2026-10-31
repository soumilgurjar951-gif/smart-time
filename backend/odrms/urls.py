from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response(
        {
            "success": True,
            "service": "ODRMS API",
            "department": "CSIT",
            "year": 3,
            "semester": 5,
            "sections": ["A", "B"],
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("accounts.urls")),
    path("api/faculty/", include("faculty.urls")),
    path("api/lectures/", include("lectures.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/achievements/", include("achievements.urls")),
    path("api/resources/", include("resources.urls")),
    path("api/reports/", include("reports.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
