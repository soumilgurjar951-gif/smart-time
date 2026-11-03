#!/usr/bin/env python
"""Show all data in database"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'odrms.settings')
django.setup()

from lectures.models import Subject, Lecture
from faculty.models import FacultyProfile
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "="*60)
print("📊 DATABASE DATA - CDGI SMART TIME")
print("="*60 + "\n")

print("👤 USERS:")
print("-" * 60)
for user in User.objects.all():
    print(f"  • {user.email} | {user.full_name} | {user.role}")

print("\n👨‍🏫 FACULTY PROFILES:")
print("-" * 60)
for fac in FacultyProfile.objects.all()[:5]:
    print(f"  • ID: {fac.id} | {fac.full_name or fac.faculty_code} | {fac.designation}")

print("\n📚 SUBJECTS (CSIT 5th Semester):")
print("-" * 60)
for sub in Subject.objects.all():
    print(f"  • {sub.code} - {sub.name} ({sub.subject_type})")

print("\n📅 LECTURES SCHEDULED:")
print("-" * 60)
lecture_count = Lecture.objects.count()
if lecture_count == 0:
    print("  ❌ No lectures scheduled yet")
else:
    for lec in Lecture.objects.all()[:5]:
        print(f"  • {lec.subject.code} | {lec.section} | {lec.date} | {lec.start_time}")

print("\n" + "="*60)
print(f"Total: {User.objects.count()} users, {FacultyProfile.objects.count()} faculty, {Subject.objects.count()} subjects, {lecture_count} lectures")
print("="*60 + "\n")
