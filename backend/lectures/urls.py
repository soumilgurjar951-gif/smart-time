from django.urls import include, path
from rest_framework.routers import DefaultRouter

from lectures.views import LectureViewSet, SubjectViewSet

router = DefaultRouter()
router.register("subjects", SubjectViewSet, basename="subject")
router.register("", LectureViewSet, basename="lecture")

urlpatterns = [
    path("", include(router.urls)),
]
