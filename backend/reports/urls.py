from django.urls import path

from reports.views import (
    AchievementReportView,
    AttendanceSummaryReportView,
    FacultyTaskCompletionReportView,
    LectureScheduleReportView,
    PendingUpdatesReportView,
    ResourceUtilizationReportView,
)

urlpatterns = [
    path("tasks/", FacultyTaskCompletionReportView.as_view(), name="report-tasks"),
    path("lectures/", LectureScheduleReportView.as_view(), name="report-lectures"),
    path("attendance/", AttendanceSummaryReportView.as_view(), name="report-attendance"),
    path("resources/", ResourceUtilizationReportView.as_view(), name="report-resources"),
    path("achievements/", AchievementReportView.as_view(), name="report-achievements"),
    path("pending-updates/", PendingUpdatesReportView.as_view(), name="report-pending-updates"),
]
