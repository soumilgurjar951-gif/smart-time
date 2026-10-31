# ODRMS REST API

Base URL: `http://localhost:8000`

All endpoints except login, refresh, and health require `Authorization: Bearer <access_token>`.

Roles: `HOD`, `FACULTY`. Scope is CSIT, 3rd year, 5th semester, sections A and B.

Error shape:

```json
{
  "success": false,
  "error": {
    "code": "permission_denied",
    "message": "HOD role is required.",
    "details": {}
  }
}
```

Pagination uses `page` and optional `page_size` (max 100).

## Authentication

| Method | Path | Access | Body |
| --- | --- | --- | --- |
| POST | `/api/auth/login/` | public | `{ "email", "password" }` |
| POST | `/api/auth/refresh/` | public | `{ "refresh" }` |
| POST | `/api/auth/logout/` | auth | `{ "refresh" }` |
| GET | `/api/auth/profile/` | auth | |
| POST | `/api/auth/password/` | auth | `{ "current_password", "new_password" }` |

Login returns `access`, `refresh`, and `user`.

## Faculty

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/faculty/` | HOD: all; Faculty: self |
| POST | `/api/faculty/` | HOD |
| GET | `/api/faculty/{id}/` | HOD or owner |
| PUT/PATCH | `/api/faculty/{id}/` | HOD full; Faculty: name/contact only |
| DELETE | `/api/faculty/{id}/` | HOD |

Create body includes `password`, `employee_id`, `full_name`, `email`, `designation`, `contact_number`, `assigned_subject_ids`, `assigned_sections` (`["A"]` / `["B"]` / both).

## Lectures

| Method | Path | Access |
| --- | --- | --- |
| GET/POST | `/api/lectures/subjects/` | GET auth; write HOD |
| GET | `/api/lectures/` | HOD all; Faculty own schedule |
| POST | `/api/lectures/` | HOD |
| GET/PUT/PATCH/DELETE | `/api/lectures/{id}/` | write HOD; Faculty may update topic/status on own lectures |
| GET | `/api/lectures/timetable/daily/?date=YYYY-MM-DD` | scoped |
| GET | `/api/lectures/timetable/weekly/?week_start=YYYY-MM-DD` | scoped |

Filters: `section`, `date`, `subject`, `assigned_faculty`, `status`, `lecture_type`.

Overlapping lectures for the same faculty are rejected. Duration must be 30–240 minutes.

## Attendance

Roster identities are not user accounts. They can later map to student users.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/attendance/roster/` | auth |
| POST/PUT/DELETE | `/api/attendance/roster/` | HOD |
| GET | `/api/attendance/` | HOD all; Faculty own lectures |
| POST | `/api/attendance/` | HOD or assigned faculty |
| PUT/PATCH | `/api/attendance/{id}/` | HOD or assigned faculty |
| GET | `/api/attendance/reports/` | scoped |

Record body: `{ "lecture", "roster", "status": "PRESENT|ABSENT|ON_LEAVE", "remarks" }`.

Additional filters: `date`, `subject`, `section`.

## Tasks

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/tasks/` | HOD all; Faculty assigned |
| POST | `/api/tasks/` | HOD |
| GET/PUT | `/api/tasks/{id}/` | Faculty: progress/notes/status only |
| POST | `/api/tasks/{id}/updates/` | assigned faculty or HOD |
| POST | `/api/tasks/{id}/request-update/` | HOD |
| POST | `/api/tasks/{id}/review/` | HOD `{ "status": "COMPLETED\|REJECTED\|IN_PROGRESS" }` |

## Achievements

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/achievements/` | HOD all; Faculty own |
| POST | `/api/achievements/` | Faculty self; HOD any |
| PUT | `/api/achievements/{id}/` | owner while `PENDING` |
| POST | `/api/achievements/{id}/review/` | HOD `{ "verification_status": "APPROVED\|REJECTED", "review_notes" }` |

Supporting files: PDF, PNG, JPG, JPEG, DOC, DOCX, max 5 MB. Use `multipart/form-data` for uploads.

## Resources

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/resources/` | auth |
| POST/PUT | `/api/resources/` `{id}` | HOD |
| GET/POST | `/api/resources/bookings/` | Faculty sees own bookings |
| POST | `/api/resources/bookings/{id}/review/` | HOD `{ "status": "APPROVED\|REJECTED", "review_notes" }` |

Approved bookings cannot overlap on the same resource and date.

## Reports

Query params: `faculty`, `subject`, `section`, `date_from`, `date_to`. Faculty callers are limited to their own data.

| Method | Path |
| --- | --- |
| GET | `/api/reports/tasks/` |
| GET | `/api/reports/lectures/` |
| GET | `/api/reports/attendance/` |
| GET | `/api/reports/resources/` |
| GET | `/api/reports/achievements/` |
| GET | `/api/reports/pending-updates/` |

## Health

`GET /api/health/` — public service metadata.
