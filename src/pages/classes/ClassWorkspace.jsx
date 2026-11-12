// src/pages/classes/ClassWorkspace.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Users,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  UserPlus,
  UserMinus,
  Crown,
  ShieldCheck,
  Trash2,
  Clock3,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ClassSelector from './ClassSelector';
import classService, { PERMISSIONS } from '../../services/classService';
import { useAuth } from '../../context/AuthContext';
import { useOdrms } from '../../context/OdrmsContext';
import { storage } from '../../utils/storage';

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

function displayTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function getErrorMessage(error) {
  const details = error.response?.data?.error?.details || error.response?.data;
  if (!details) return error.message || 'The request failed.';
  if (typeof details === 'string') return details;
  return Object.entries(details)
    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
    .join(' · ');
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClassWorkspace() {
  const { isHod } = useAuth();
  const { showToast } = useOdrms();

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    const stored = storage.get('SELECTED_CLASS');
    return stored != null ? String(stored) : null;
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [facultyView, setFacultyView] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingTab, setLoadingTab] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Attendance tab date filter: the input updates dateFilter, "Apply" pushes it to appliedDate
  const [dateFilter, setDateFilter] = useState('');
  const [appliedDate, setAppliedDate] = useState('');

  const [grantForm, setGrantForm] = useState({ faculty: '', permissions: ['VIEW'] });
  const [assignForm, setAssignForm] = useState({ faculty: '', subject: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Class coordinator (HOD assigns/removes — backend-enforced)
  const [coordinator, setCoordinator] = useState(null);
  const [coordinatorForm, setCoordinatorForm] = useState('');

  const loadClasses = useCallback(async () => {
    try {
      const list = await classService.listClasses();
      setClasses(list);
      setSelectedId((current) => {
        if (current && list.some((cls) => String(cls.id) === String(current))) return current;
        return list[0]?.id != null ? String(list[0].id) : null;
      });
    } catch (error) {
      if (error.response?.status === 403) {
        showToast('You do not have access to this class.', 'error');
      } else {
        showToast(getErrorMessage(error) || 'Could not load classes.', 'error');
      }
    } finally {
      setLoadingClasses(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (selectedId != null) {
      storage.set('SELECTED_CLASS', Number(selectedId));
    }
  }, [selectedId]);

  const handleClassCreated = async (created) => {
    if (created?.id != null) {
      setSelectedId(String(created.id));
    }
    await loadClasses();
  };

  const loadAttendanceData = useCallback(
    async (classId, date) => {
      try {
        const data = await classService.getAttendance(classId, date ? { date } : {});
        setAttendance(data);
      } catch (error) {
        if (error.response?.status === 403) {
          showToast('You do not have access to this class.', 'error');
        } else {
          showToast(getErrorMessage(error) || 'Could not load attendance.', 'error');
        }
      }
    },
    [showToast]
  );

  // Load the data the active tab needs for the selected class only
  useEffect(() => {
    const classId = selectedId;
    if (!classId) return;

    let cancelled = false;
    const guard403 = (error, fallback) => {
      if (cancelled) return;
      if (error.response?.status === 403) {
        showToast('You do not have access to this class.', 'error');
      } else {
        showToast(getErrorMessage(error) || fallback, 'error');
      }
    };

    async function loadTab() {
      setLoadingTab(true);
      try {
        if (activeTab === 'overview') {
          const data = await classService.getDashboard(classId);
          if (!cancelled) setDashboard(data);
        } else if (activeTab === 'timetable') {
          const data = await classService.getTimetable(classId);
          if (!cancelled) setTimetable(data);
        } else if (activeTab === 'attendance') {
          await loadAttendanceData(classId, appliedDate);
        } else if (activeTab === 'reports') {
          const [attendanceData, summaryData] = await Promise.all([
            classService.getAttendance(classId),
            isHod ? classService.getSummary() : Promise.resolve(null),
          ]);
          if (!cancelled) {
            setAttendance(attendanceData);
            setSummary(summaryData);
          }
        } else if (activeTab === 'faculty' && isHod) {
          const [facultyData, dashboardData, coordinatorData] = await Promise.all([
            classService.getFacultyView(classId),
            classService.getDashboard(classId),
            classService.getCoordinator(classId).catch(() => null),
          ]);
          if (!cancelled) {
            setFacultyView(facultyData);
            setDashboard(dashboardData);
            setCoordinator(coordinatorData);
            setCoordinatorForm((current) => String(coordinatorData?.faculty || current));
            setGrantForm((current) => ({
              ...current,
              faculty: current.faculty || String(facultyData.available_faculty?.[0]?.id || ''),
            }));
            setAssignForm((current) => ({
              ...current,
              subject: current.subject || String(dashboardData.subjects?.[0]?.id || ''),
            }));
          }
        }
      } catch (error) {
        guard403(error, 'Could not load class data.');
      } finally {
        if (!cancelled) setLoadingTab(false);
      }
    }

    loadTab();
    return () => {
      cancelled = true;
    };
  }, [selectedId, activeTab, appliedDate, refreshKey, isHod, showToast, loadAttendanceData]);

  const handleSelectClass = (id) => {
    setSelectedId(String(id));
    setActiveTab('overview');
    setAppliedDate('');
    setDateFilter('');
  };

  const handleApplyDate = () => {
    setAppliedDate(dateFilter);
  };

  const handleGrantAccess = async (event) => {
    event.preventDefault();
    if (!selectedId || !grantForm.faculty || !grantForm.permissions.length) return;
    setIsSubmitting(true);
    try {
      await classService.grantAccess(selectedId, {
        faculty: Number(grantForm.faculty),
        permissions: grantForm.permissions,
      });
      showToast('Faculty access granted.');
      setGrantForm((current) => ({ ...current, permissions: ['VIEW'] }));
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(getErrorMessage(error) || 'Could not grant access.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGrantPermission = (value) => {
    setGrantForm((current) => ({
      ...current,
      permissions: current.permissions.includes(value)
        ? current.permissions.filter((perm) => perm !== value)
        : [...current.permissions, value],
    }));
  };

  const handleRevokeAccess = async (access) => {
    try {
      await classService.revokeAccess(selectedId, access.id);
      showToast(`Access revoked for ${access.faculty_name}.`);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(getErrorMessage(error) || 'Could not revoke access.', 'error');
    }
  };

  const handleAssignCoordinator = async (event) => {
    event.preventDefault();
    if (!selectedId || !coordinatorForm) return;
    setIsSubmitting(true);
    try {
      await classService.assignCoordinator(selectedId, Number(coordinatorForm));
      showToast('Class coordinator assigned. Their records stay scoped to this class only.');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(getErrorMessage(error) || 'Could not assign the coordinator.', 'error');
      setRefreshKey((key) => key + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCoordinator = async () => {
    if (!selectedId || !coordinator) return;
    try {
      await classService.removeCoordinator(selectedId);
      showToast('Class coordinator removed.');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(getErrorMessage(error) || 'Could not remove the coordinator.', 'error');
      setRefreshKey((key) => key + 1);
    }
  };

  const handleAssignFaculty = async (event) => {
    event.preventDefault();
    if (!selectedId || !assignForm.faculty || !assignForm.subject) return;
    setIsSubmitting(true);
    try {
      await classService.assignFaculty(selectedId, Number(assignForm.faculty), Number(assignForm.subject));
      showToast('Faculty assigned to subject.');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(getErrorMessage(error) || 'Could not assign faculty.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = useMemo(() => {
    const base = [
      { id: 'overview', label: 'Overview', icon: GraduationCap },
      { id: 'timetable', label: 'Timetable', icon: CalendarDays },
      { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ];
    return isHod ? [...base, { id: 'faculty', label: 'Faculty Access', icon: ShieldCheck }] : base;
  }, [isHod]);

  const subjectBreakdown = useMemo(() => {
    const sessions = attendance?.sessions || [];
    const groups = {};
    sessions.forEach((session) => {
      const code = session.lecture__subject__code || 'Unknown';
      if (!groups[code]) {
        groups[code] = { code, total: 0, present: 0 };
      }
      groups[code].total += session.total || 0;
      groups[code].present += session.present || 0;
    });
    return Object.values(groups)
      .map((group) => ({
        ...group,
        percentage: group.total ? Math.round((group.present / group.total) * 100) : 0,
      }))
      .sort((left, right) => right.total - left.total);
  }, [attendance]);

  if (loadingClasses) {
    return <LoadingSpinner message="Loading classes..." />;
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-electric-50 dark:bg-electric-950/70 text-electric-700 dark:text-electric-400 text-xs font-bold border border-electric-200 dark:border-electric-900">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Class Workspace</span>
          </div>
        </div>
        {isHod ? (
          <div className="space-y-4">
            <ClassSelector
              classes={[]}
              selectedId={null}
              onSelect={handleSelectClass}
              isHod
              onClassCreated={handleClassCreated}
            />
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="No classes assigned yet"
            description="Your HOD has not authorized you for any class. Once you are granted access, your classes will appear here."
          />
        )}
      </div>
    );
  }

  const selectedClass = classes.find((cls) => String(cls.id) === String(selectedId)) || classes[0];
  const totals = dashboard?.totals || {};
  const attendanceSummary = attendance?.summary || {};
  const timetableEntries = timetable?.entries || [];
  const timetablePeriods = [...new Set(timetableEntries.map((entry) => entry.period))].sort(
    (left, right) => left - right
  );
  const timetableConflicts = timetable?.conflicts || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-electric-50 dark:bg-electric-950/70 text-electric-700 dark:text-electric-400 text-xs font-bold border border-electric-200 dark:border-electric-900 mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{selectedClass?.display_name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            {isHod ? 'Class Management' : 'My Classes'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isHod
              ? 'Per-class timetables, attendance, reports and faculty access · one class at a time.'
              : 'Timetables, attendance and reports for the classes you are authorized to view.'}
          </p>
        </div>
        {isHod && (
          <Link to="/timetable">
            <Button variant="secondary" size="sm" icon={CalendarDays}>
              Edit Timetables
            </Button>
          </Link>
        )}
      </div>

      {/* Class Selector (HOD always, faculty when multiple) */}
      {(isHod || classes.length > 1) && (
        <ClassSelector
          classes={classes}
          selectedId={selectedClass?.id}
          onSelect={handleSelectClass}
          isHod={isHod}
          onClassCreated={handleClassCreated}
        />
      )}

      {/* Tab Switcher */}
      <div className="flex flex-wrap bg-slate-100 dark:bg-midnight-800 p-1 rounded-xl border border-slate-200 dark:border-midnight-700 w-fit">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-midnight-900 text-electric-600 dark:text-electric-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loadingTab ? (
        <LoadingSpinner message="Loading class data..." />
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Permission Badges */}
              {(isHod || dashboard?.my_permissions?.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {isHod ? 'HOD · Full Control' : 'My Permissions'}
                  </span>
                  {dashboard?.my_permissions?.map((permission) => (
                    <span
                      key={permission}
                      className="px-2.5 py-0.5 rounded-full bg-electric-50 dark:bg-electric-950 text-electric-700 dark:text-electric-400 text-[11px] font-bold border border-electric-200 dark:border-electric-900"
                    >
                      {PERMISSIONS.find((perm) => perm.value === permission)?.label || permission}
                    </span>
                  ))}
                </div>
              )}

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <StatCard title="Subjects" value={totals.subjects ?? 0} icon={BookOpen} color="indigo" />
                <StatCard title="Faculty Assigned" value={totals.faculty ?? 0} icon={Users} color="blue" />
                <StatCard title="Timetable Entries" value={totals.timetable_entries ?? 0} icon={CalendarDays} color="purple" />
                <StatCard
                  title="Upcoming Lectures"
                  value={totals.lectures_upcoming ?? 0}
                  icon={Clock3}
                  color="amber"
                  badge={totals.attendance_records ? `${totals.attendance_records} records` : 'No records'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule */}
                <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                      Today&apos;s Schedule
                    </h3>
                    <Clock3 className="w-4 h-4 text-electric-500" />
                  </div>
                  {dashboard?.timetable_today?.length ? (
                    <div className="divide-y divide-slate-100 dark:divide-midnight-800">
                      {dashboard.timetable_today.map((session) => (
                        <div key={session.timetable_entry_id} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {session.subject_code} · {session.subject_name}
                            </p>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {displayTime(session.start_time)} – {displayTime(session.end_time)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Period {session.period} · {session.classroom} · {session.faculty_name || 'Not assigned'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                      No lectures scheduled for today.
                    </p>
                  )}
                </div>

                {/* Subjects Table */}
                <div className="lg:col-span-2 bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-100 dark:border-midnight-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                      Subjects & Assigned Faculty
                    </h3>
                  </div>
                  {dashboard?.subjects?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-offwhite dark:bg-midnight-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-midnight-700">
                          <tr>
                            <th className="py-3 px-5">Code</th>
                            <th className="py-3 px-4">Subject</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-5">Faculty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-midnight-800">
                          {dashboard.subjects.map((subject) => (
                            <tr key={subject.id} className="hover:bg-offwhite/60 dark:hover:bg-midnight-800/40">
                              <td className="py-3 px-5 font-mono font-bold text-electric-600 dark:text-electric-400">
                                {subject.subject_code}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{subject.subject_name}</td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">
                                {subject.subject_type}
                              </td>
                              <td className="py-3 px-5">
                                {subject.faculty?.length ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {subject.faculty.map((faculty) => (
                                      <span
                                        key={faculty.faculty_id}
                                        className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-midnight-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                                      >
                                        {faculty.full_name} ({faculty.faculty_code})
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500">Not assigned</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6">
                      <EmptyState
                        icon={BookOpen}
                        title="No subjects linked"
                        description="Add subjects to this class from the Faculty Access tab or the timetable editor."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timetable Tab */}
          {activeTab === 'timetable' && (
            <div className="space-y-6">
              {timetableEntries.length ? (
                <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-100 dark:border-midnight-800 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                        Weekly Timetable · {timetable?.display_name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {timetable?.count} scheduled entries · Monday to Friday
                      </p>
                    </div>
                    {isHod && (
                      <Link to="/timetable" className="text-xs font-bold text-electric-600 dark:text-electric-400 hover:underline">
                        Edit in Timetable Management →
                      </Link>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full border-collapse text-left text-xs">
                      <thead className="bg-offwhite dark:bg-midnight-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-midnight-700">
                        <tr>
                          <th className="py-3 px-4">Day</th>
                          {timetablePeriods.map((period) => (
                            <th key={period} className="min-w-32 border-l border-slate-200 dark:border-midnight-700 py-3 px-3">
                              Period {period}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-midnight-800">
                        {WEEKDAYS.map((day) => (
                          <tr key={day}>
                            <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {day[0] + day.slice(1).toLowerCase()}
                            </th>
                            {timetablePeriods.map((period) => {
                              const entry = timetableEntries.find(
                                (item) => item.weekday === day && item.period === period
                              );
                              return (
                                <td
                                  key={period}
                                  className="border-l border-slate-200 dark:border-midnight-700 h-24 p-2 align-top"
                                >
                                  {entry ? (
                                    <div
                                      className={`h-full rounded-lg border p-2 ${
                                        entry.lecture_type === 'PRACTICAL' || entry.lecture_type === 'LAB'
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900'
                                          : 'bg-electric-50/60 dark:bg-electric-950/40 border-electric-100 dark:border-electric-900'
                                      }`}
                                    >
                                      <p className="font-bold text-slate-900 dark:text-white">{entry.subject_code}</p>
                                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                        {entry.faculty_name}
                                      </p>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-500">
                                        {displayTime(entry.start_time)} · {entry.classroom}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 flex h-full items-center justify-center">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No timetable entries"
                  description={
                    isHod
                      ? 'This class has no scheduled lectures yet. Open Timetable Management to add entries.'
                      : 'This class has no scheduled lectures yet.'
                  }
                />
              )}

              {/* Conflicts */}
              {timetableConflicts.length > 0 && (
                <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-amber-200 dark:border-amber-900 p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                      Scheduling Conflicts ({timetableConflicts.length})
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {timetableConflicts.map((conflict, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-4 py-2.5"
                      >
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-bold">
                          {conflict.type === 'FACULTY' ? 'Faculty conflict' : 'Room conflict'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Entry #{conflict.entry?.timetable_entry_id || conflict.entry?.id} overlaps Entry #
                          {conflict.conflicting_entry?.timetable_entry_id || conflict.conflicting_entry?.id}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {conflict.entry?.subject_code || ''} · {conflict.entry?.weekday || ''} period {conflict.entry?.period || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="Attendance Rate"
                  value={`${attendanceSummary.present_percentage ?? 0}%`}
                  icon={ClipboardCheck}
                  color="emerald"
                  subtitle={`${attendanceSummary.present ?? 0} of ${attendanceSummary.total ?? 0} present`}
                />
                <StatCard title="Records" value={attendanceSummary.total ?? 0} icon={BarChart3} color="indigo" />
                <StatCard title="Absent" value={attendanceSummary.absent ?? 0} icon={Users} color="rose" />
                <StatCard title="On Leave" value={attendanceSummary.on_leave ?? 0} icon={UserPlus} color="amber" />
              </div>

              {/* Date Filter */}
              <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="block flex-1 max-w-xs">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Filter by lecture date</span>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                  />
                </label>
                <Button size="sm" icon={RefreshCw} onClick={handleApplyDate} disabled={!selectedClass}>
                  Apply Filter
                </Button>
                {appliedDate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDateFilter('');
                      setAppliedDate('');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Sessions Table */}
              <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 overflow-hidden shadow-xs">
                <div className="p-5 border-b border-slate-100 dark:border-midnight-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    Attendance Sessions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Latest recorded lecture sessions ({attendance?.sessions?.length || 0} shown)
                  </p>
                </div>
                {attendance?.sessions?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-offwhite dark:bg-midnight-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-midnight-700">
                        <tr>
                          <th className="py-3 px-5">Date</th>
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Faculty</th>
                          <th className="py-3 px-5 text-center">Present / Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-midnight-800">
                        {attendance.sessions.map((session) => (
                          <tr key={session.lecture_id} className="hover:bg-offwhite/60 dark:hover:bg-midnight-800/40">
                            <td className="py-3 px-5 font-semibold text-slate-800 dark:text-slate-200">
                              {formatDate(session.lecture__date)}
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-semibold">
                              {displayTime(session.lecture__start_time)} – {displayTime(session.lecture__end_time)}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {session.lecture__subject__code}
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                              {session.lecture__assigned_faculty__full_name || '—'}
                            </td>
                            <td className="py-3 px-5 text-center font-bold">
                              <span className="text-emerald-600 dark:text-emerald-400">{session.present}</span> /{' '}
                              {session.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6">
                    <EmptyState
                      icon={ClipboardCheck}
                      title="No attendance sessions"
                      description="Attendance recorded for this class's lectures will appear here."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="Overall Rate"
                  value={`${attendanceSummary.present_percentage ?? 0}%`}
                  icon={BarChart3}
                  color="indigo"
                />
                <StatCard title="Total Records" value={attendanceSummary.total ?? 0} icon={ClipboardCheck} color="blue" />
                <StatCard title="Present" value={attendanceSummary.present ?? 0} icon={Users} color="emerald" />
                <StatCard title="Absent / Leave" value={(attendanceSummary.absent ?? 0) + (attendanceSummary.on_leave ?? 0)} icon={AlertTriangle} color="rose" />
              </div>

              {/* Per-subject breakdown from sessions */}
              <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  Attendance by Subject
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
                  Grouped from recorded lecture sessions in {selectedClass?.display_name}
                </p>
                {subjectBreakdown.length ? (
                  <div className="space-y-4">
                    {subjectBreakdown.map((group) => (
                      <div key={group.code}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {group.code}
                            <span className="text-slate-400 dark:text-slate-500 font-semibold ml-2">
                              ({group.present}/{group.total})
                            </span>
                          </span>
                          <span className="text-xs font-black text-electric-600 dark:text-electric-400">{group.percentage}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-midnight-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-electric-500 dark:bg-electric-400 transition-all"
                            style={{ width: `${group.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    No session data yet to build a per-subject breakdown.
                  </p>
                )}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-4 mt-4 border-t border-slate-100 dark:border-midnight-800">
                  Cross-class comparisons live on the HOD Dashboard · this report is scoped to one class only.
                </p>
              </div>

              {/* HOD: cross-class comparison */}
              {isHod && (
                <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-electric-500" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                      Compare Classes
                    </h3>
                  </div>
                  {summary?.classes?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {summary.classes.map((cls) => (
                        <button
                          key={cls.class_id || cls.id}
                          onClick={() => handleSelectClass(cls.class_id || cls.id)}
                          className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                            String(cls.class_id || cls.id) === String(selectedClass?.id)
                              ? 'border-electric-400 dark:border-electric-700 bg-electric-50/60 dark:bg-electric-950/40'
                              : 'border-slate-200 dark:border-midnight-800 bg-offwhite dark:bg-midnight-800/60 hover:border-electric-300'
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{cls.display_name}</p>
                          <p className="text-2xl font-black text-electric-600 dark:text-electric-400 mt-1">
                            {cls.recent_attendance?.present_percentage ?? 0}%
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            recent attendance · {cls.recent_attendance?.present ?? 0}/{cls.recent_attendance?.total ?? 0} present
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                      No classes available for comparison.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Faculty Access Tab (HOD only) */}
          {activeTab === 'faculty' && isHod && (
            <div className="space-y-6">
              {/* Class Coordinator */}
              <div className="bg-midnight-900 dark:bg-midnight-900 text-white rounded-3xl p-6 shadow-lg border border-midnight-700/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-300" />
                    <h3 className="text-base font-bold font-['Plus_Jakarta_Sans',sans-serif]">
                      Class Coordinator
                    </h3>
                  </div>
                  <p className="text-[11px] text-midnight-300 max-w-md">
                    Coordinators see — and manage — records of this class only. Assignment stays valid until you remove it.
                  </p>
                </div>
                {coordinator ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-midnight-800/70 rounded-2xl p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-electric-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {(coordinator.faculty_name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{coordinator.faculty_name}</p>
                        <p className="text-[11px] text-midnight-300 truncate">
                          {coordinator.faculty_designation || 'Faculty'} • {coordinator.faculty_code || `ID ${coordinator.faculty}`}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                        Active
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={UserMinus}
                      isLoading={isSubmitting}
                      onClick={handleRemoveCoordinator}
                      className="shrink-0"
                    >
                      Remove Coordinator
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleAssignCoordinator} className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <label className="block flex-1">
                      <span className="block text-xs font-bold text-midnight-200 mb-1">Assign a coordinator from faculty</span>
                      <select
                        required
                        value={coordinatorForm}
                        onChange={(e) => setCoordinatorForm(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-midnight-800 border border-midnight-700 text-xs sm:text-sm font-bold text-white"
                      >
                        <option value="">Select faculty member</option>
                        {facultyView?.available_faculty?.length
                          ? facultyView.available_faculty.map((faculty) => (
                              <option key={faculty.id} value={faculty.id}>
                                {faculty.full_name} ({faculty.faculty_code || faculty.id})
                              </option>
                            ))
                          : null}
                      </select>
                    </label>
                    <Button size="sm" icon={Crown} type="submit" isLoading={isSubmitting} disabled={!coordinatorForm}>
                      Assign Coordinator
                    </Button>
                  </form>
                )}
              </div>

              {/* Grant Access Form */}
              <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-electric-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    Grant Faculty Access
                  </h3>
                </div>
                <form onSubmit={handleGrantAccess} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <label className="block">
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Faculty member</span>
                      <select
                        required
                        value={grantForm.faculty}
                        onChange={(e) => setGrantForm({ ...grantForm, faculty: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                      >
                        {facultyView?.available_faculty?.length ? (
                          facultyView.available_faculty.map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>
                              {faculty.full_name} ({faculty.faculty_code || faculty.id})
                            </option>
                          ))
                        ) : (
                          <option value="">No faculty available</option>
                        )}
                      </select>
                    </label>
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Permissions</span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {PERMISSIONS.map((permission) => {
                          const isChecked = grantForm.permissions.includes(permission.value);
                          return (
                            <label
                              key={permission.value}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-electric-600 border-electric-600 text-white'
                                  : 'bg-offwhite dark:bg-midnight-800 border-slate-200 dark:border-midnight-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleGrantPermission(permission.value)}
                                className="sr-only"
                              />
                              {permission.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" icon={UserPlus} isLoading={isSubmitting} disabled={!facultyView?.available_faculty?.length}>
                      Grant Access
                    </Button>
                  </div>
                </form>
              </div>

              {/* Assign Faculty to Subject */}
              <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-electric-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    Assign Faculty to Subject
                  </h3>
                </div>
                <form onSubmit={handleAssignFaculty} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</span>
                    <select
                      required
                      value={assignForm.subject}
                      onChange={(e) => setAssignForm({ ...assignForm, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                    >
                      {dashboard?.subjects?.length ? (
                        dashboard.subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.subject_code} · {subject.subject_name}
                          </option>
                        ))
                      ) : (
                        <option value="">No subjects in this class</option>
                      )}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Faculty member</span>
                    <select
                      required
                      value={assignForm.faculty}
                      onChange={(e) => setAssignForm({ ...assignForm, faculty: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                    >
                      {facultyView?.available_faculty?.length ? (
                        facultyView.available_faculty.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.full_name} ({faculty.faculty_code || faculty.id})
                          </option>
                        ))
                      ) : (
                        <option value="">No faculty available</option>
                      )}
                    </select>
                  </label>
                  <Button size="sm" icon={UserPlus} isLoading={isSubmitting} type="submit">
                    Assign Faculty
                  </Button>
                </form>
              </div>

              {/* Access List */}
              <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 overflow-hidden shadow-xs">
                <div className="p-5 border-b border-slate-100 dark:border-midnight-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    Faculty Access ({facultyView?.accesses?.filter((access) => access.is_active).length || 0} active)
                  </h3>
                </div>
                {facultyView?.accesses?.length ? (
                  <div className="divide-y divide-slate-100 dark:divide-midnight-800">
                    {facultyView.accesses.map((access) => (
                      <div key={access.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{access.faculty_name}</p>
                            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                              {access.faculty_code || `ID ${access.faculty}`}
                            </span>
                            {access.is_active ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-midnight-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold border border-slate-200 dark:border-midnight-700">
                                Revoked
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {access.permissions?.map((permission) => (
                              <span
                                key={permission}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  access.is_active
                                    ? 'bg-electric-50 dark:bg-electric-950/60 text-electric-700 dark:text-electric-400 border-electric-200 dark:border-electric-900'
                                    : 'bg-offwhite dark:bg-midnight-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-midnight-700'
                                }`}
                              >
                                {PERMISSIONS.find((perm) => perm.value === permission)?.label || permission}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                            Granted {formatDate(access.granted_at)}
                            {access.revoked_at ? ` · Revoked ${formatDate(access.revoked_at)}` : ''}
                          </p>
                        </div>
                        {access.is_active && (
                          <Button
                            size="sm"
                            variant="danger"
                            icon={Trash2}
                            className="shrink-0"
                            onClick={() => handleRevokeAccess(access)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6">
                    <EmptyState
                      icon={ShieldCheck}
                      title="No faculty access granted"
                      description="Grant a faculty member access to this class to let them view records or mark attendance."
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
