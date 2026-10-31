from rest_framework.routers import DefaultRouter

from faculty.views import FacultyViewSet

router = DefaultRouter()
router.register("", FacultyViewSet, basename="faculty")

urlpatterns = router.urls
