// src/components/forms/FacultyForm.jsx
import React, { useState } from 'react';
import Button from '../common/Button';
import { CSIT_5TH_SEM_SUBJECTS, SECTIONS } from '../../utils/constants';

export default function FacultyForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    facultyCode: initialData?.facultyCode || '',
    employeeId: initialData?.employeeId || '',
    email: initialData?.email || '',
    designation: initialData?.designation || '',
    contact: initialData?.contact || '',
    status: initialData?.status || 'Inactive',
    assignedSubjects: initialData?.assignedSubjects || [],
    assignedSections: initialData?.assignedSections || [],
    password: '',
  });

  const handleSubjectToggle = (subjName) => {
    setFormData((prev) => {
      const exists = prev.assignedSubjects.includes(subjName);
      if (exists) {
        return { ...prev, assignedSubjects: prev.assignedSubjects.filter((s) => s !== subjName) };
      }
      return { ...prev, assignedSubjects: [...prev.assignedSubjects, subjName] };
    });
  };

  const handleSectionToggle = (sec) => {
    setFormData((prev) => {
      const exists = prev.assignedSections.includes(sec);
      if (exists) {
        return { ...prev, assignedSections: prev.assignedSections.filter((s) => s !== sec) };
      }
      return { ...prev, assignedSections: [...prev.assignedSections, sec] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Faculty Code / Initials</label>
          <input
            type="text"
            value={formData.facultyCode}
            onChange={(e) => setFormData({ ...formData, facultyCode: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Dr. Ramesh Gupta"
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Employee ID *
          </label>
          <input
            type="text"
            required
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            placeholder="e.g. EMP-CSIT-007"
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Institutional Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="name@cdgi.edu.in"
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Contact Number
          </label>
          <input
            type="text"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            placeholder="+91 98260 00000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Designation
          </label>
          <select
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="">Select verified designation</option>
            <option value="Professor & HOD">Professor & HOD</option>
            <option value="Professor">Professor</option>
            <option value="Associate Professor">Associate Professor</option>
            <option value="Assistant Professor">Assistant Professor</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Account Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        {initialData?.userId ? 'Reset password (optional)' : 'Account password'}
        <input
          type="password"
          autoComplete="new-password"
          required={!initialData?.id || (!initialData?.userId && formData.status === 'Active')}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </label>

      {/* Assigned Sections (Exclusively Section A and B) */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Assigned 5th Sem Sections (CSIT) *
        </label>
        <div className="flex gap-4">
          {SECTIONS.map((sec) => (
            <label
              key={sec}
              className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.assignedSections.includes(sec)}
                onChange={() => handleSectionToggle(sec)}
                className="w-4 h-4 rounded text-electric-600 focus:ring-electric-500"
              />
              <span>{sec}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Assigned Subjects in 5th Semester */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Assigned Subjects (CSIT 3rd Year / 5th Sem) *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-offwhite dark:bg-midnight-800/60 p-3 rounded-2xl border border-slate-200 dark:border-midnight-700">
          {CSIT_5TH_SEM_SUBJECTS.map((sub) => {
            const isChecked = formData.assignedSubjects.includes(sub.name);
            return (
              <label
                key={sub.code}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  isChecked
                    ? 'bg-electric-50 dark:bg-electric-950/70 text-electric-900 dark:text-electric-200 border border-electric-200 dark:border-electric-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-midnight-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleSubjectToggle(sub.name)}
                  className="w-3.5 h-3.5 rounded text-electric-600 focus:ring-electric-500"
                />
                <span className="truncate">
                  {sub.shortName} — {sub.name}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Faculty Details' : 'Add Faculty Member'}
        </Button>
      </div>
    </form>
  );
}
