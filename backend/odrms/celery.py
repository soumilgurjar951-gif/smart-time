"""
Celery application for ODRMS.

Start a worker:
    celery -A odrms worker -l info

Start the beat scheduler (periodic tasks):
    celery -A odrms beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

Requires Redis and django-celery-beat (add to requirements.txt and INSTALLED_APPS).
"""

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "odrms.settings")

app = Celery("odrms")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed app modules named `celery_tasks`
app.autodiscover_tasks(related_name="celery_tasks")

# ---------------------------------------------------------------------------
# Periodic schedule
# ---------------------------------------------------------------------------
app.conf.beat_schedule = {
    # Daily at 07:00 IST — send each faculty their lecture schedule for the day
    "daily-lecture-schedule": {
        "task": "lectures.celery_tasks.send_daily_lecture_schedule",
        "schedule": crontab(hour=7, minute=0),
    },
    # Daily at 08:00 IST — task deadline reminders (≤24 h remaining)
    "deadline-reminders": {
        "task": "tasks.celery_tasks.send_deadline_reminders",
        "schedule": crontab(hour=8, minute=0),
    },
    # Daily at 08:15 IST — pending-task summary for HOD
    "hod-pending-summary": {
        "task": "tasks.celery_tasks.send_pending_task_summary_to_hod",
        "schedule": crontab(hour=8, minute=15),
    },
    # Daily at 09:00 IST — flag overdue tasks
    "flag-overdue-tasks": {
        "task": "tasks.celery_tasks.flag_overdue_tasks",
        "schedule": crontab(hour=9, minute=0),
    },
    # Weekly Monday at 06:00 IST — attendance summary report
    "weekly-attendance-report": {
        "task": "attendance.celery_tasks.generate_weekly_attendance_report",
        "schedule": crontab(hour=6, minute=0, day_of_week="monday"),
    },
    # Daily at 02:00 IST — database backup (SQLite / mysqldump)
    "nightly-db-backup": {
        "task": "odrms.celery_tasks.backup_database",
        "schedule": crontab(hour=2, minute=0),
    },
}

app.conf.timezone = "Asia/Kolkata"

