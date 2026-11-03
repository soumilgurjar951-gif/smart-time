from django.urls import include, path
from rest_framework.routers import SimpleRouter

from notifications.views import AuditLogViewSet, NotificationViewSet

router = SimpleRouter()
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register("", NotificationViewSet, basename="notification")

urlpatterns = [
    path("", include(router.urls)),
]
