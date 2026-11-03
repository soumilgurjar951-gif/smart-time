// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OdrmsProvider } from './context/OdrmsContext';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import Login from './pages/auth/Login';
import HodDashboard from './pages/hod/HodDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyManagement from './pages/faculty/FacultyManagement';
import FacultyOnboarding from './pages/faculty/FacultyOnboarding';
import LectureManagement from './pages/lectures/LectureManagement';
import AttendanceManagement from './pages/attendance/AttendanceManagement';
import TaskManagement from './pages/tasks/TaskManagement';
import AchievementManagement from './pages/achievements/AchievementManagement';
import ResourceManagement from './pages/resources/ResourceManagement';
import ReportsAnalytics from './pages/reports/ReportsAnalytics';
import AutomationHub from './pages/AutomationHub';
import TimetableManagement from './pages/TimetableManagement';
import ClassWorkspace from './pages/classes/ClassWorkspace';

function RoleBasedHomeRedirect() {
  const { user, isHod } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return isHod ? (
    <Navigate to="/hod/dashboard" replace />
  ) : (
    <Navigate to="/faculty/dashboard" replace />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OdrmsProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected App Routes */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<RoleBasedHomeRedirect />} />
                <Route path="hod/dashboard" element={<HodDashboard />} />
                <Route path="classes" element={<ClassWorkspace />} />
                <Route path="faculty/dashboard" element={<FacultyDashboard />} />
                <Route path="faculty/onboarding" element={<FacultyOnboarding />} />
                <Route path="faculty" element={<FacultyManagement />} />
                <Route path="lectures" element={<LectureManagement />} />
                <Route path="timetable" element={<TimetableManagement />} />
                <Route path="attendance" element={<AttendanceManagement />} />
                <Route path="tasks" element={<TaskManagement />} />
                <Route path="achievements" element={<AchievementManagement />} />
                <Route path="resources" element={<ResourceManagement />} />
                <Route path="reports" element={<ReportsAnalytics />} />
                <Route path="automation" element={<AutomationHub />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </OdrmsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
