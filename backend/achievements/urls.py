from rest_framework.routers import SimpleRouter

from achievements.views import FacultyAchievementViewSet

router = SimpleRouter()
router.register("", FacultyAchievementViewSet, basename="achievement")

urlpatterns = router.urls
