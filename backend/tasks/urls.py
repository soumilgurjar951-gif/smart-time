from rest_framework.routers import SimpleRouter

from tasks.views import DepartmentTaskViewSet

router = SimpleRouter()
router.register("", DepartmentTaskViewSet, basename="task")

urlpatterns = router.urls
