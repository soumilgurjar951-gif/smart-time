from rest_framework.routers import DefaultRouter

from tasks.views import DepartmentTaskViewSet

router = DefaultRouter()
router.register("", DepartmentTaskViewSet, basename="task")

urlpatterns = router.urls
