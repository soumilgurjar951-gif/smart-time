// src/pages/hod/HodDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CalendarDays,
  CheckSquare,
  Building2,
  Award,
  ClipboardCheck,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Clock,
  Layers,
  GraduationCap,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import AttendanceChart from '../../components/charts/AttendanceChart';
import TaskProgressChart from '../../components/charts/TaskProgressChart';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { reportService } from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';
import { useOdrms } from '../../context/OdrmsContext';
import { DEPARTMENT_INFO } from '../../utils/constants';

export default function HodDashboard() {
  const { user } = useAuth();
  const { recentActivities, counts } = useOdrms();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await reportService.getDepartmentOverview();
        setOverview(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading HOD Departmental Command Center..." />;
  }

  const metrics = overview?.metrics || {};

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-lg shrink-0 flex items-center justify-center">
              <img
                src="/cdgi-logo.png"
                alt="CDGI Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold backdrop-blur-xs mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{DEPARTMENT_INFO.department} Department • {DEPARTMENT_INFO.year} / {DEPARTMENT_INFO.semester}</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                Welcome, {user?.name || 'Dr. Rajiv Sharma (HOD)'}
              </h1>
              <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
                Online Departmental Resource Management System • Monitoring Sections A & B lectures, faculty workloads, resource allocation, and accreditation deliverables.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to="/tasks">
              <Button variant="secondary" size="sm" icon={PlusCircle}>
                Assign Task
              </Button>
            </Link>
            <Link to="/lectures">
              <Button size="sm" icon={CalendarDays} className="bg-white text-indigo-700 hover:bg-indigo-50">
                Schedule Lecture
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Department Faculty"
          value={counts.facultyCount || metrics.totalFaculty || 6}
          subtitle="All assigned to 5th Sem CSIT"
          icon={Users}
          color="indigo"
          badge="100% Active"
        />

        <StatCard
          title="Assigned Lectures"
          value={metrics.assignedLectures || 8}
          subtitle={`${metrics.completedLectures || 3} Completed / Today`}
          icon={CalendarDays}
          color="blue"
          badge="Sec A & B"
        />

        <StatCard
          title="Pending Department Tasks"
          value={counts.pendingTasksCount || metrics.pendingTasks || 3}
          subtitle="Course files & Exam setup"
          icon={CheckSquare}
          color="amber"
          badge={counts.pendingTasksCount > 0 ? 'Action Req' : 'Clear'}
          badgeColor="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        />

        <StatCard
          title="Resource Booking Requests"
          value={counts.pendingBookingsCount || metrics.pendingBookings || 1}
          subtitle="Labs, Classrooms & Projector"
          icon={Building2}
          color="rose"
          badge={counts.pendingBookingsCount > 0 ? 'Pending HOD Approval' : 'All Approved'}
          badgeColor="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
        />
      </div>

      {/* Secondary Metrics: Achievements & Attendance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Faculty Achievements"
          value={counts.pendingAchievementsCount || metrics.pendingAchievements || 2}
          subtitle="Awaiting HOD verification"
          icon={Award}
          color="purple"
          badge="Certificates Uploaded"
        />

        <StatCard
          title="Section A Attendance"
          value={`${metrics.attendanceSecA || 92.4}%`}
          subtitle="60 Students enrolled in Sec A"
          icon={ClipboardCheck}
          color="emerald"
          badge="Above 75% Target"
        />

        <StatCard
          title="Section B Attendance"
          value={`${metrics.attendanceSecB || 93.1}%`}
          subtitle="60 Students enrolled in Sec B"
          icon={TrendingUp}
          color="emerald"
          badge="Above 75% Target"
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance by Subject (Sec A vs Sec B) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Attendance Comparison by Subject
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CSIT 5th Semester • Section A vs Section B
              </p>
            </div>
            <Link
              to="/attendance"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Detailed Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <AttendanceChart data={overview?.attendanceBySubject} />
        </div>

        {/* Task Completion Status Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Departmental Task Health
              </h3>
              <Link
                to="/tasks"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </Link>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Status distribution of assigned duties
            </p>

            <TaskProgressChart data={overview?.taskDistribution} />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              NAAC / NBA Accreditation Deliverables in Progress
            </span>
          </div>
        </div>
      </div>

      {/* Recent Departmental Activities & Quick Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Recent Departmental Activities
            </h3>
            <span className="text-xs font-semibold text-slate-400">Real-time Stream</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{act.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{act.subtitle}</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-400 shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Shortcuts Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>HOD Direct Administrative Actions</span>
            </div>

            <h3 className="text-lg font-bold">Quick Department Operations</h3>
            <p className="text-xs text-slate-300">
              Manage CSIT 3rd Year / 5th Sem classrooms, faculty schedules, and review pending approvals.
            </p>

            <div className="space-y-2 pt-2">
              <Link
                to="/faculty"
                className="block p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors border border-slate-700"
              >
                👥 Add / Manage CSIT Faculty Members →
              </Link>
              <Link
                to="/resources"
                className="block p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors border border-slate-700"
              >
                🏢 Review Laboratory & Hall Booking Requests →
              </Link>
              <Link
                to="/achievements"
                className="block p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors border border-slate-700"
              >
                🏆 Verify Faculty Publications & Certificates →
              </Link>
              <Link
                to="/reports"
                className="block p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors border border-slate-700"
              >
                📊 Generate Audit Reports (PDF & CSV) →
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
            Chameli Devi Group of Institutions • CSIT Department
          </div>
        </div>
      </div>
    </div>
  );
}

