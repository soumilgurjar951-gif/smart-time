// src/pages/Dashboard.jsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  UserX,
  CalendarCheck,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowLeftRight,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const {
    stats,
    timetableEntries,
    classList,
    absences,
    substitutions,
    facultyList,
    timePeriods,
  } = useTimeFlow();

  // Helper map for class name
  const classMap = useMemo(() => {
    return classList.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }, [classList]);

  // Map of absent faculty IDs today (Monday)
  const absentFacultyIds = useMemo(() => {
    return new Set(
      absences.filter((a) => a.day === 'Monday').map((a) => a.facultyId)
    );
  }, [absences]);

  // Map of substituted lectures
  const substitutedLecturesMap = useMemo(() => {
    const map = {};
    absences.forEach((a) => {
      a.affectedLectures?.forEach((lec) => {
        if (lec.status === 'Substituted') {
          map[lec.timetableId] = lec.substitutedBy;
        }
      });
    });
    return map;
  }, [absences]);

  // Today's schedule entries (Monday)
  const todaySchedule = useMemo(() => {
    const mondayEntries = timetableEntries.filter((t) => t.day === 'Monday');
    // Sort by period ascending
    return mondayEntries.sort((a, b) => Number(a.period) - Number(b.period));
  }, [timetableEntries]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Academic Timetable Operational • Monday Schedule Active
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
            Welcome to TimeFlow Admin
          </h2>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">
            Real-time schedule monitoring, faculty absence tracking, and instant automated substitute faculty recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/timetable-builder"
            className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Open Timetable Builder</span>
          </Link>
          <Link
            to="/substitutions"
            className="px-4 py-2.5 rounded-xl bg-indigo-500/80 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors border border-indigo-400/50 flex items-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Manage Substitutions</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Faculty"
          value={stats.totalFaculty}
          icon={Users}
          badge="Active"
          badgeType="indigo"
          subtext="Full-time & adjunct teaching staff"
          iconBg="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          title="Total Classes"
          value={stats.totalClasses}
          icon={GraduationCap}
          badge="Current Term"
          badgeType="default"
          subtext="CSE & IT batches enrolled"
          iconBg="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Total Subjects"
          value={stats.totalSubjects}
          icon={BookOpen}
          badge="Curriculum"
          badgeType="default"
          subtext="Theory & Practical Lab courses"
          iconBg="bg-sky-50 text-sky-600"
        />
        <StatCard
          title="Today's Absences"
          value={stats.todayAbsences}
          icon={UserX}
          badge={stats.todayAbsences > 0 ? 'Action Needed' : 'All Present'}
          badgeType={stats.todayAbsences > 0 ? 'danger' : 'success'}
          subtext="Faculty absent on Monday"
          iconBg="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Main Grid: Today's Schedule & Recent Substitutions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Today's Schedule Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Today’s Schedule (Monday)
              </h3>
              <p className="text-xs text-slate-500">
                All scheduled lectures and laboratory periods across class batches
              </p>
            </div>
            <Link
              to="/timetable-builder"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Full Weekly Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            {todaySchedule.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No lectures scheduled for today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Period / Time</th>
                      <th className="py-3.5 px-4">Class</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Faculty</th>
                      <th className="py-3.5 px-4">Room</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {todaySchedule.map((entry) => {
                      const periodInfo = timePeriods.find(
                        (p) => Number(p.period) === Number(entry.period)
                      );
                      const isAbsent = absentFacultyIds.has(entry.facultyId);
                      const substitutedBy = substitutedLecturesMap[entry.id];

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isAbsent && !substitutedBy ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">
                              Period {entry.period}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {periodInfo?.startTime} - {periodInfo?.endTime}
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                              {classMap[entry.classId] || 'CSE 3A'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {entry.subjectName}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-medium ${
                                  isAbsent ? 'text-rose-700 line-through' : 'text-slate-700'
                                }`}
                              >
                                {entry.facultyName}
                              </span>
                              {isAbsent && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-700 font-bold text-[10px]">
                                  Absent
                                </span>
                              )}
                            </div>
                            {substitutedBy && (
                              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Sub: {substitutedBy}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 font-mono text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {entry.room}
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {substitutedBy ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Substituted
                              </span>
                            ) : isAbsent ? (
                              <Link
                                to="/substitutions"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors border border-rose-200"
                                title="Click to assign substitute"
                              >
                                <AlertCircle className="w-3 h-3" />
                                Needs Substitute
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                Scheduled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Absent Faculty & Recent Substitutions */}
        <div className="space-y-6">
          {/* Absent Faculty Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Faculty Absences (Today)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Reported on Monday, Oct 22
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                {absences.length} Absent
              </span>
            </div>

            <div className="space-y-3">
              {absences.map((abs) => {
                const pendingCount = abs.affectedLectures?.filter(
                  (l) => l.status !== 'Substituted'
                ).length;

                return (
                  <div
                    key={abs.id}
                    className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        {abs.facultyName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                        Absent
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Reason: <span className="text-slate-700">{abs.reason}</span>
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-200/40">
                      <span className="text-slate-600">
                        Affected Lectures:{' '}
                        <strong>{abs.affectedLectures?.length || 0}</strong>
                      </span>
                      {pendingCount > 0 ? (
                        <Link
                          to="/substitutions"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <span>Assign ({pendingCount})</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px]">
                          ✓ All Covered
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Substitutions */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Recent Substitutions
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Logged faculty replacement log
                  </p>
                </div>
              </div>
              <Link
                to="/substitutions"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View All
              </Link>
            </div>

            {substitutions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No substitutions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {substitutions.slice(0, 3).map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-700">
                        {sub.className} • Period {sub.period}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sub.day}
                      </span>
                    </div>

                    <div className="text-slate-700 font-semibold">
                      {sub.subjectName}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span className="line-through text-slate-400">
                        {sub.originalFaculty}
                      </span>
                      <span>➔</span>
                      <strong className="text-emerald-700">
                        {sub.substituteFaculty}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
