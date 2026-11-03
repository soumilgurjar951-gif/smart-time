// src/components/FacultySelect.jsx
import React from 'react';
import { User, Check, AlertCircle } from 'lucide-react';

export default function FacultySelect({
  facultyList = [],
  selectedFacultyId,
  onChange,
  label = 'Select Faculty',
  disabled = false,
  required = false,
  showWorkload = true,
  placeholder = '-- Choose a Faculty Member --',
}) {
  const selectedFaculty = facultyList.find((f) => f.id === selectedFacultyId);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          value={selectedFacultyId || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-electric-500/20 focus:border-electric-600 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer pr-10 shadow-xs"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {facultyList.map((faculty) => {
            const workloadPct = Math.round(
              (faculty.currentWeeklyLectures / faculty.maxWeeklyLectures) * 100
            );
            return (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name} ({faculty.deptCode}) —{' '}
                {faculty.currentWeeklyLectures}/{faculty.maxWeeklyLectures} hrs/wk{' '}
                {faculty.status === 'Absent' ? '🔴 [Absent]' : ''}
              </option>
            );
          })}
        </select>

        {/* Dropdown chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <svg
            className="w-4 h-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {/* Selected faculty snapshot pills */}
      {selectedFaculty && showWorkload && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 p-2.5 bg-offwhite border border-slate-200/80 rounded-lg text-xs">
          <span className="font-semibold text-slate-700">
            {selectedFaculty.name}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">{selectedFaculty.department}</span>
          <span className="text-slate-400">•</span>
          <span
            className={`font-medium ${
              selectedFaculty.currentWeeklyLectures >= selectedFaculty.maxWeeklyLectures
                ? 'text-rose-600 font-bold'
                : 'text-electric-600'
            }`}
          >
            Load: {selectedFaculty.currentWeeklyLectures}/{selectedFaculty.maxWeeklyLectures} hrs/wk
          </span>
          {selectedFaculty.status === 'Absent' && (
            <span className="px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-700 font-bold text-[10px]">
              ABSENT TODAY
            </span>
          )}
        </div>
      )}
    </div>
  );
}
