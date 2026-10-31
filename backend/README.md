# ODRMS Backend

Secure Django REST API for the Online Departmental Resource Management System.

- Department: CSIT
- Year / semester: 3rd year, 5th semester
- Sections: A, B
- Roles: HOD, Faculty

There is no student portal. Attendance uses a roster table so student accounts can be attached later.

## Stack

Python, Django, Django REST Framework, Simple JWT, MySQL, django-filter, django-cors-headers.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Create a MySQL database and user, then set `DB_*` values in `.env`.

```sql
CREATE DATABASE odrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'odrms'@'localhost' IDENTIFIED BY 'your-mysql-password';
GRANT ALL PRIVILEGES ON odrms.* TO 'odrms'@'localhost';
FLUSH PRIVILEGES;
```

For local work without MySQL, set:

```
DB_ENGINE=django.db.backends.sqlite3
```

Apply schema and create the HOD account (`createsuperuser` assigns the HOD role):

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

API root: `http://localhost:8000/api/`

Point the React app at this backend with `VITE_API_URL=http://localhost:8000/api`.

## Tests

Tests use SQLite automatically when `manage.py test` runs.

```bash
python manage.py test
```

Covered behaviour includes JWT login, role isolation, lecture overlap, duplicate attendance, achievement review, and resource booking conflicts.

## Apps

| App | Responsibility |
| --- | --- |
| `accounts` | Users, JWT, roles, profile |
| `faculty` | Faculty profiles and HOD CRUD |
| `lectures` | Subjects, lectures, timetables |
| `attendance` | Roster + per-lecture attendance |
| `tasks` | Departmental tasks and updates |
| `achievements` | Faculty achievement submissions |
| `resources` | Resources and bookings |
| `reports` | Analytics endpoints |

## Security notes

- Passwords are hashed with Django’s password hashers.
- Access tokens are short-lived; logout blacklists the refresh token.
- Faculty cannot read other faculty records or HOD-only write endpoints.
- Uploaded achievement files are type- and size-checked.
- CORS origins come from `DJANGO_CORS_ALLOWED_ORIGINS`.

Full endpoint reference: [docs/API.md](docs/API.md).
