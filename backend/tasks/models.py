from django.conf import settings
from django.db import models
from django.utils import timezone


class DepartmentTask(models.Model):
    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        OVERDUE = "OVERDUE", "Overdue"
        REJECTED = "REJECTED", "Rejected"

    title = models.CharField(max_length=200)
    description = models.TextField()
    assigned_faculty = models.ForeignKey(
        "faculty.FacultyProfile",
        on_delete=models.PROTECT,
        related_name="tasks",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_tasks",
    )
    priority = models.CharField(max_length=16, choices=Priority.choices, default=Priority.MEDIUM)
    deadline = models.DateField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    progress = models.PositiveSmallIntegerField(default=0)
    submission_notes = models.TextField(blank=True)
    update_requested_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(progress__lte=100), name="task_progress_max_100"),
        ]

    def __str__(self):
        return self.title

    def refresh_status(self, save=True):
        if self.status == self.Status.COMPLETED:
            return
        if self.deadline < timezone.localdate() and self.status != self.Status.REJECTED:
            self.status = self.Status.OVERDUE
            if save:
                self.save(update_fields=["status", "updated_at"])


class TaskUpdate(models.Model):
    task = models.ForeignKey(DepartmentTask, on_delete=models.CASCADE, related_name="updates")
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="task_updates",
    )
    progress = models.PositiveSmallIntegerField()
    notes = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Update {self.pk} for {self.task_id}"
