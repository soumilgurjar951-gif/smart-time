// src/pages/FacultyTimetable.jsx
import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  User,
  Mail,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';
import FacultySelect from '../components/FacultySelect';
import TimetableGrid from '../components/TimetableGrid';
import { Link } from 'react-router-dom';

export default function FacultyTimetable() {
  const { facultyList, timetableEntries, classList } = useTimeFlow();

  const [selectedFacultyId, setSelectedFacultyId] = useState(
    facultyList[0]?.id || ''
  );

  const selectedFaculty = facultyList.find((f) => f.id === selectedFacultyId);

  // Filter entries taught by this faculty member
  // Also attach className from classList
  const facultyTimetableEntries = useMemo(() => {
    const classMap = classList.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});

    return timetableEntries
      .filter((t) => t.facultyId === selectedFacultyId)
      .map((entry) => ({
        ...entry,
        className: classMap[entry.classId] || entry.className || 'Class Group',
      }));
  }, [timetableEntries, selectedFacultyId, classList]);

  // Workload calculations
  const currentWorkload = selectedFaculty?.currentWeeklyLectures || 0;
  const maxWorkload = selectedFaculty?.maxWeeklyLectures || 16;
  const workloadPercentage = Math.min(
    100,
    Math.round((currentWorkload / maxWorkload) * 100)
  );
  const remainingCapacity = Math.max(0, maxWorkload - currentWorkload);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            Faculty Schedule & Workload
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Individual weekly timetable schedules, period commitments, and teaching quota distribution
          </p>
        </div>

        {/* Faculty Selector Dropdown */}
        <div className="w-full sm:w-80">
          <FacultySelect
            facultyList={facultyList}
            selectedFacultyId={selectedFacultyId}
            onChange={(id) => setSelectedFacultyId(id)}
            label=""
            placeholder="Select a Faculty Member"
            showWorkload={false}
          />
        </div>
      </div>

      {/* Faculty Profile & Workload Card */}
      {selectedFaculty && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Left Col: Faculty Bio */}
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-md shrink-0 ${
                  selectedFaculty.avatarColor || 'bg-indigo-600'
                }`}
              >
                {selectedFaculty.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(-2)
                  .join('')}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedFaculty.name}
                  </h3>
                  {selectedFaculty.status === 'Absent' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      Absent Today
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {selectedFaculty.email}
                </p>

                <p className="text-xs text-indigo-700 font-medium mt-1">
                  {selectedFaculty.department} ({selectedFaculty.deptCode})
                </p>
              </div>
            </div>

            {/* Middle Col: Workload Meter & Capacity */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Weekly Teaching Quota
                </span>
                <span
                  className={`font-bold ${
                    workloadPercentage >= 100
                      ? 'text-rose-600'
                      : workloadPercentage > 75
                      ? 'text-amber-600'
                      : 'text-indigo-600'
                  }`}
                >
                  {currentWorkload} / {maxWorkload} Hrs ({workloadPercentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    workloadPercentage >= 100
                      ? 'bg-rose-500'
                      : workloadPercentage > 75
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${workloadPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  Remaining Capacity:{' '}
                  <strong className="text-slate-800">
                    {remainingCapacity} lectures/week
                  </strong>
                </span>
                <span>
                  {workloadPercentage >= 100 ? (
                    <span className="text-rose-600 font-bold">Quota Full</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Eligible for Substitution</span>
                  )}
                </span>
              </div>
            </div>

            {/* Right Col: Teachable Subject Tags */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Specialized Subject Areas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedFaculty.teachableSubjects?.map((subj, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {subj}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-600" />
              Weekly Lecture Schedule: {selectedFaculty?.name}
            </h3>
            <p className="text-xs text-slate-500">
              Each cell specifies the assigned class cohort, course title, and room location
            </p>
          </div>

          <Link
            to="/timetable-builder"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Modify in Timetable Builder</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Timetable Grid for Faculty */}
        <TimetableGrid
          timetableEntries={facultyTimetableEntries}
          mode="faculty"
          readOnly={true}
          highlightAbsentFacultyId={
            selectedFaculty?.status === 'Absent' ? selectedFaculty.id : null
          }
        />
      </div>
    </div>
  );
}
