"""Class-scoped APIs.

Every sub-endpoint validates class access on the backend for every request:
    GET    /api/classes/                       (faculty: only granted classes)
    POST   /api/classes/                       (HOD only)
    PUT    /api/classes/{class_id}/            (HOD only)
    DELETE /api/classes/{class_id}/            (HOD only)
    GET    /api/classes/{class_id}/dashboard/
    GET    /api/classes/{class_id}/timetable/
    GET    /api/classes/{class_id}/attendance/
    GET    /api/classes/{class_id}/faculty/
    GET    /api/classes/{class_id}/reports/
    GET|POST /api/classes/{class_id}/subjects/
    POST   /api/classes/{class_id}/faculty-access/           (HOD only)
    GET    /api/classes/{class_id}/faculty-access/           (HOD only)
    DELETE /api/classes/{class_id}/faculty-access/{access_id}/  (HOD only)
    GET    /api/classes/summary/                (HOD only — explicit cross-class summary)
"""

from datetime import date, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsHOD
from attendance.models import AttendanceRecord
from faculty.models import FacultyProfile
from lectures.models import Lecture, TimeSlot, TimetableEntry
from notifications.helpers import audit, notify
from notifications.models import Notification
from notifications.email_service import (
    send_access_decision_email,
    send_access_expiration_email,
    send_access_revoked_email,
    send_access_request_email,
)

from . import permissions as class_perms
from .models import (
    AcademicClass,
    AccessGrant,
    AccessRequest,
    ClassCoordinator,
    ClassFacultyAccess,
    ClassSubject,
    Department,
    FacultySubjectAssignment,
)
from .serializers import (
    AcademicClassSerializer,
    AccessGrantSerializer,
    AccessRequestSerializer,
    ClassFacultyAccessSerializer,
    ClassSubjectSerializer,
    DepartmentSerializer,
    FacultySubjectAssignmentSerializer,
    FacultySummarySerializer,
)


def _class_object_for_user(request, class_id, permissions=None):
    """Fetch a class enforcing backend access for every request."""
    try:
        cls = AcademicClass.objects.select_related("department", "academic_year").get(pk=class_id)
    except (AcademicClass.DoesNotExist, ValueError, TypeError) as exc:
        raise NotFound("Class not found.") from exc
    if not cls.is_active and not request.user.is_hod:
        raise NotFound("Class not found.")
    class_perms.assert_class_access(request.user, cls, permissions)
    return cls


def _plain(error_dict):
    return getattr(error_dict, "message_dict", {"detail": error_dict.messages})


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.annotate(class_count=Count("classes", distinct=True))
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action not in {"list", "retrieve"}:
            return [IsHOD()]
        return super().get_permissions()

    def get_queryset(self):
        if self.request.user.is_hod:
            return self.queryset
        ids = class_perms.accessible_class_ids(self.request.user)
        if not ids:
            return self.queryset.none()
        dept_ids = AcademicClass.objects.filter(pk__in=ids).values("department_id")
        return self.queryset.filter(pk__in=dept_ids)


