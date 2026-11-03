"""
Celery tasks for the odrms project-level utilities.
"""

from __future__ import annotations

import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="odrms.celery_tasks.backup_database")
def backup_database() -> str:
    """
    Back up the configured database.

    - SQLite: copies the db.sqlite3 file.
    - MySQL: runs mysqldump.

    Backups older than 7 days are rotated out automatically.
    """
    import django
    from django.conf import settings

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = Path(settings.BASE_DIR) / "backups"
    backup_dir.mkdir(exist_ok=True)

    db = settings.DATABASES["default"]
    engine = db.get("ENGINE", "")

    if "sqlite3" in engine:
        src = Path(db["NAME"])
        dst = backup_dir / f"odrms_{timestamp}.sqlite3"
        import shutil

        shutil.copy2(src, dst)
        logger.info("SQLite backup saved to %s", dst)
        result = str(dst)
    elif "mysql" in engine:
        dst = backup_dir / f"odrms_{timestamp}.sql.gz"
        cmd = [
            "mysqldump",
            f"--host={db.get('HOST', '127.0.0.1')}",
            f"--port={db.get('PORT', '3306')}",
            f"--user={db.get('USER', 'odrms')}",
            f"--password={db.get('PASSWORD', '')}",
            "--single-transaction",
            "--routines",
            "--triggers",
            db["NAME"],
        ]
        with open(dst, "wb") as f_out:
            dump = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            gzip = subprocess.Popen(["gzip", "-c"], stdin=dump.stdout, stdout=f_out)
            dump.stdout.close()
            gzip.communicate()
        if dump.returncode not in (0, None):
            logger.error("mysqldump failed: %s", dump.stderr.read())
        else:
            logger.info("MySQL backup saved to %s", dst)
        result = str(dst)
    else:
        logger.warning("Unknown database engine %s; skipping backup.", engine)
        return "skipped"

    # Rotate: delete backups older than 7 days
    cutoff = datetime.now().timestamp() - 7 * 86400
    for old in backup_dir.iterdir():
        if old.stat().st_mtime < cutoff:
            old.unlink(missing_ok=True)
            logger.info("Rotated old backup: %s", old)

    return result

