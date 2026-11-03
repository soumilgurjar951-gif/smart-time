"""
Standalone database backup script.

Can be run directly (no Django required) or called from Celery.

Usage:
    python scripts/backup_db.py

Reads .env from the backend directory automatically.
Defaults to SQLite backup if DB_ENGINE is not mysql.

Backups are written to backend/backups/ with a timestamp.
Files older than RETAIN_DAYS (default 7) are deleted.
"""

import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Allow running from any directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("backup")

RETAIN_DAYS = int(os.getenv("BACKUP_RETAIN_DAYS", "7"))
BACKUP_DIR = BACKEND_DIR / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
engine = os.getenv("DB_ENGINE", "django.db.backends.sqlite3")


def backup_sqlite():
    src = BACKEND_DIR / "db.sqlite3"
    if not src.exists():
        logger.warning("db.sqlite3 not found at %s", src)
        return None
    dst = BACKUP_DIR / f"odrms_{timestamp}.sqlite3"
    shutil.copy2(src, dst)
    logger.info("SQLite backup → %s", dst)
    return dst


def backup_mysql():
    db_name = os.getenv("DB_NAME", "odrms")
    user = os.getenv("DB_USER", "odrms")
    password = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "3306")

    dst = BACKUP_DIR / f"odrms_{timestamp}.sql.gz"
    cmd_dump = [
        "mysqldump",
        f"--host={host}",
        f"--port={port}",
        f"--user={user}",
        f"--password={password}",
        "--single-transaction",
        "--routines",
        "--triggers",
        db_name,
    ]
    try:
        with open(dst, "wb") as f_out:
            dump = subprocess.Popen(cmd_dump, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            gzip = subprocess.Popen(["gzip", "-c"], stdin=dump.stdout, stdout=f_out)
            dump.stdout.close()
            gzip.communicate()
        if dump.returncode not in (0, None):
            logger.error("mysqldump error: %s", dump.stderr.read().decode())
            dst.unlink(missing_ok=True)
            return None
        logger.info("MySQL backup → %s", dst)
        return dst
    except FileNotFoundError:
        logger.error("mysqldump not found. Ensure MySQL client tools are installed.")
        return None


def rotate_old_backups():
    cutoff = datetime.now().timestamp() - RETAIN_DAYS * 86400
    for old in BACKUP_DIR.iterdir():
        if old.is_file() and old.stat().st_mtime < cutoff:
            old.unlink()
            logger.info("Rotated old backup: %s", old.name)


if __name__ == "__main__":
    if "mysql" in engine:
        result = backup_mysql()
    else:
        result = backup_sqlite()

    if result:
        logger.info("Backup complete: %s", result)
    else:
        logger.error("Backup failed.")
        sys.exit(1)

    rotate_old_backups()

