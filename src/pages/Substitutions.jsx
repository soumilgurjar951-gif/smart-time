// src/pages/Substitutions.jsx
import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  UserX,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  BookOpen,
  Filter,
  Layers,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';
import SubstitutionCard from '../components/SubstitutionCard';

export default function Substitutions() {
  const {
    absences,
    substitutions,
    getAvailableSubstitutes,
    assignSubstitution,
  } = useTimeFlow();

  // Selected Absent Faculty ID
  const [selectedAbsenceId, setSelectedAbsenceId] = useState(
    absences.length > 0 ? absences[0].id : ''
  );

  const selectedAbsence = absences.find((a) => a.id === selectedAbsenceId);

  // Stats for the active absence
  const pendingLecturesCount = useMemo(() => {
    if (!selectedAbsence) return 0;
    return selectedAbsence.affectedLectures?.filter(
      (l) => l.status !== 'Substituted'
    ).length || 0;
  }, [selectedAbsence]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 mb-3">
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>Faculty Substitution Control Center</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
            Emergency Lecture Allocator
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Automatically resolve timetable gaps caused by reported faculty absences. Our algorithm scans period availability, subject specialization, and workload balance.
          </p>
        </div>

        {/* Quick Absence Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
            <span className="block text-2xl font-black text-rose-400">
              {absences.length}
            </span>
            <span className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
              Absent Today
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
            <span className="block text-2xl font-black text-emerald-400">
              {substitutions.length}
            </span>
            <span className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
              Covered Slots
            </span>
          </div>
        </div>
      </div>

      {/* Absent Faculty Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Absent Faculty Member:
            </label>
            <p className="text-xs text-slate-500">
              Pick a faculty member with an active absence report to inspect impacted periods
            </p>
          </div>

          <div className="relative sm:w-80">
            <select
              value={selectedAbsenceId}
              onChange={(e) => setSelectedAbsenceId(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer pr-10 shadow-xs"
            >
              {absences.map((abs) => (
                <option key={abs.id} value={abs.id}>
                  {abs.facultyName} ({abs.affectedLectures?.length} affected lectures)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Selected Absence Info Header */}
        {selectedAbsence && (
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-900 text-sm">
                {selectedAbsence.facultyName}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{selectedAbsence.department}</span>
              <span className="text-slate-400">•</span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold border border-rose-200">
                Reason: {selectedAbsence.reason}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                Coverage Status:
              </span>
              {pendingLecturesCount === 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All Lectures Covered
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {pendingLecturesCount} Unassigned Slots
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Affected Lectures List & Candidate Recommender */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Affected Lectures for Today ({selectedAbsence?.day || 'Monday'})
            </h3>
            <p className="text-xs text-slate-500">
              Each affected lecture displays available peer faculty ranked by subject capability and weekly load
            </p>
          </div>
        </div>

        {!selectedAbsence || selectedAbsence.affectedLectures?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">No affected lectures found</p>
            <p className="text-xs text-slate-400 mt-1">This faculty member has no lectures scheduled on this date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedAbsence.affectedLectures.map((lecture) => {
              // Calculate available substitutes for this slot
              const availableSubs = getAvailableSubstitutes(
                lecture,
                selectedAbsence.day
              );

              return (
                <SubstitutionCard
                  key={lecture.timetableId}
                  absence={selectedAbsence}
                  lecture={lecture}
                  availableSubstitutes={availableSubs}
                  onAssign={assignSubstitution}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Assigned Substitutions Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Assigned Substitutions Log & Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Real-time records of all confirmed faculty substitutions
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {substitutions.length} Records
          </span>
        </div>

        {substitutions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No substitutions have been logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date / Day</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Original Faculty</th>
                  <th className="py-3 px-4">Assigned Substitute</th>
                  <th className="py-3 px-4">Room / Period</th>
                  <th className="py-3 px-4">Match Quality</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {substitutions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">
                        {sub.day}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {sub.date}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 text-xs border border-indigo-100">
                        {sub.className}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {sub.subjectName}
                    </td>

                    <td className="py-3 px-4 text-slate-500 line-through whitespace-nowrap">
                      {sub.originalFaculty}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <strong className="text-emerald-700 font-bold block">
                        {sub.substituteFaculty}
                      </strong>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <span>{sub.room}</span> •{' '}
                      <span className="font-mono text-slate-400">
                        P{sub.period}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {sub.matchScore || 'Verified'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700">
                        {sub.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
