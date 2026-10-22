// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { TimeFlowProvider } from './context/TimeFlowContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageFaculty from './pages/ManageFaculty';
import ManageSubjects from './pages/ManageSubjects';
import ManageClasses from './pages/ManageClasses';
import TimetableBuilder from './pages/TimetableBuilder';
import Substitutions from './pages/Substitutions';
import FacultyTimetable from './pages/FacultyTimetable';

// Dashboard Layout wrapper containing Sidebar and Topbar
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TimeFlowProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Dashboard Routes */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="timetable-builder" element={<TimetableBuilder />} />
            <Route path="substitutions" element={<Substitutions />} />
            <Route path="faculty" element={<ManageFaculty />} />
            <Route path="subjects" element={<ManageSubjects />} />
            <Route path="classes" element={<ManageClasses />} />
            <Route path="faculty-timetable" element={<FacultyTimetable />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </TimeFlowProvider>
  );
}
