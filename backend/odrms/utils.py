from datetime import datetime, time
from django.utils import timezone


def time_ranges_overlap(start_a: time, end_a: time, start_b: time, end_b: time) -> bool:
    return start_a < end_b and start_b < end_a


def parse_date(value, default=None):
    if not value:
        return default if default is not None else timezone.localdate()
    if hasattr(value, "year"):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def duration_minutes(start: time, end: time) -> int:
    start_delta = datetime.combine(datetime.min, start)
    end_delta = datetime.combine(datetime.min, end)
    return int((end_delta - start_delta).total_seconds() // 60)
