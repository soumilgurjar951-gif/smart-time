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

The `lectures` app also stores recurring weekly timetable entries, configurable time slots (including the lunch break), academic-year/section references, faculty-subject allocations, conflict validation, change history, and attendance-linked lecture occurrences. The initial reference-data migration loads the specified CSIT 5th semester subjects and initials-only faculty profiles; no class schedule or missing faculty contact data is fabricated.

## Google Gmail API Integration

Transactional emails (HOD access requests, approvals/rejections, revocations, expirations) are sent through the **Gmail API v1** using an **OAuth 2.0 refresh token**. Credentials live only on the backend (`backend/.env`, gitignored).

### Google Cloud setup

1. Open Google Cloud Console → select/create project → **APIs & Services → Enable "Gmail API"**.
2. **OAuth consent screen**: External → add scope `https://www.googleapis.com/auth/gmail.send` → add test users (your Gmail address).
3. **Credentials → Create OAuth Client ID** → Application type **Web application** → Authorized redirect URI:
   `http://localhost:8000/api/auth/google/callback/`
4. Copy Client ID + Client Secret into `backend/.env` (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`).
5. Obtain a refresh token via the backend flow:
   - `GET /api/auth/google/authorize/` → returns `auth_url` (open in browser, authorize).
   - Google redirects to `GET /api/auth/google/callback/?code=...&state=...` → token exchange + store refresh token.
6. Set remaining values: `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_SENDER_EMAIL`, `GMAIL_SCOPES`, `GOOGLE_AUTH_REDIRECT_URI`.

### Environment variables (`backend/.env`)

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_SENDER_EMAIL=you@gmail.com
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.send
GOOGLE_AUTH_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/
```

### Sending emails

Use the reusable service in `notifications.email_service`:

- `send_email(to_email, subject, body)` → raw Gmail API send.
- `send_access_request_email(...)`, `send_access_decision_email(...)`, `send_access_revoked_email(...)`, `send_access_expiration_email(...)` → event-specific notifications.

### Error handling & tests

- Missing OAuth config → graceful `GMAIL_NOT_CONFIGURED` result; API exceptions → `GMAIL_API_ERROR` / `EMAIL_SEND_FAILED` (logged, never leaked to clients).
- Covered by `python manage.py test notifications` (8 tests).

## Security notes

- Passwords are hashed with Django’s password hashers.
- Access tokens are short-lived; logout blacklists the refresh token.
- Faculty cannot read other faculty records or HOD-only write endpoints.
- Uploaded achievement files are type- and size-checked.
- CORS origins come from `DJANGO_CORS_ALLOWED_ORIGINS`.

Full endpoint reference: [docs/API.md](docs/API.md).
