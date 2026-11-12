#!/usr/bin/env python
"""Create/reset the HOD account — credentials are NEVER hardcoded.

This script is a thin launcher for:

    python manage.py create_hod

Set credentials via environment variables (recommended) or let the command
prompt for them:

    DJANGO_HOD_EMAIL=hod@cdgi.edu.in
    DJANGO_HOD_PASSWORD=<strong-password>
    DJANGO_HOD_FULL_NAME="Dr. Head of Department"

Run from the backend directory:

    python create_admin.py                       # prompts for missing values
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "odrms.settings")


def main(*args):
    import django

    django.setup()
    from django.core.management import call_command

    call_command("create_hod", *args)


if __name__ == "__main__":
    cli_args = sys.argv[1:]
    main(*cli_args)
