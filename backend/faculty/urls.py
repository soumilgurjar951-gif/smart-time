from rest_framework.routers import SimpleRouter

from faculty.views import FacultyViewSet

router = SimpleRouter()
router.register("", FacultyViewSet, basename="faculty")

urlpatterns = router.urls
