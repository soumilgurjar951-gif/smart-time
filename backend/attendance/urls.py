from django.urls import include, path
from rest_framework.routers import DefaultRouter

from attendance.views import AttendanceRecordViewSet, AttendanceRosterViewSet

router = DefaultRouter()
router.register("roster", AttendanceRosterViewSet, basename="attendance-roster")
router.register("", AttendanceRecordViewSet, basename="attendance")

urlpatterns = [
    path("", include(router.urls)),
]
