# Online Departmental Resource Management System (ODRMS)

A complete, modern, responsive frontend application for academic departmental resource administration.

## Scope & Specifications

- **Institution:** Chameli Devi Group of Institutions (CDGI), Indore
- **Department:** Computer Science & Information Technology (**CSIT**)
- **Academic Year:** **3rd Year**
- **Semester:** **5th Semester**
- **Sections:** **Section A** and **Section B**
- **User Roles:**
  1. **HOD** (Head of Department)
  2. **Faculty**
- *(Strictly departmental scope: Student portal and outside departments are excluded as per design prompt)*

---

## Technology Stack

- **Framework:** React 19 with Vite
- **Language:** Modern JavaScript (ES Modules)
- **Styling:** Tailwind CSS (with responsive layouts & dark mode support)
- **Routing:** React Router DOM (v7)
- **HTTP Client:** Axios (Centralized API client with JWT interceptors)
- **Icons:** Lucide React
- **Analytics & Data Visualization:** Recharts

---

## Architecture & Project Structure

```text
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx              # Header with role badge, dark mode, notifications
│   │   ├── Sidebar.jsx             # Responsive role-aware sidebar navigation
│   │   └── AppLayout.jsx           # App layout shell with responsive drawer
│   ├── common/
│   │   ├── StatCard.jsx            # Metric summary cards with badges
│   │   ├── Modal.jsx               # Accessible dialog modal
│   │   ├── Button.jsx              # Reusable variant buttons with loading spinners
│   │   ├── Badge.jsx               # Status & priority color-coded chips
│   │   ├── EmptyState.jsx          # Illustrated empty states with actions
│   │   ├── LoadingSpinner.jsx      # Async loading indicator
│   │   ├── SearchInput.jsx         # Debounced search bar with clear button
│   │   └── Toast.jsx               # Floating feedback alerts
│   ├── forms/
│   │   ├── FacultyForm.jsx         # Add/Edit faculty with CSIT subjects & section allocations
│   │   ├── LectureForm.jsx         # Schedule/Edit 5th Sem lectures (Theory/Lab)
│   │   ├── TaskForm.jsx            # HOD task assignment with deadlines & priority
│   │   ├── AchievementForm.jsx     # Submit scholarly publications & certificates
│   │   ├── ResourceForm.jsx        # Manage departmental facilities & labs
│   │   └── BookingForm.jsx         # Request classroom/lab reservation
│   └── charts/
│       ├── AttendanceChart.jsx     # Section A vs Section B comparative chart
│       ├── TaskProgressChart.jsx   # Donut status distribution chart
│       └── ResourceChart.jsx       # Facility utilization bar chart
├── pages/
│   ├── auth/
│   │   └── Login.jsx               # Role-based login with show/hide password & demo fill
│   ├── hod/
│   │   └── HodDashboard.jsx        # HOD command center (metrics, tasks, bookings, activities)
│   ├── faculty/
│   │   ├── FacultyDashboard.jsx    # Faculty timetable, today's lectures, pending tasks
│   │   └── FacultyManagement.jsx   # Faculty roster, profiles, section & subject mapping
│   ├── lectures/
│   │   └── LectureManagement.jsx   # Daily & weekly timetable grid for Sec A (301) & Sec B (302)
│   ├── attendance/
│   │   └── AttendanceManagement.jsx# Per-lecture student attendance register (Present/Absent/Leave)
│   ├── tasks/
│   │   └── TaskManagement.jsx      # Accreditation & exam task workflow with progress updates
│   ├── achievements/
│   │   └── AchievementManagement.jsx# Research papers, patents, FDPs & HOD verification
│   ├── resources/
│   │   └── ResourceManagement.jsx  # Smart classrooms, computing clusters & booking approvals
│   └── reports/
│       └── ReportsAnalytics.jsx    # Accreditation audit reports with PDF print & CSV export
├── services/
│   ├── api.js                      # Centralized Axios instance with JWT interceptors
│   ├── authService.js              # Authentication service & token handling
│   ├── facultyService.js           # Faculty CRUD operations
│   ├── lectureService.js           # Timetable & lecture scheduling
│   ├── attendanceService.js        # Per-lecture attendance recording & history
│   ├── taskService.js              # Task delegation & completion reports
│   ├── achievementService.js       # Faculty research & certificate approvals
│   ├── resourceService.js          # Facility availability & booking workflow
│   └── reportService.js           # Department metrics & analytical aggregates
├── context/
│   ├── AuthContext.jsx             # User authentication & role management
│   ├── ThemeContext.jsx            # Light/Dark mode state & persistence
│   └── OdrmsContext.jsx            # Departmental event bus & toast notifications
├── utils/
│   ├── constants.js                # CSIT 5th Sem subjects, time slots, room mapping
│   ├── formatters.js               # Date/time & badge formatting utilities
│   └── storage.js                  # Persistent local storage & seed data
├── App.jsx                         # Main router configuration & route protection
└── main.jsx                        # React root entry point
```

