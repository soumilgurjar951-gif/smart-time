// src/components/forms/LectureForm.jsx
import React, { useState } from 'react';
import Button from '../common/Button';
import {
  CSIT_5TH_SEM_SUBJECTS,
  TIME_SLOTS,
  DAYS_OF_WEEK,
  SECTIONS,
} from '../../utils/constants';

export default function LectureForm({
  initialData,
  facultyList = [],
  resourceList = [],
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    subjectCode: initialData?.subjectCode || CSIT_5TH_SEM_SUBJECTS[0].code,
    subjectName: initialData?.subjectName || CSIT_5TH_SEM_SUBJECTS[0].name,
    facultyId: initialData?.facultyId || facultyList[0]?.id || '',
    facultyName: initialData?.facultyName || facultyList[0]?.name || '',
    section: initialData?.section || 'Section A',
    day: initialData?.day || 'Monday',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    timeSlot: initialData?.timeSlot || TIME_SLOTS[0].label,
    period: initialData?.period || 1,
    classroom: initialData?.classroom || 'CSIT Smart Classroom 301',
    lectureType: initialData?.lectureType || 'Theory',
    topic: initialData?.topic || '',
    status: initialData?.status || 'Scheduled',
  });

  const handleSubjectChange = (code) => {
    const sub = CSIT_5TH_SEM_SUBJECTS.find((s) => s.code === code);
    if (sub) {
      setFormData((prev) => ({
        ...prev,
        subjectCode: sub.code,
        subjectName: sub.name,
        lectureType: sub.type,
      }));
    }
  };

  const handleFacultyChange = (id) => {
    const f = facultyList.find((item) => item.id === id);
    if (f) {
      setFormData((prev) => ({
        ...prev,
        facultyId: f.id,
        facultyName: f.name,
      }));
    }
  };

  const handleTimeSlotChange = (label) => {
    const slot = TIME_SLOTS.find((s) => s.label === label);
    setFormData((prev) => ({
      ...prev,
      timeSlot: label,
      period: slot ? slot.period : 1,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Subject (5th Sem CSIT) *
          </label>
          <select
            value={formData.subjectCode}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {CSIT_5TH_SEM_SUBJECTS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name} ({s.type})
              </option>
            ))}
          </select>
        </div>

        {/* Assigned Faculty */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Assigned Faculty *
          </label>
          <select
            value={formData.facultyId}
            onChange={(e) => handleFacultyChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {facultyList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.designation})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Section (Sec A or Sec B) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Section *
          </label>
          <select
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {/* Lecture Type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Lecture Type
          </label>
          <select
            value={formData.lectureType}
            onChange={(e) => setFormData({ ...formData, lectureType: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="Theory">Theory Lecture</option>
            <option value="Lab">Lab Practical</option>
            <option value="Practical">Seminar / Project</option>
            <option value="Tutorial">Tutorial / Doubt Session</option>
          </select>
        </div>

        {/* Day */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Day of Week
          </label>
          <select
            value={formData.day}
            onChange={(e) => setFormData({ ...formData, day: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Time Slot */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Time Slot & Period *
          </label>
          <select
            value={formData.timeSlot}
            onChange={(e) => handleTimeSlotChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {TIME_SLOTS.map((s) => (
              <option key={s.id} value={s.label}>
                Period {s.period} ({s.label})
              </option>
            ))}
          </select>
        </div>

        {/* Classroom / Laboratory */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Classroom / Laboratory *
          </label>
          <input
            type="text"
            required
            value={formData.classroom}
            onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
            placeholder="e.g. CSIT Smart Classroom 301 or Lab 1"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Topic / Syllabus Unit *
        </label>
        <input
          type="text"
          required
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          placeholder="e.g. Dynamic Programming: Longest Common Subsequence"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Lecture' : 'Schedule Lecture'}
        </Button>
      </div>
    </form>
  );
}

