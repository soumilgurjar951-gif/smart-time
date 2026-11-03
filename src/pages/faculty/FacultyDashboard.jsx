// src/pages/faculty/FacultyDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardCheck,
  CheckSquare,
  Award,
  Clock,
  MapPin,
  Building2,
  Sparkles,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { lectureService } from '../../services/lectureService';
import { taskService } from '../../services/taskService';
import { achievementService } from '../../services/achievementService';
import { DEPARTMENT_INFO } from '../../utils/constants';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myLectures, setMyLectures] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myAchievements, setMyAchievements] = useState([]);

  useEffect(() => {
    async function loadFacultyData() {
      try {
        const [lecs, tsks, achs] = await Promise.all([
          lectureService.getAllLectures(),
          taskService.getAllTasks({ assignedToId: user?.id }),
          achievementService.getAllAchievements({ facultyId: user?.id }),
        ]);

        // Filter lectures assigned to this faculty
        setMyLectures(lecs);
        setMyTasks(tsks);
        setMyAchievements(achs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFacultyData();
  }, [user]);

  // First-login enforcement: faculty must complete onboarding before dashboard access.
  if (user?.profile_status === 'INCOMPLETE') {
    return <Navigate to="/faculty/onboarding" replace />;
  }

  if (loading) {
    return <LoadingSpinner message="Loading your teaching portal..." />;
  }

  const todayLectures = (Array.isArray(myLectures) ? myLectures : []).slice(0, 2);
  const upcomingLectures = (Array.isArray(myLectures) ? myLectures : []).slice(2);
  const pendingTasks = (Array.isArray(myTasks) ? myTasks : []).filter((t) => t.status !== 'Completed');

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-midnight-950 via-midnight-800 to-midnight-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-midnight-600/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/20 text-electric-300 text-xs font-semibold border border-electric-500/30 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{DEPARTMENT_INFO.department} Faculty Portal • {DEPARTMENT_INFO.year} / {DEPARTMENT_INFO.semester}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
              Good Day, {user?.name || 'Faculty Member'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              {user?.designation} • Cabin: {user?.cabin || 'CSIT Wing'} • Assigned Sections: {user?.assignedSections?.join(', ') || 'Section A'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to="/attendance">
              <Button size="sm" icon={ClipboardCheck} className="bg-emerald-600 hover:bg-emerald-700">
                Mark Lecture Attendance
              </Button>
            </Link>
            <Link to="/resources">
              <Button size="sm" variant="secondary" icon={Building2}>
                Book Lab / Classroom
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Faculty Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Today's Scheduled Lectures"
          value={todayLectures.length}
          subtitle="CSIT 5th Sem (Sec A & B)"
          icon={CalendarDays}
          color="indigo"
          badge="Ready"
        />

        <StatCard
          title="Active Assigned Duties"
          value={pendingTasks.length}
          subtitle="Course files & Lab duties"
          icon={CheckSquare}
          color="amber"
          badge={pendingTasks.length > 0 ? 'In Progress' : 'All Clear'}
        />

        <StatCard
          title="My Verified Achievements"
          value={myAchievements.filter((a) => a.status === 'Approved').length}
          subtitle="Patents, FDPs & Papers"
          icon={Award}
          color="purple"
          badge="Approved by HOD"
        />

        <StatCard
          title="Department Attendance Rate"
          value="—"
          subtitle="No attendance summary loaded"
          icon={ClipboardCheck}
          color="emerald"
          badge="High"
        />
      </div>

      {/* Main Grid: Today's Lectures & Assigned Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Lectures & Quick Attendance Shortcut */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  Today's Lectures & Attendance Shortcuts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a lecture to record Section A or Section B student attendance
                </p>
              </div>
              <Link to="/timetable" className="text-xs font-bold text-electric-600 dark:text-electric-400 hover:underline">
                View Weekly Timetable →
              </Link>
            </div>

            <div className="space-y-3">
              {todayLectures.map((lec) => (
                <div
                  key={lec.id}
                  className="rounded-2xl border border-slate-200 dark:border-midnight-800 p-4 bg-offwhite/50 dark:bg-midnight-800/40 hover:bg-offwhite dark:hover:bg-midnight-800/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-electric-700 dark:text-electric-400 bg-electric-50 dark:bg-electric-950 px-2 py-0.5 rounded-md">
                        {lec.section}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {lec.subjectName} ({lec.subjectCode})
                      </h4>
                      <Badge variant={lec.lectureType === 'Lab' ? 'emerald' : 'indigo'}>
                        {lec.lectureType}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-electric-600" />
                        {lec.timeSlot}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {lec.classroom}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-1">
                      Topic: {lec.topic}
                    </p>
                  </div>

                  <Link to={`/attendance?lectureId=${lec.id}`}>
                    <Button
                      size="sm"
                      icon={ClipboardCheck}
                      variant={lec.attendanceMarked ? 'secondary' : 'primary'}
                      className="shrink-0"
                    >
                      {lec.attendanceMarked ? 'Review Attendance' : 'Take Attendance'}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Lectures This Week */}
          <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] mb-3">
              Upcoming Schedule (This Week)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingLectures.map((lec) => (
                <div
                  key={lec.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-800/60 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-electric-600 dark:text-electric-400">{lec.day}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-midnight-700 text-slate-600 dark:text-slate-300">
                      {lec.section}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{lec.subjectName}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{lec.timeSlot} • {lec.classroom}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Assigned Tasks & Announcements */}
        <div className="space-y-6">
          {/* Assigned Tasks Card */}
          <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                My Assigned Tasks
              </h3>
              <Link to="/tasks" className="text-xs font-bold text-electric-600 dark:text-electric-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {pendingTasks.slice(0, 3).map((tsk) => (
                <div
                  key={tsk.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-midnight-800 bg-offwhite/50 dark:bg-midnight-800/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {tsk.title}
                    </h4>
                    <Badge priority={tsk.priority}>{tsk.priority}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {tsk.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">Due: {tsk.deadline}</span>
                    <Badge status={tsk.status}>{tsk.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Announcements Card */}
          <div className="bg-midnight-900 text-white rounded-3xl p-6 shadow-xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-electric-200 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Department Bulletin</span>
            </div>
            <h4 className="text-sm font-bold">Mid-Semester Exam Schedule Notice</h4>
            <p className="text-xs text-electric-100 leading-relaxed">
              All faculty members teaching 5th Semester CSIT (Sections A & B) are requested to submit question papers with Bloom tags by Nov 5 to Dr. Rajiv Sharma.
            </p>
            <div className="pt-2">
              <Link
                to="/achievements"
                className="inline-block text-xs font-bold text-amber-300 hover:underline"
              >
                + Submit New Faculty Achievement / Publication →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
