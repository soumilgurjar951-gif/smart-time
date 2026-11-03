from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from achievements.models import FacultyAchievement
from attendance.models import AttendanceRecord
from classes.models import AccessGrant, AcademicClass, FacultySubjectAssignment
from faculty.models import FacultyProfile
from lectures.models import AcademicYear, Lecture, Subject, TimetableEntry
from resources.models import Resource, ResourceBooking
from tasks.models import DepartmentTask


class ReportBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def scoped_faculty_id(self, request):
        param = request.query_params.get("faculty")
        if request.user.is_hod:
            return int(param) if param else None
        profile = getattr(request.user, "faculty_profile", None)
        if not profile:
            return -1
        return profile.id

    def faculty_accessible_sections(self, user):
        """Sections the logged-in faculty member may access (assigned sections)."""
        profile = getattr(user, "faculty_profile", None)
        if not profile:
            return []
        return list(
            AcademicClass.objects.filter(
                subjects__faculty_assignments__faculty=profile,
                subjects__faculty_assignments__is_active=True,
                subjects__department_class__is_active=True,
            )
            .order_by("section")
            .values_list("section", flat=True)
            .distinct()
        )

    def hod_may_access_section(self, user, section):
        """HOD may read a section only via an approved, active, unexpired grant."""
        now = timezone.now()
        return AccessGrant.objects.filter(
            holder_user=user,
            access_type=AccessGrant.AccessType.HOD,
            is_active=True,
            expires_at__isnull=False,
            expires_at__gt=now,
            department_class__section=section,
        ).exists()

    def date_range(self, request):
        return request.query_params.get("date_from"), request.query_params.get("date_to")


class DepartmentOverviewView(ReportBaseView):
    """High-level dashboard numbers for HOD and faculty."""

    def get(self, request):
        today = timezone.localdate()
        user = request.user

        if user.is_hod:
            total_faculty = FacultyProfile.objects.filter(
                account_status=FacultyProfile.AccountStatus.ACTIVE
            ).count()
            lectures_today = Lecture.objects.filter(date=today).exclude(
                status=Lecture.Status.CANCELLED
            ).count()
            pending_tasks = DepartmentTask.objects.filter(
                status__in=[DepartmentTask.Status.PENDING, DepartmentTask.Status.OVERDUE]
            ).count()
            pending_bookings = ResourceBooking.objects.filter(
                status=ResourceBooking.Status.PENDING
            ).count()
            pending_achievements = FacultyAchievement.objects.filter(
                verification_status=FacultyAchievement.VerificationStatus.PENDING
            ).count()
            return Response(
                {
                    "role": "HOD",
                    "as_of": today,
                    "total_faculty": total_faculty,
                    "lectures_today": lectures_today,
                    "pending_tasks": pending_tasks,
                    "pending_booking_requests": pending_bookings,
                    "pending_achievement_reviews": pending_achievements,
                }
            )

        # Faculty overview
        profile = getattr(user, "faculty_profile", None)
        if not profile:
            return Response({"role": "FACULTY", "as_of": today})

        lectures_today = Lecture.objects.filter(
            assigned_faculty=profile, date=today
        ).exclude(status=Lecture.Status.CANCELLED).count()
        upcoming = Lecture.objects.filter(
            assigned_faculty=profile, date__gt=today
        ).exclude(status=Lecture.Status.CANCELLED).count()
        my_tasks = DepartmentTask.objects.filter(
            assigned_faculty=profile,
            status__in=[DepartmentTask.Status.PENDING, DepartmentTask.Status.IN_PROGRESS, DepartmentTask.Status.OVERDUE],
        ).count()
        my_achievements = FacultyAchievement.objects.filter(
            faculty=profile
        ).aggregate(
            total=Count("id"),
            approved=Count("id", filter=Q(verification_status=FacultyAchievement.VerificationStatus.APPROVED)),
            pending=Count("id", filter=Q(verification_status=FacultyAchievement.VerificationStatus.PENDING)),
        )
        return Response(
            {
                "role": "FACULTY",
                "as_of": today,
                "lectures_today": lectures_today,
                "upcoming_lectures": upcoming,
                "active_tasks": my_tasks,
                "achievements": my_achievements,
            }
        )


class FacultyTaskCompletionReportView(ReportBaseView):
    def get(self, request):
        qs = DepartmentTask.objects.select_related("assigned_faculty")
        faculty_id = self.scoped_faculty_id(request)
        if faculty_id == -1:
            return Response({"results": []})
        if faculty_id:
            qs = qs.filter(assigned_faculty_id=faculty_id)
        date_from, date_to = self.date_range(request)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        grouped = qs.values(
            "assigned_faculty_id",
            "assigned_faculty__full_name",
            "assigned_faculty__employee_id",
        ).annotate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=DepartmentTask.Status.COMPLETED)),
            pending=Count("id", filter=Q(status=DepartmentTask.Status.PENDING)),
            in_progress=Count("id", filter=Q(status=DepartmentTask.Status.IN_PROGRESS)),
            overdue=Count("id", filter=Q(status=DepartmentTask.Status.OVERDUE)),
        )
        results = []
        for row in grouped:
            total = row["total"] or 0
            results.append(
                {
                    **row,
                    "completion_rate": round((row["completed"] / total) * 100, 2) if total else 0,
                }
            )
        return Response({"count": len(results), "results": results})


