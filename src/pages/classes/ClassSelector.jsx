// src/pages/classes/ClassSelector.jsx
import React, { useState } from 'react';
import { GraduationCap, Plus, Users, BookOpen } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import classService from '../../services/classService';
import { useOdrms } from '../../context/OdrmsContext';

function getErrorMessage(error) {
  const details = error.response?.data?.error?.details || error.response?.data?.error?.message || error.response?.data;
  if (!details) return error.message || 'The request failed.';
  if (typeof details === 'string') return details;
  return Object.entries(details)
    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
    .join(' · ');
}

const EMPTY_CLASS_FORM = {
  department: '',
  year: '',
  semester: '',
  section: '',
  academic_year: '',
};

export default function ClassSelector({ classes, selectedId, onSelect, isHod, onClassCreated }) {
  const { showToast } = useOdrms();
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(EMPTY_CLASS_FORM);

  const openCreate = async () => {
    setForm(EMPTY_CLASS_FORM);
    setShowCreate(true);
    try {
      const data = await classService.getDepartments();
      setDepartments(data);
      setForm((current) => ({ ...current, department: String(data[0]?.id || '') }));
    } catch {
      showToast('Could not load departments.', 'error');
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      const created = await classService.createClass({
        department: Number(form.department),
        year: Number(form.year),
        semester: Number(form.semester),
        section: form.section.trim().toUpperCase(),
        academic_year: form.academic_year.trim() || undefined,
      });
      showToast(`Class "${created.display_name || 'New class'}" created.`);
      setShowCreate(false);
      onClassCreated(created);
    } catch (error) {
      showToast(getErrorMessage(error) || 'Could not create the class.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const inputClasses =
    'w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-electric-50 dark:bg-electric-950/50 text-electric-600 dark:text-electric-400 flex items-center justify-center border border-electric-100 dark:border-electric-900">
            <GraduationCap className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Classes
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isHod ? 'Select a class to load its workspace below' : 'Classes your HOD has authorized you to view'}
            </p>
          </div>
        </div>
        {isHod && (
          <Button size="sm" variant="outline" icon={Plus} onClick={openCreate}>
            Add Class
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {classes.map((cls) => {
          const isSelected = String(cls.id) === String(selectedId);
          return (
            <button
              key={cls.id}
              onClick={() => onSelect(cls.id)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-electric-600 border-electric-600 text-white shadow-sm shadow-electric-600/30'
                  : 'bg-offwhite dark:bg-midnight-800/60 border-slate-200 dark:border-midnight-700 hover:border-electric-300 dark:hover:border-electric-700 hover:bg-electric-50/60 dark:hover:bg-midnight-800'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-white/15 text-white'
                    : 'bg-electric-50 dark:bg-electric-950/50 text-electric-600 dark:text-electric-400'
                }`}
              >
                <GraduationCap className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {cls.display_name}
                </p>
                <div className={`flex items-center gap-2.5 mt-0.5 text-[10px] font-semibold ${isSelected ? 'text-electric-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {cls.subject_count ?? 0} subjects
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {cls.faculty_count ?? 0} faculty
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create a Class"
        subtitle="Year, semester and section generate a unique display name per department."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department</span>
              <select
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputClasses}
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Year (optional)</span>
              <input
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                placeholder="e.g. 2025-26"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Year</span>
              <input
                required
                type="number"
                min="1"
                max="5"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="e.g. 3"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Semester</span>
              <input
                required
                type="number"
                min="1"
                max="10"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                placeholder="e.g. 5"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Section (single letter)</span>
              <input
                required
                maxLength={1}
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })}
                placeholder="e.g. A"
                className={inputClasses}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" icon={Plus} isLoading={isCreating}>
              Create Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
