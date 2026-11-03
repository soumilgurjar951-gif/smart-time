// src/components/forms/TaskForm.jsx
import React, { useState } from 'react';
import Button from '../common/Button';
import { TASK_PRIORITIES } from '../../utils/constants';

export default function TaskForm({
  facultyList = [],
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedToId: facultyList[0]?.id || '',
    assignedToName: facultyList[0]?.name || '',
    section: 'Section A & B',
    priority: 'High',
    deadline: '',
    category: 'Accreditation',
  });

  const handleFacultyChange = (id) => {
    const f = facultyList.find((item) => item.id === id);
    if (f) {
      setFormData((prev) => ({
        ...prev,
        assignedToId: f.id,
        assignedToName: f.name,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Task Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. NAAC Criteria 2.3 Documentation & Lab Manual Audit"
          className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Detailed Description & Deliverables *
        </label>
        <textarea
          rows={3}
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Specify deliverables, standards, and guidelines for the assigned faculty..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Assign To Faculty Member *
          </label>
          <select
            value={formData.assignedToId}
            onChange={(e) => handleFacultyChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {facultyList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.designation})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="Accreditation">Accreditation (NAAC/NBA)</option>
            <option value="Exam Duty">Exam & Evaluation Duty</option>
            <option value="Lab Setup">Lab Setup & Environment Audit</option>
            <option value="Academic Activity">Academic Activity / Guest Session</option>
            <option value="Project Mentorship">Minor Project Mentorship</option>
            <option value="Curriculum Review">Curriculum & Syllabus Revision</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Priority *
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p} Priority
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Section Scope
          </label>
          <select
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="Section A & B">Section A & B (Both)</option>
            <option value="Section A">Section A Only</option>
            <option value="Section B">Section B Only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Deadline *
          </label>
          <input
            type="date"
            required
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Assign Departmental Task
        </Button>
      </div>
    </form>
  );
}

