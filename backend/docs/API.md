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

## Subjects, faculty allocations, and weekly timetable

The weekly timetable is recurring (weekday + period), separate from date-specific `Lecture` occurrences used by attendance. Periods, the lunch interval, CSIT subjects, sections, and unverified faculty-code references are loaded by the timetable migration. No recurring lecture schedule is prefilled because no day/period schedule was supplied.

| Method | Path | Access |
| --- | --- | --- |
| GET/POST | `/api/lectures/subjects/` | GET authenticated; writes HOD |
| GET | `/api/lectures/sections/` | authenticated |
| GET/POST | `/api/lectures/academic-years/` | GET authenticated; writes HOD |
| GET/POST | `/api/lectures/faculty-subjects/` | HOD manages; Faculty sees own |
| GET/POST | `/api/lectures/time-slots/` | GET authenticated; writes HOD |
| GET/POST | `/api/lectures/timetable/entries/` | HOD manages; Faculty sees own |
| GET | `/api/lectures/timetable/entries/daily/?weekday=MONDAY&section=A` | scoped |
| GET | `/api/lectures/timetable/entries/weekly/?section=A` | scoped |
| GET | `/api/lectures/timetable/entries/faculty/?faculty={profile_id}` | HOD selects; Faculty sees own |
| POST | `/api/lectures/timetable/entries/conflicts/` | authenticated validation only || POST | `/api/lectures/timetable/entries/{id}/occurrence/` | HOD or assigned Faculty |
| GET | `/api/lectures/timetable/history/` | HOD |

`FacultySubject` rows loaded from the supplied mapping remain unverified until the HOD completes/activates the faculty profile and verifies the assignment. Timetable entries require a verified subject assignment, an active faculty account, a section, a database time slot, and a classroom/lab. Overlapping faculty or room bookings and duplicate section periods are rejected. Changes are recorded in immutable history and notify the affected active faculty accounts.

An occurrence request body is `{ "date": "YYYY-MM-DD" }` and must match the weekly entry weekday. It creates a date-specific lecture that can be used by the existing per-lecture attendance endpoints.

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

## Classes (independent class/section management)

Every class/section is an isolated management unit (e.g. CSIT 3rd Year 5th Semester Section A vs Section B). Timetables, faculty assignments, attendance, reports and notifications are never combined across classes. Faculty can access only the classes authorized by the HOD; all access checks are enforced server-side and revocation takes effect immediately.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/classes/` | HOD: all classes; Faculty: only granted classes |
| POST | `/api/classes/` | HOD |
| GET/PUT/PATCH | `/api/classes/{class_id}/` | GET authorized users; writes HOD |
| DELETE | `/api/classes/{class_id}/` | HOD (soft deactivates) |
| GET | `/api/classes/{class_id}/dashboard/` | authorized users (class-scoped stats) |
| GET | `/api/classes/{class_id}/timetable/` | authorized users; includes cross-class faculty/room `conflicts` |
| GET | `/api/classes/{class_id}/attendance/?date=&subject=` | authorized faculty/HOD |
| GET | `/api/classes/{class_id}/faculty/` | authorized users; `accesses` list is HOD-only |
| POST | `/api/classes/{class_id}/assign-faculty/` | HOD (`faculty`, `subject`); auto-grants VIEW access if none exists (revoked rows are never reactivated) |
| GET | `/api/classes/{class_id}/subjects/` | authorized users |
| POST | `/api/classes/{class_id}/subjects/` | HOD (`subject`) |
| GET | `/api/classes/{class_id}/faculty-access/` | HOD: full class list; Faculty: own active row |
| POST | `/api/classes/{class_id}/faculty-access/` | HOD (`faculty`, `permissions`) |
| DELETE | `/api/classes/{class_id}/faculty-access/{access_id}/` | HOD (revokes immediately) |
| GET | `/api/classes/{class_id}/reports/` | authorized users (per-class report) |
| GET | `/api/classes/summary/` | HOD only — explicit cross-class comparison |
| GET/POST | `/api/departments/` | GET authenticated (scoped); writes HOD |

Permissions: `VIEW`, `MANAGE_TIMETABLE`, `MARK_ATTENDANCE`, `MANAGE_RESOURCES`, `MANAGE_TASKS`. Every timetable entry, lecture and attendance record links back to a class row (`academic_class`) that is resolved automatically on save. Automated tasks (daily lecture reminders, weekly attendance summaries, access-granted/revoked notifications) attach the class ID to every class-specific notification.

Seed/repair command: `python manage.py seed_classes [--relink]` — creates the CSIT department and Section A/B class units, links subjects, and back-fills existing timetable/lecture rows to their class without copying data between classes.
