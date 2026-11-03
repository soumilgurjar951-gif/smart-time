import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "odrms.settings")
import django
django.setup()
from lectures.models import Subject
import inspect
print("Subject file:", inspect.getfile(Subject))
print("Subject fields:", [f.name for f in Subject._meta.get_fields()])

