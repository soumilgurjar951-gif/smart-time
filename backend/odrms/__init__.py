# Make Celery app available when Celery is installed.
# Conditional import so the project works without celery during development.
try:
    from odrms.celery import app as celery_app  # noqa: F401
    __all__ = ["celery_app"]
except ImportError:
    pass