class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicClassSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["department", "year", "semester", "section", "is_active"]

    STATS_DAYS = 30

    # ---------------------------------------------------------------- access

    def get_queryset(self):
        qs = AcademicClass.objects.select_related("department", "academic_year").annotate(
            subject_count=Count("subjects", distinct=True)
        )
        if self.request.user.is_hod:
            return qs
        ids = class_perms.accessible_class_ids(self.request.user)
        return qs.filter(pk__in=ids)

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsHOD()]
        return super().get_permissions()

    def _my_permissions(self, cls):
        return {
            "my_permissions": class_perms.class_permissions_for(self.request.user, cls),
            "is_hod": self.request.user.is_hod,
        }

    # ------------------------------------------------------------ basic CRUD

    def perform_create(self, serializer):
        try:
            cls = serializer.save(created_by=self.request.user)
        except IntegrityError as exc:
            raise ValidationError(
                {"non_field_errors": "A class already exists for this department, year, semester, section and academic year."}
            ) from exc
        audit(
            actor=self.request.user,
            action="class_created",
            entity_type="AcademicClass",
            entity_id=cls.pk,
            metadata={"display_name": cls.display_name},
        )

    def perform_update(self, serializer):
        try:
            cls = serializer.save()
        except IntegrityError as exc:
            raise ValidationError(
                {"non_field_errors": "A class already exists for this department, year, semester, section and academic year."}
            ) from exc
        audit(
            actor=self.request.user,
            action="class_updated",
            entity_type="AcademicClass",
            entity_id=cls.pk,
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        audit(
            actor=self.request.user,
            action="class_deactivated",
            entity_type="AcademicClass",
            entity_id=instance.pk,
        )

    # ------------------------------------------------------- class selectors

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """HOD-only, explicitly-requested cross-class comparison summary."""
        if not request.user.is_hod:
            raise PermissionDenied("Only the HOD can compare classes.")
        rows = [self._dashboard_payload(cls, include_schedules=False) for cls in self.get_queryset()]
        return Response({"count": len(rows), "classes": rows})

    # ------------------------------------------------------------- dashboard

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        return Response({**self._dashboard_payload(cls), **self._my_permissions(cls)})

    def _dashboard_payload(self, cls, include_schedules=True):
        weekday = list(TimetableEntry.Weekday.values)[date.today().weekday()] if date.today().weekday() <= 4 else None
        entries = self._timetable_queryset(cls)
        today_entries = entries.filter(weekday=weekday).order_by("time_slot__period_number") if weekday else []
        upcoming = Lecture.objects.filter(
            section=cls.section,
            status=Lecture.Status.SCHEDULED,
            date__gte=date.today(),
        )
        attendance_qs = AttendanceRecord.objects.filter(
            lecture__section=cls.section,
            lecture__date__gte=date.today() - timedelta(days=self.STATS_DAYS),
        ).aggregate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
        )
        total = attendance_qs["total"] or 0
        payload = {
            "class_id": cls.pk,
            "display_name": cls.display_name,
            "is_active": cls.is_active,
            "totals": {
                "subjects": cls.subjects.filter(is_active=True).count(),
                "faculty": cls.faculty_accesses.filter(is_active=True).count(),
                "timetable_entries": entries.count(),
                "lectures_upcoming": upcoming.count(),
                "attendance_records": total,
            },
            "recent_attendance": {
                "window_days": self.STATS_DAYS,
                **attendance_qs,
                "present_percentage": round((attendance_qs["present"] / total) * 100, 2) if total else 0,
            },
        }
        if include_schedules:
            payload["timetable_today"] = [
                {
                    "timetable_entry_id": entry.pk,
                    "subject_code": entry.subject.code,
                    "subject_name": entry.subject.name,
                    "weekday": entry.weekday,
                    "period": entry.time_slot.period_number,
                    "start_time": entry.time_slot.start_time,
                    "end_time": entry.time_slot.end_time,
                    "classroom": entry.classroom,
                    "lecture_type": entry.lecture_type,
                    "faculty_name": entry.faculty.full_name,
                }
                for entry in today_entries
            ]
            payload["subjects"] = ClassSubjectSerializer(cls.subjects.filter(is_active=True), many=True).data
        return payload

    # ------------------------------------------------------------- timetable

    def _timetable_queryset(self, cls):
        qs = TimetableEntry.objects.filter(
            section__code=cls.section, section__department=cls.department.code
        ).select_related(
            "section", "subject", "faculty", "time_slot"
        )
        if cls.academic_year_id:
            qs = qs.filter(Q(academic_year_id=cls.academic_year_id) | Q(academic_year__isnull=True))
        return qs.order_by("weekday", "time_slot__period_number")

    @action(detail=True, methods=["get"])
    def timetable(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        entries = self._timetable_queryset(cls)
        return Response(
            {
                "class_id": cls.pk,
                "display_name": cls.display_name,
                "count": entries.count(),
                "entries": [
                    {
                        "timetable_entry_id": e.pk,
                        "subject_id": e.subject_id,
                        "subject_code": e.subject.code,
                        "subject_name": e.subject.name,
                        "faculty_id": e.faculty_id,
                        "faculty_name": e.faculty.full_name,
                        "weekday": e.weekday,
                        "time_slot_id": e.time_slot_id,
                        "period": e.time_slot.period_number,
                        "start_time": e.time_slot.start_time,
                        "end_time": e.time_slot.end_time,
                        "classroom": e.classroom,
                        "lecture_type": e.lecture_type,
                        "topic": e.topic,
                    }
                    for e in entries
                ],
                "conflicts": self._cross_class_conflicts(entries),
            }
        )

    def _cross_class_conflicts(self, entries):
        """Detect faculty and room conflicts of these entries against ALL classes."""
        faculty_ids, rooms = set(entries.values_list("faculty_id", flat=True)), set(
            entries.values_list("classroom", flat=True)
        )
        if not faculty_ids and not rooms:
            return []
        others = TimetableEntry.objects.filter(
            Q(faculty_id__in=faculty_ids) | Q(classroom__in=rooms)
        ).exclude(pk__in=entries).select_related("section", "subject", "faculty", "time_slot")
        conflicts = []
        for e in entries:
            for other in others:
                if e.weekday != other.weekday:
                    continue
                if not _slots_overlap(e.time_slot, other.time_slot):
                    continue
                if other.faculty_id == e.faculty_id:
                    conflicts.append({"type": "FACULTY", "entry": e.pk, "conflicting_entry": other.pk})
                elif e.classroom.casefold() == other.classroom.casefold():
                    conflicts.append({"type": "ROOM", "entry": e.pk, "conflicting_entry": other.pk})
        return conflicts

    # ------------------------------------------------------------- attendance

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        records = AttendanceRecord.objects.filter(
            lecture__section=cls.section
        ).select_related("lecture", "lecture__subject", "roster", "marked_by")
        if cls.academic_year_id:
            records = records.filter(
                Q(lecture__timetable_entry__academic_year_id=cls.academic_year_id)
                | Q(lecture__timetable_entry__academic_year__isnull=True)
                | Q(lecture__timetable_entry__isnull=True)
            )
        params = request.query_params
        if params.get("date"):
            records = records.filter(lecture__date=params["date"])
        if params.get("subject"):
            records = records.filter(lecture__subject_id=params["subject"])
        summary = records.aggregate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
        )
        total = summary["total"] or 0
        sessions = (
            records.values(
                "lecture_id",
                "lecture__date",
                "lecture__start_time",
                "lecture__end_time",
                "lecture__subject__code",
                "lecture__assigned_faculty__full_name",
                "marked_by__id",
            )
            .annotate(total=Count("id"), present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)))
            .order_by("-lecture__date", "lecture__start_time")[:100]
        )
        return Response(
            {
                "class_id": cls.pk,
                "display_name": cls.display_name,
                "summary": {**summary, "present_percentage": round((summary["present"] / total) * 100, 2) if total else 0},
                "sessions": list(sessions),
            }
        )

    # ---------------------------------------------------------------- faculty

    @action(detail=True, methods=["get"])
    def faculty(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        assignments = FacultySubjectAssignment.objects.filter(
            class_subject__department_class=cls,
            is_active=True,
        ).select_related("class_subject__subject", "faculty")
        accesses = []
        if request.user.is_hod:
            accesses = ClassFacultyAccessSerializer(
                cls.faculty_accesses.all().select_related("faculty", "granted_by"), many=True
            ).data
        return Response(
            {
                "class_id": cls.pk,
                "assignments": FacultySubjectAssignmentSerializer(assignments, many=True).data,
                "accesses": accesses,
                "available_faculty": FacultySummarySerializer(
                    FacultyProfile.objects.filter(department=cls.department.code, account_status=FacultyProfile.AccountStatus.ACTIVE),
                    many=True,
                ).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="assign-faculty", permission_classes=[IsHOD])
    def assign_faculty(self, request, pk=None):
        """Assign a faculty member to one of this class's subjects (HOD only)."""
        cls = _class_object_for_user(request, pk)
        faculty_id = request.data.get("faculty")
        subject_id = request.data.get("subject")
        try:
            profile = FacultyProfile.objects.get(pk=faculty_id)
        except (FacultyProfile.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError({"faculty": "Valid faculty is required."}) from exc
        try:
            subject = cls.subjects.get(subject_id=subject_id)
        except ClassSubject.DoesNotExist as exc:
            raise ValidationError({"subject": "Subject must be linked to this class first."}) from exc
        academic_year = cls.academic_year
        assignment, created = FacultySubjectAssignment.objects.get_or_create(
            faculty=profile,
            class_subject=subject,
            academic_year=academic_year,
            defaults={"assigned_by": request.user},
        )
        # Assigning a subject confirms the faculty needs at least VIEW access
        # to this class (granted BY the HOD here, never self-granted). An
        # explicitly revoked access row is NOT reactivated.
        from classes.models import ClassFacultyAccess as _Access

        if not _Access.objects.filter(faculty=profile, department_class=cls).exists():
            _Access.objects.get_or_create(
                faculty=profile,
                department_class=cls,
                defaults={
                    "permissions": [_Access.Permission.VIEW],
                    "is_active": True,
                    "granted_by": request.user,
                },
            )
        audit(
            actor=request.user,
            action="faculty_assigned",
            entity_type="FacultySubjectAssignment",
            entity_id=assignment.pk,
            metadata={"class": cls.pk, "faculty": profile.pk, "subject": subject_id},
        )
        if created and profile.user_id and profile.user.is_active:
            notify(
                recipient=profile.user,
                title="Subject assigned",
                message=f"You were assigned {subject.subject.name} ({cls.display_name}).",
                notification_type=Notification.NotificationType.LECTURE,
                department_class=cls,
            )
        return Response(
            FacultySubjectAssignmentSerializer(assignment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    # ---------------------------------------------------------------- subjects

    @action(detail=True, methods=["get", "post"])
    def subjects(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        if request.method == "POST":
            if not request.user.is_hod:
                raise PermissionDenied("Only the HOD can link subjects to a class.")
            subject_id = request.data.get("subject")
            from lectures.models import Subject

            try:
                subject = Subject.objects.get(pk=subject_id)
            except (Subject.DoesNotExist, ValueError, TypeError) as exc:
                raise ValidationError({"subject": "Valid subject is required."}) from exc
            link, created = ClassSubject.objects.get_or_create(
                department_class=cls, subject=subject
            )
            audit(
                actor=request.user,
                action="class_subject_linked" if created else "class_subject_exists",
                entity_type="ClassSubject",
                entity_id=link.pk,
                metadata={"class": cls.pk, "subject": subject_id},
            )
            return Response(
                ClassSubjectSerializer(link).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        return Response(ClassSubjectSerializer(cls.subjects.filter(is_active=True), many=True).data)

    # ---------------------------------------------------------- faculty access

    @action(detail=True, methods=["get", "post"], url_path="faculty-access")
    def faculty_access(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        if request.method == "POST":
            if not request.user.is_hod:
                raise PermissionDenied("Only the HOD can grant class access.")
            serializer = ClassFacultyAccessSerializer(data=request.data, context={"request": request})
            if serializer.is_valid(raise_exception=True):
                faculty_id = serializer.validated_data["faculty"].id
                access, created = ClassFacultyAccess.objects.update_or_create(
                    faculty_id=faculty_id,
                    department_class=cls,
                    defaults={
                        "permissions": serializer.validated_data.get("permissions")
                        or list(ClassFacultyAccess.DEFAULT_PERMISSIONS),
                        "granted_by": request.user,
                        "is_active": True,
                        "revoked_at": None,
                    },
                )
                audit(
                    actor=request.user,
                    action="class_access_granted",
                    entity_type="ClassFacultyAccess",
                    entity_id=access.pk,
                    metadata={"class": cls.pk, "faculty": faculty_id},
                )
                if access.faculty.user_id and access.faculty.user.is_active:
                    notify(
                        recipient=access.faculty.user,
                        title="Class access granted",
                        message=f"{request.user.full_name or 'HOD'} granted you access to {cls.display_name}.",
                        notification_type=Notification.NotificationType.SUCCESS,
                        department_class=cls,
                    )
                return Response(
                    ClassFacultyAccessSerializer(access, context={"request": request}).data,
                    status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
                )

        # GET: HOD sees everything for the class; faculty see only their own row.
        qs = cls.faculty_accesses.select_related("faculty", "granted_by")
        if not request.user.is_hod:
            profile = getattr(request.user, "faculty_profile", None)
            qs = qs.filter(faculty=profile, is_active=True)
        return Response(ClassFacultyAccessSerializer(qs, many=True).data)

    @action(
        detail=True,
        methods=["delete"],
        url_path="faculty-access/(?P<access_id>[0-9]+)",
        permission_classes=[IsHOD],
    )
    def faculty_access_revoke(self, request, pk=None, access_id=None):
        cls = _class_object_for_user(request, pk)
        try:
            access = cls.faculty_accesses.get(pk=access_id)
        except ClassFacultyAccess.DoesNotExist as exc:
            raise NotFound("Access record not found for this class.") from exc
        access.revoke()
        audit(
            actor=request.user,
            action="class_access_revoked",
            entity_type="ClassFacultyAccess",
            entity_id=access.pk,
            metadata={"class": cls.pk, "faculty": access.faculty_id},
        )
        if access.faculty.user_id and access.faculty.user.is_active:
            notify(
                recipient=access.faculty.user,
                title="Class access revoked",
                message=f"Your access to {cls.display_name} has been revoked.",
                notification_type=Notification.NotificationType.WARNING,
                department_class=cls,
            )
        return Response(
            {"detail": "Access revoked.", "is_active": access.is_active, "revoked_at": access.revoked_at}
        )

    # ------------------------------------------------------- access requests

    @action(detail=True, methods=["post"], url_path="access-requests")
    def access_request_create(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        if not request.user.is_hod:
            raise PermissionDenied("Only the HOD can request access to a class.")

        record_types = request.data.get("record_types") or ["VIEW_RECORDS"]
        reason = request.data.get("reason") or ""
        try:
            duration_days = int(request.data.get("access_duration_days") or 30)
        except (TypeError, ValueError):
            raise ValidationError({"access_duration_days": "Must be a positive integer."})
        if duration_days < 1 or duration_days > 365:
            raise ValidationError({"access_duration_days": "Access duration must be between 1 and 365 days."})

        request_obj = AccessRequest.objects.create(
            requester=request.user,
            department_class=cls,
            record_types=list(record_types),
            reason=reason,
            status=AccessRequest.Status.PENDING,
            expires_at=timezone.now() + timedelta(days=duration_days),
        )
        coordinator = (
            ClassCoordinator.objects.filter(department_class=cls, is_active=True)
            .select_related("faculty__user")
            .first()
        )
        coordinator_email = coordinator.faculty.user.email if coordinator else None
        audit(
            actor=request.user,
            action="access_request_created",
            entity_type="AccessRequest",
            entity_id=request_obj.pk,
            metadata={"class": cls.pk, "record_types": list(record_types)},
        )
        notify(
            recipient=coordinator.faculty.user if coordinator else request.user,
            title="Access request received",
            message=f"{request.user.full_name or 'HOD'} requested access to {cls.display_name}.",
            notification_type=Notification.NotificationType.INFO,
            department_class=cls,
        )
        send_access_request_email(
            hod_email=request.user.email,
            hod_name=request.user.full_name or "HOD",
            department_class_label=cls.display_name,
            requested_record_types=list(record_types),
            reason=reason,
            access_duration_days=duration_days,
        ) if coordinator_email else None

        return Response(
            AccessRequestSerializer(request_obj, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="access-requests")
    def access_request_list(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        if request.method == "POST":
            return self.access_request_create(request, pk=pk)
        qs = AccessRequest.objects.filter(department_class=cls)
        if not request.user.is_hod:
            profile = getattr(request.user, "faculty_profile", None)
            if profile and not ClassCoordinator.objects.filter(
                faculty=profile, department_class=cls, is_active=True
            ).exists():
                qs = qs.filter(requester=request.user)
        return Response(AccessRequestSerializer(qs, many=True, context={"request": request}).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="access-requests/(?P<request_id>[0-9]+)/approve",
    )
    def access_request_approve(self, request, pk=None, request_id=None):
        cls = _class_object_for_user(request, pk)
        access_request = AccessRequest.objects.filter(pk=request_id, department_class=cls).first()
        if not access_request:
            raise NotFound("Access request not found for this class.")
        if access_request.status != AccessRequest.Status.PENDING:
            raise ValidationError({"detail": "Only pending access requests can be approved."})
        coordinator = (
            ClassCoordinator.objects.filter(department_class=cls, is_active=True)
            .select_related("faculty__user")
            .first()
        )
        allowed = request.user.is_hod or (
            coordinator is not None
            and coordinator.faculty.user_id == request.user.id
        )
        if not allowed:
            raise PermissionDenied("Only the assigned class coordinator can approve access requests.")

        grant = AccessGrant.objects.create(
            holder_user=access_request.requester,
            holder_faculty=None,
            department_class=cls,
            access_type=AccessGrant.AccessType.HOD,
            record_types=list(access_request.record_types),
            granted_by=request.user,
            is_active=True,
            expires_at=access_request.expires_at or timezone.now() + timedelta(days=30),
        )
        access_request.status = AccessRequest.Status.APPROVED
        access_request.decided_by = request.user
        access_request.decided_at = timezone.now()
        access_request.decision_note = request.data.get("decision_note") or ""
        access_request.grant = grant
        access_request.save(update_fields=["status", "decided_by", "decided_at", "decision_note", "grant", "updated_at"])

        audit(
            actor=request.user,
            action="access_request_approved",
            entity_type="AccessRequest",
            entity_id=access_request.pk,
            metadata={"class": cls.pk, "grant": grant.pk, "record_types": list(access_request.record_types)},
        )
        notify(
            recipient=access_request.requester,
            title="Access approved",
            message=f"Your access request for {cls.display_name} was approved.",
            notification_type=Notification.NotificationType.SUCCESS,
            department_class=cls,
        )
        send_access_decision_email(
            recipient_email=access_request.requester.email,
            approved=True,
            department_class_label=cls.display_name,
            decided_by=request.user.full_name or "Coordinator",
        )
        return Response(AccessGrantSerializer(grant, context={"request": request}).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="access-requests/(?P<request_id>[0-9]+)/reject",
    )
    def access_request_reject(self, request, pk=None, request_id=None):
        cls = _class_object_for_user(request, pk)
        access_request = AccessRequest.objects.filter(pk=request_id, department_class=cls).first()
        if not access_request:
            raise NotFound("Access request not found for this class.")
        if access_request.status != AccessRequest.Status.PENDING:
            raise ValidationError({"detail": "Only pending access requests can be rejected."})
        coordinator = (
            ClassCoordinator.objects.filter(department_class=cls, is_active=True)
            .select_related("faculty__user")
            .first()
        )
        allowed = request.user.is_hod or (
            coordinator is not None
            and coordinator.faculty.user_id == request.user.id
        )
        if not allowed:
            raise PermissionDenied("Only the assigned class coordinator can reject access requests.")

        access_request.status = AccessRequest.Status.REJECTED
        access_request.decided_by = request.user
        access_request.decided_at = timezone.now()
        access_request.decision_note = request.data.get("decision_note") or ""
        access_request.save(update_fields=["status", "decided_by", "decided_at", "decision_note", "updated_at"])

        audit(
            actor=request.user,
            action="access_request_rejected",
            entity_type="AccessRequest",
            entity_id=access_request.pk,
            metadata={"class": cls.pk, "decision_note": access_request.decision_note},
        )
        notify(
            recipient=access_request.requester,
            title="Access request rejected",
            message=f"Your access request for {cls.display_name} was rejected.",
            notification_type=Notification.NotificationType.WARNING,
            department_class=cls,
        )
        send_access_decision_email(
            recipient_email=access_request.requester.email,
            approved=False,
            department_class_label=cls.display_name,
            decided_by=request.user.full_name or "Coordinator",
        )
        return Response({"detail": "Access request rejected.", "status": access_request.status})

    @action(
        detail=True,
        methods=["post"],
        url_path="access-grants/(?P<grant_id>[0-9]+)/revoke",
    )
    def access_grant_revoke(self, request, pk=None, grant_id=None):
        cls = _class_object_for_user(request, pk)
        grant = AccessGrant.objects.filter(pk=grant_id, department_class=cls).first()
        if not grant:
            raise NotFound("Access grant not found for this class.")
        grant.revoke()
        audit(
            actor=request.user,
            action="class_access_revoked",
            entity_type="AccessGrant",
            entity_id=grant.pk,
            metadata={"class": cls.pk, "holder": grant.holder_user_id},
        )
        send_access_revoked_email(
            recipient_email=grant.holder_user.email,
            department_class_label=cls.display_name,
            revoked_by=request.user.full_name or "Coordinator",
        )
        return Response({"detail": "Access revoked.", "is_active": grant.is_active, "revoked_at": grant.revoked_at})

    # ------------------------------------------------------------------ reports

    @action(detail=True, methods=["get"])
    def reports(self, request, pk=None):
        cls = _class_object_for_user(request, pk)
        records = AttendanceRecord.objects.filter(lecture__section=cls.section).select_related(
            "lecture", "lecture__subject", "roster"
        )
        if cls.academic_year_id:
            records = records.filter(
                Q(lecture__timetable_entry__academic_year_id=cls.academic_year_id)
                | Q(lecture__timetable_entry__isnull=True)
            )
        total = records.aggregate(
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            on_leave=Count("id", filter=Q(status=AttendanceRecord.Status.ON_LEAVE)),
        )
        grand = sum(total.values()) or 0
        by_subject = (
            records.values("lecture__subject__code", "lecture__subject__name")
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
                absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            )
            .order_by("lecture__subject__code")
        )
        by_faculty = (
            records.values("lecture__assigned_faculty__id", "lecture__assigned_faculty__full_name")
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            )
            .order_by("lecture__assigned_faculty__full_name")
        )
        lectures_summary = Lecture.objects.filter(section=cls.section).aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=Lecture.Status.COMPLETED)),
            scheduled=Count("id", filter=Q(status=Lecture.Status.SCHEDULED)),
            cancelled=Count("id", filter=Q(status=Lecture.Status.CANCELLED)),
        )
        return Response(
            {
                "class_id": cls.pk,
                "display_name": cls.display_name,
                "attendance": {
                    "total": grand,
                    **total,
                    "present_percentage": round((total["present"] / grand) * 100, 2) if grand else 0,
                    "by_subject": list(by_subject),
                },
                "lectures": lectures_summary,
                "by_faculty": list(by_faculty),
            }
        )


def _slots_overlap(a, b):
    return a.start_time < b.end_time and b.start_time < a.end_time


def NotFound(message):
    from rest_framework.exceptions import NotFound as DRFNotFound

    return DRFNotFound(message)