---

## 10 Departmental Modules

1. **Authentication & Role-Based Redirection (`/login`)**
   - Username/email and password with password visibility toggle.
   - 1-click demo access for **HOD** (`hod.csit@cdgi.edu.in`) and **Faculty** (`ananya.mukherjee@cdgi.edu.in`).
   - Dynamic redirection based on user role.

2. **HOD Dashboard (`/hod/dashboard`)**
   - High-level KPIs: Total faculty, assigned lectures, pending accreditation tasks, resource booking requests, faculty achievements, and attendance rates.
   - Interactive Section A vs Section B comparative charts.
   - Real-time departmental activity feed.

3. **Faculty Dashboard (`/faculty/dashboard`)**
   - Today's lectures with direct 1-click **"Take Attendance"** shortcut.
   - Upcoming weekly lecture commitments.
   - Assigned tasks with deadline warnings and status progress.
   - Departmental notices and personal achievement counters.

4. **Faculty Management (`/faculty`)**
   - Register, edit, and view CSIT 3rd Year / 5th Sem faculty members.
   - Manage assigned subjects (TOC, DBMS, DAA, SE, WTC, Labs, Project).
   - Assign teaching sections (**Section A**, **Section B**, or **Both**).
   - Search by name, employee ID, and filter by status/section.

5. **Lecture Management & Timetable (`/lectures`)**
   - Dual view: **List View** with filters & **Weekly Timetable Grid** (Period 1 to 6).
   - Allocate classrooms (e.g. CSIT Smart Classroom 301 for Sec A, 302 for Sec B, Turing Computing Lab 1 for DAA Practicals).
   - Track curriculum topics and lecture completion status.

6. **Per-Lecture Attendance Register (`/attendance`)**
   - Select lecture to load authorized student roster (Roll 0827CS231001 to 0827CS231120).
   - Mark students as **Present**, **Absent**, or **On Leave**.
   - 1-Click **"All Present"** shortcut and real-time percentage calculator.
   - Historical attendance audit logs with date, subject, and section filters.

7. **Task Management (`/tasks`)**
   - HOD assigns departmental tasks (NAAC course files, mid-sem exam papers, lab environment audits).
   - Set deadlines, priorities (High, Medium, Low), and section scope.
   - Faculty submits progress percentages and completion reports.
   - HOD review and sign-off interface.

8. **Faculty Achievements & Verification (`/achievements`)**
   - Categories: **Awards**, **Certifications**, **Publications**, **Workshops**, **FDPs**, **Patents**.
   - Certificate file upload simulator with digital timestamping.
   - HOD review interface to approve, request revisions, or reject.

9. **Resource Management & Booking (`/resources`)**
   - Manage Smart Classrooms 301/302, Turing Block Lab 1, Ada Lovelace Lab 2, CSIT Seminar Hall, and 4K mobile projectors.
   - Real-time availability indicator: **Available**, **Booked**, **Under Maintenance**.
   - Faculty booking request form with purpose and expected attendees.
   - HOD approval/rejection decision interface with notes.

10. **Reports & Departmental Analytics (`/reports`)**
    - Section A vs Section B attendance comparison charts.
    - Faculty workload and task completion tables.
    - Resource utilization analysis.
    - One-click **Export CSV** and print-ready **Official PDF Report** with CDGI institutional header.

---

## Installation & Setup Instructions

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Clone / Navigate to Project Directory
```bash
cd smart-time
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME="Online Departmental Resource Management System"
VITE_DEPARTMENT="CSIT"
VITE_SEMESTER="5th Semester (3rd Year)"
VITE_ENABLE_MOCK_FALLBACK=true
```

### 5. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 6. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in `dist/`.

---

## Demo Credentials

| Role | Username / Institutional Email | Password | Assigned Scope |
| :--- | :--- | :--- | :--- |
| **HOD** | `hod.csit@cdgi.edu.in` | `password123` | Full CSIT 5th Sem Administration |
| **Faculty** | `ananya.mukherjee@cdgi.edu.in` | `password123` | DBMS & DBMS Lab (Section A) |
| **Faculty** | `vikram.rathore@cdgi.edu.in` | `password123` | DAA & DAA Lab (Section B Mentor) |
