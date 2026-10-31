from rest_framework.routers import DefaultRouter

from achievements.views import FacultyAchievementViewSet

router = DefaultRouter()
router.register("", FacultyAchievementViewSet, basename="achievement")

urlpatterns = router.urls
