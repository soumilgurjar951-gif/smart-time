// src/components/TimetableGrid.jsx
import React from 'react';
import { Plus, Trash2, MapPin, User, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { TIME_PERIODS, DAYS_OF_WEEK } from '../data/dummyData';

export default function TimetableGrid({
  timetableEntries = [],
  onCellClick,
  onDeleteEntry,
  mode = 'class', // 'class' or 'faculty'
  readOnly = false,
  highlightAbsentFacultyId = null,
}) {
  // Helper to look up an entry for a specific day and period
  const getEntryForSlot = (day, period) => {
    return timetableEntries.find(
      (entry) => entry.day === day && Number(entry.period) === Number(period)
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Scrollable table container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          {/* Header row: Days / Time periods */}
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-4 px-4 font-semibold text-xs text-slate-500 uppercase tracking-wider w-32 sticky left-0 bg-slate-50/95 z-10 backdrop-blur-xs">
                Day / Time
              </th>
              {TIME_PERIODS.map((period) => (
                <th
                  key={period.period}
                  className="py-3 px-3 font-semibold text-xs text-slate-700 border-l border-slate-200/60 min-w-[145px]"
                >
                  <div className="flex flex-col">
                    <span className="text-indigo-600 font-bold">
                      Period {period.period}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal mt-0.5">
                      {period.startTime} - {period.endTime}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body: Days */}
          <tbody className="divide-y divide-slate-100">
            {DAYS_OF_WEEK.map((day) => {
              const isToday = day === 'Monday'; // Today mock is Monday

              return (
                <tr
                  key={day}
                  className={`group transition-colors ${
                    isToday ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Day label column */}
                  <td className="py-4 px-4 font-semibold text-sm text-slate-800 sticky left-0 bg-white/95 group-hover:bg-slate-50/90 z-10 border-r border-slate-100 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{day}</span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                          Today
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 6 Period Cells */}
                  {TIME_PERIODS.map((period) => {
                    const entry = getEntryForSlot(day, period.period);
                    const isFacultyAbsent =
                      highlightAbsentFacultyId &&
                      entry?.facultyId === highlightAbsentFacultyId;

                    return (
                      <td
                        key={period.period}
                        className="p-2 border-l border-slate-100 align-top h-32"
                      >
                        {entry ? (
                          <div
                            className={`h-full flex flex-col justify-between p-3 rounded-xl border text-xs transition-all relative group/cell ${
                              isFacultyAbsent
                                ? 'bg-rose-50/80 border-rose-300 text-rose-900 shadow-xs'
                                : 'bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 border-indigo-100/90 hover:border-indigo-300 hover:shadow-md'
                            }`}
                          >
                            {/* Card Content */}
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                <span className="font-bold text-slate-900 leading-snug line-clamp-2">
                                  {entry.subjectName}
                                </span>
                                {!readOnly && onDeleteEntry && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteEntry(entry.id);
                                    }}
                                    className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-all shrink-0"
                                    title="Remove this class slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Mode details */}
                              {mode === 'class' ? (
                                <div className="space-y-1 text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span className="truncate font-medium">
                                      {entry.facultyName}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1 text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span className="truncate font-semibold text-indigo-700">
                                      {entry.className || 'Class Group'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Bottom row: Room and status */}
                            <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-medium bg-white/80 px-1.5 py-0.5 rounded-sm border border-slate-200/60">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {entry.room}
                              </span>

                              {isFacultyAbsent ? (
                                <span className="flex items-center gap-0.5 text-rose-600 font-bold text-[10px]">
                                  <AlertCircle className="w-3 h-3" />
                                  Absent
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px]">
                                  P{period.period}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : readOnly ? (
                          <div className="h-full rounded-xl border border-dashed border-slate-100 bg-slate-50/30 flex items-center justify-center text-slate-300 text-xs">
                            —
                          </div>
                        ) : (
                          <button
                            onClick={() => onCellClick && onCellClick(day, period.period)}
                            className="w-full h-full min-h-[90px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-400 hover:text-indigo-600 flex flex-col items-center justify-center gap-1 transition-all group/btn"
                            title={`Add class for ${day} Period ${period.period}`}
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-100 group-hover/btn:bg-indigo-100 flex items-center justify-center transition-colors">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-medium">Assign</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
