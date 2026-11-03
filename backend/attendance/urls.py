from django.urls import include, path
from rest_framework.routers import SimpleRouter

from attendance.views import AttendanceRecordViewSet, AttendanceRosterViewSet, BulkAttendanceView

router = SimpleRouter()
router.register("roster", AttendanceRosterViewSet, basename="attendance-roster")
router.register("", AttendanceRecordViewSet, basename="attendance")

urlpatterns = [
    path("bulk/", BulkAttendanceView.as_view(), name="attendance-bulk"),
    path("", include(router.urls)),
]