class LectureScheduleReportView(ReportBaseView):
    def get(self, request):
        qs = Lecture.objects.select_related("subject", "assigned_faculty")
        faculty_id = self.scoped_faculty_id(request)
        if faculty_id == -1:
            return Response({"results": []})
        if faculty_id:
            qs = qs.filter(assigned_faculty_id=faculty_id)
        subject = request.query_params.get("subject")
        section = request.query_params.get("section")
        date_from, date_to = self.date_range(request)
        if subject:
            qs = qs.filter(subject_id=subject)
        if section:
            qs = qs.filter(section=section)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        data = list(
            qs.order_by("date", "start_time").values(
                "id",
                "date",
                "start_time",
                "end_time",
                "section",
                "classroom",
                "status",
                "lecture_type",
                "topic",
                "subject__code",
                "subject__name",
                "assigned_faculty__full_name",
            )
        )
        return Response({"count": len(data), "results": data})


class AttendanceSummaryReportView(ReportBaseView):
    def get(self, request):
        qs = AttendanceRecord.objects.select_related("lecture", "lecture__subject")
        faculty_id = self.scoped_faculty_id(request)
        if faculty_id == -1:
            return Response({"summary": {}, "results": []})
        if faculty_id:
            qs = qs.filter(lecture__assigned_faculty_id=faculty_id)
        user = request.user
        if not user.is_hod and faculty_id:
            # Faculty/coordinator: only their assigned sections.
            sections = self.faculty_accessible_sections(user)
            if sections:
                qs = qs.filter(lecture__section__in=sections)
        subject = request.query_params.get("subject")
        section = request.query_params.get("section")
        date_from, date_to = self.date_range(request)
        if subject:
            qs = qs.filter(lecture__subject_id=subject)
        if section:
            if user.is_hod and not self.hod_may_access_section(user, section):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied("You do not have approved access to this section.")
            qs = qs.filter(lecture__section=section)
        if date_from:
            qs = qs.filter(lecture__date__gte=date_from)
        if date_to:
            qs = qs.filter(lecture__date__lte=date_to)
        summary = qs.aggregate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
        )
        total = summary["total"] or 0
        by_section = list(
            qs.values("lecture__section").annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            )
        )
        return Response(
            {
                "summary": {
                    **summary,
                    "present_percentage": round((summary["present"] / total) * 100, 2) if total else 0,
                },
                "by_section": by_section,
            }
        )


class ResourceUtilizationReportView(ReportBaseView):
    def get(self, request):
        if not request.user.is_hod:
            bookings = ResourceBooking.objects.filter(requested_by=request.user)
        else:
            bookings = ResourceBooking.objects.all()
        date_from, date_to = self.date_range(request)
        if date_from:
            bookings = bookings.filter(date__gte=date_from)
        if date_to:
            bookings = bookings.filter(date__lte=date_to)
        by_resource = list(
            bookings.values("resource_id", "resource__name", "resource__type").annotate(
                total_requests=Count("id"),
                approved=Count("id", filter=Q(status=ResourceBooking.Status.APPROVED)),
                pending=Count("id", filter=Q(status=ResourceBooking.Status.PENDING)),
                rejected=Count("id", filter=Q(status=ResourceBooking.Status.REJECTED)),
            )
        )
        unused = Resource.objects.exclude(id__in=[row["resource_id"] for row in by_resource if row["resource_id"]])
        return Response(
            {
                "utilization": by_resource,
                "unused_resources": list(unused.values("id", "name", "type", "location")),
            }
        )


class AchievementReportView(ReportBaseView):
    def get(self, request):
        qs = FacultyAchievement.objects.select_related("faculty")
        faculty_id = self.scoped_faculty_id(request)
        if faculty_id == -1:
            return Response({"results": []})
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        date_from, date_to = self.date_range(request)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        grouped = list(
            qs.values("faculty_id", "faculty__full_name", "verification_status", "category").annotate(total=Count("id"))
        )
        return Response(
            {
                "totals": qs.aggregate(
                    total=Count("id"),
                    approved=Count("id", filter=Q(verification_status=FacultyAchievement.VerificationStatus.APPROVED)),
                    pending=Count("id", filter=Q(verification_status=FacultyAchievement.VerificationStatus.PENDING)),
                    rejected=Count("id", filter=Q(verification_status=FacultyAchievement.VerificationStatus.REJECTED)),
                ),
                "results": grouped,
            }
        )


class PendingUpdatesReportView(ReportBaseView):
    def get(self, request):
        qs = DepartmentTask.objects.select_related("assigned_faculty").filter(
            Q(update_requested_at__isnull=False)
            | Q(status__in=[DepartmentTask.Status.PENDING, DepartmentTask.Status.IN_PROGRESS, DepartmentTask.Status.OVERDUE])
        ).exclude(status=DepartmentTask.Status.COMPLETED)
        faculty_id = self.scoped_faculty_id(request)
        if faculty_id == -1:
            return Response({"results": []})
        if faculty_id:
            qs = qs.filter(assigned_faculty_id=faculty_id)
        data = list(
            qs.order_by("deadline").values(
                "id",
                "title",
                "status",
                "progress",
                "deadline",
                "update_requested_at",
                "assigned_faculty__full_name",
                "assigned_faculty_id",
            )
        )
        return Response({"count": len(data), "as_of": timezone.now(), "results": data})
