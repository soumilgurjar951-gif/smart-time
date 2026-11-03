from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import ClassViewSet, DepartmentViewSet

router = SimpleRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("classes", ClassViewSet, basename="class")

urlpatterns = [
    path("", include(router.urls)),
]
