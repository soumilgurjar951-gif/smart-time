// src/pages/attendance/AttendanceManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  Save,
} from 'lucide-react';
import Button from '../../components/common/Button';
import SearchInput from '../../components/common/SearchInput';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { lectureService } from '../../services/lectureService';
import { attendanceService } from '../../services/attendanceService';
import { useOdrms } from '../../context/OdrmsContext';
import { CSIT_5TH_SEM_SUBJECTS } from '../../utils/constants';

export default function AttendanceManagement() {
  const [searchParams] = useSearchParams();
  const { showToast, refreshCounts, addActivity } = useOdrms();

  const [activeTab, setActiveTab] = useState('mark'); // 'mark' | 'history'
  const [lectures, setLectures] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // History state
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historySectionFilter, setHistorySectionFilter] = useState('All');
  const [historySubjectFilter, setHistorySubjectFilter] = useState('All');

  // Load lectures
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const lecs = await lectureService.getAllLectures();
        setLectures(lecs);

        const paramLecId = searchParams.get('lecture') || searchParams.get('lectureId');
        const defaultId = paramLecId || (lecs[0]?.id ?? '');
        setSelectedLectureId(defaultId);
      } catch {
        showToast('Error loading lecture roster.', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [searchParams, showToast]);

  // Load attendance session whenever selected lecture changes
  useEffect(() => {
    if (!selectedLectureId || lectures.length === 0) return;
    const currentLecture = lectures.find((l) => l.id === selectedLectureId);
    if (!currentLecture) return;

    async function loadSession() {
      try {
        const session = await attendanceService.getAttendanceForLecture(currentLecture);
        setActiveSession(session);
        setRecords(session.records || []);
      } catch {
        showToast('Failed to load student attendance roster.', 'error');
      }
    }
    loadSession();
  }, [selectedLectureId, lectures, showToast]);

  // Load history when tab is clicked
  useEffect(() => {
    if (activeTab === 'history') {
      attendanceService.getAttendanceHistory().then((data) => {
        setHistoryRecords(data);
      });
    }
  }, [activeTab]);

  const selectedLecture = useMemo(() => {
    return lectures.find((l) => l.id === selectedLectureId) || null;
  }, [selectedLectureId, lectures]);

  // Handle single student status change
  const handleStatusChange = (rollNo, newStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.rollNo === rollNo ? { ...r, status: newStatus } : r))
    );
  };

  // 1-Click Mark All Present
  const handleMarkAll = (status) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    showToast(`Marked all ${records.length} students as ${status}.`);
  };

  // Submit attendance
  const handleSaveAttendance = async () => {
    if (!activeSession || !selectedLecture) return;
    setIsSaving(true);
    try {
      const payload = {
        ...activeSession,
        records,
      };
      await attendanceService.saveLectureAttendance(payload);
      showToast(`Attendance for ${selectedLecture.subjectName} (${selectedLecture.section}) saved!`);
      addActivity(
        `Attendance recorded for ${selectedLecture.subjectName}`,
        `${selectedLecture.section} • Saved by faculty`,
        'attendance'
      );
      refreshCounts();
    } catch {
      showToast('Error saving attendance.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate live statistics
  const totalCount = records.length;
  const presentCount = records.filter((r) => r.status === 'Present').length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;
  const liveRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return records;
    const q = studentSearch.toLowerCase();
    return records.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q)
    );
  }, [records, studentSearch]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return historyRecords.filter((h) => {
      const matchSec = historySectionFilter === 'All' || h.section === historySectionFilter;
      const matchSub = historySubjectFilter === 'All' || h.subjectCode === historySubjectFilter;
      return matchSec && matchSub;
    });
  }, [historyRecords, historySectionFilter, historySubjectFilter]);

  if (loading) {
    return <LoadingSpinner message="Initializing attendance register..." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-900 mb-2">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Per-Lecture Student Register (Sec A & B)</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Per-Lecture Attendance Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Mark Present, Absent, or On Leave for CSIT 3rd Year / 5th Sem lectures with instant rate calculations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-midnight-800 p-1 rounded-xl border border-slate-200 dark:border-midnight-700">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'mark'
                ? 'bg-white dark:bg-midnight-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-midnight-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Attendance History Log
          </button>
        </div>
      </div>

      {activeTab === 'mark' ? (
        <>
          {/* Lecture Selection Bar & Meta Info */}
          <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 max-w-xl">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Scheduled Lecture (CSIT 5th Sem):
                </label>
                <select
                  value={selectedLectureId}
                  onChange={(e) => setSelectedLectureId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                >
                  {lectures.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.day} • {l.subjectCode} - {l.subjectName} ({l.section}) — {l.timeSlot}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLecture && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleMarkAll('Present')}
                    className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    ✓ All Present
                  </button>
                  <Button
                    onClick={handleSaveAttendance}
                    isLoading={isSaving}
                    icon={Save}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Save & Submit Register
                  </Button>
                </div>
              )}
            </div>

            {/* Lecture Meta Glance */}
            {selectedLecture && (
              <div className="pt-4 border-t border-slate-100 dark:border-midnight-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-offwhite dark:bg-midnight-800/60 border border-slate-100 dark:border-midnight-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Faculty</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLecture.facultyName}</span>
                </div>
                <div className="p-3 rounded-xl bg-offwhite dark:bg-midnight-800/60 border border-slate-100 dark:border-midnight-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Classroom</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLecture.classroom}</span>
                </div>
                <div className="p-3 rounded-xl bg-offwhite dark:bg-midnight-800/60 border border-slate-100 dark:border-midnight-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Section & Type</span>
                  <span className="font-bold text-electric-600 dark:text-electric-400">{selectedLecture.section} ({selectedLecture.lectureType})</span>
                </div>
                <div className="p-3 rounded-xl bg-offwhite dark:bg-midnight-800/60 border border-slate-100 dark:border-midnight-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Curriculum Unit</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{selectedLecture.topic || 'General Lecture'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Rate Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-midnight-900 p-4 rounded-2xl border border-slate-200 dark:border-midnight-800 text-center">
              <span className="block text-2xl font-black text-slate-900 dark:text-white">{totalCount}</span>
              <span className="text-xs font-semibold text-slate-400 uppercase">Enrolled Students</span>
            </div>
            <div className="bg-white dark:bg-midnight-900 p-4 rounded-2xl border border-slate-200 dark:border-midnight-800 text-center">
              <span className="block text-2xl font-black text-emerald-600">{presentCount}</span>
              <span className="text-xs font-semibold text-emerald-600 uppercase">Present</span>
            </div>
            <div className="bg-white dark:bg-midnight-900 p-4 rounded-2xl border border-slate-200 dark:border-midnight-800 text-center">
              <span className="block text-2xl font-black text-rose-600">{absentCount}</span>
              <span className="text-xs font-semibold text-rose-600 uppercase">Absent</span>
            </div>
            <div className="bg-white dark:bg-midnight-900 p-4 rounded-2xl border border-slate-200 dark:border-midnight-800 text-center">
              <span className="block text-2xl font-black text-electric-600 dark:text-electric-400">{liveRate}%</span>
              <span className="text-xs font-semibold text-electric-600 uppercase">Attendance Rate</span>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-midnight-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Student Attendance Sheet ({selectedLecture?.section})
              </h3>
              <div className="w-full sm:w-72">
                <SearchInput
                  value={studentSearch}
                  onChange={setStudentSearch}
                  placeholder="Filter student by name or roll number..."
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-offwhite dark:bg-midnight-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-midnight-700">
                  <tr>
                    <th className="py-3 px-5">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-midnight-800">
                  {filteredStudents.map((student) => {
                    const isPresent = student.status === 'Present';
                    const isAbsent = student.status === 'Absent';
                    const isOnLeave = student.status === 'On Leave';

                    return (
                      <tr key={student.rollNo} className="hover:bg-offwhite/60 dark:hover:bg-midnight-800/40">
                        <td className="py-2.5 px-5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {student.rollNo}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          {student.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-medium">
                          {student.section}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isPresent
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : isAbsent
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.rollNo, 'Present')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-slate-100 dark:bg-midnight-800 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.rollNo, 'Absent')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-slate-100 dark:bg-midnight-800 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.rollNo, 'On Leave')}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                                isOnLeave
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-slate-100 dark:bg-midnight-800 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* History Log Tab */
        <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Historical Attendance Logs
              </h3>
              <p className="text-xs text-slate-500">
                Audited lecture attendance records across CSIT Section A and Section B
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={historySectionFilter}
                onChange={(e) => setHistorySectionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Sections</option>
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
              </select>

              <select
                value={historySubjectFilter}
                onChange={(e) => setHistorySubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Subjects</option>
                {CSIT_5TH_SEM_SUBJECTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} ({s.shortName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-midnight-800 bg-offwhite dark:bg-midnight-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4 text-center">Present / Total</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-midnight-800">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-offwhite dark:hover:bg-midnight-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{item.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {item.subjectName} ({item.subjectCode})
                    </td>
                    <td className="py-3 px-4 font-bold text-electric-600 dark:text-electric-400">{item.section}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{item.facultyName}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className="text-emerald-600">{item.presentCount}</span> / {item.totalStudents}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                        {item.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
