#!/usr/bin/env python
"""Create admin user for Django admin panel"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'odrms.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Check if user exists
email = 'hod@cdgi.edu.in'
if User.objects.filter(email=email).exists():
    print(f"✅ User {email} already exists!")
    user = User.objects.get(email=email)
else:
    # Create new superuser
    user = User.objects.create_superuser(
        email=email,
        password='admin123',
        full_name='HOD - Chameli Devi Group of Institutions',
        role='HOD'
    )
    print(f"✅ Created new superuser: {email}")

# Ensure user has admin access
user.is_staff = True
user.is_superuser = True
user.is_active = True
user.save()

print(f"\n{'='*60}")
print(f"🔐 ADMIN LOGIN CREDENTIALS")
print(f"{'='*60}")
print(f"URL: http://localhost:8000/admin/")
print(f"Email: {email}")
print(f"Password: admin123")
print(f"Staff: {user.is_staff}")
print(f"Superuser: {user.is_superuser}")
print(f"{'='*60}\n")
