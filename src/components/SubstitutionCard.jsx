// src/components/SubstitutionCard.jsx
import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Sparkles,
  UserCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

export default function SubstitutionCard({
  absence,
  lecture,
  availableSubstitutes = [],
  onAssign,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSubId, setSelectedSubId] = useState(
    availableSubstitutes.length > 0 ? availableSubstitutes[0].id : null
  );

  const isSubstituted = lecture.status === 'Substituted';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300">
      {/* Top Banner: Lecture Summary */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {lecture.className}
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
              Period {lecture.period}
            </span>
            {isSubstituted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Substituted by {lecture.substitutedBy}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                Pending Substitute
              </span>
            )}
          </div>

          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            {lecture.subjectName}
          </h4>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {lecture.time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {lecture.room}
            </span>
            <span>
              Absent Faculty:{' '}
              <strong className="text-slate-700">{absence.facultyName}</strong>
            </span>
          </div>
        </div>

        {/* Toggle Collapse */}
        {!isSubstituted && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1 px-3 rounded-lg hover:bg-indigo-50 self-start md:self-auto transition-colors"
          >
            <span>
              {isExpanded
                ? 'Hide Candidates'
                : `Show Candidates (${availableSubstitutes.length})`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* If already substituted banner */}
      {isSubstituted && (
        <div className="p-4 bg-emerald-50/60 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Lecture successfully assigned to{' '}
              <strong>{lecture.substitutedBy}</strong>. Timetable updated.
            </span>
          </div>
          <span className="text-[11px] font-medium text-emerald-700">
            Active Assignment
          </span>
        </div>
      )}

      {/* Available Candidates Drawer */}
      {!isSubstituted && isExpanded && (
        <div className="p-5 bg-white space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Available Faculty Substitutes (Period {lecture.period})
            </h5>
            <span className="text-xs text-slate-400">
              Ranked by subject match & workload capacity
            </span>
          </div>

          {availableSubstitutes.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/50">
              <p className="text-sm font-medium text-slate-600">
                No faculty members are free during this period.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Consider reallocating periods or conducting a combined lab session.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {availableSubstitutes.map((substitute, index) => {
                const isBestMatch = index === 0;
                const isSelected = selectedSubId === substitute.id;
                const workloadPercent = Math.round(
                  (substitute.currentWeeklyLectures /
                    substitute.maxWeeklyLectures) *
                    100
                );

                return (
                  <div
                    key={substitute.id}
                    onClick={() => setSelectedSubId(substitute.id)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500/30'
                        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Faculty Info */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          substitute.avatarColor || 'bg-indigo-600'
                        }`}
                      >
                        {substitute.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(-2)
                          .join('')}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {substitute.name}
                          </span>
                          {isBestMatch && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Best Match
                            </span>
                          )}
                          {substitute.canTeachSubject && (
                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                              Subject Specialist
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{substitute.deptCode} Department</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            Current Load:{' '}
                            <strong className="text-slate-700">
                              {substitute.currentWeeklyLectures}/
                              {substitute.maxWeeklyLectures} hrs
                            </strong>{' '}
                            ({workloadPercent}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="mt-3 sm:mt-0 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssign({
                            absenceId: absence.id,
                            lectureTimetableId: lecture.timetableId,
                            substituteFaculty: substitute,
                            lectureInfo: {
                              ...lecture,
                              originalFacultyName: absence.facultyName,
                              day: absence.day,
                            },
                          });
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                          isBestMatch
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign Substitute</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
