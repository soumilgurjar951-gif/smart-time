from django.urls import include, path
from rest_framework.routers import SimpleRouter

from lectures.views import (
    AcademicYearViewSet,
    FacultySubjectViewSet,
    LectureViewSet,
    SectionViewSet,
    SubjectViewSet,
    TimeSlotViewSet,
    TimetableEntryViewSet,
    TimetableHistoryViewSet,
)

router = SimpleRouter()
router.register("subjects", SubjectViewSet, basename="subject")
router.register("academic-years", AcademicYearViewSet, basename="academic-year")
router.register("sections", SectionViewSet, basename="section")
router.register("faculty-subjects", FacultySubjectViewSet, basename="faculty-subject")
router.register("time-slots", TimeSlotViewSet, basename="time-slot")
router.register("timetable/entries", TimetableEntryViewSet, basename="timetable-entry")
router.register("timetable/history", TimetableHistoryViewSet, basename="timetable-history")
router.register("", LectureViewSet, basename="lecture")

urlpatterns = [
    path("", include(router.urls)),
]
