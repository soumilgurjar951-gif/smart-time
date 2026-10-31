// src/pages/ManageFaculty.jsx
import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';
import Modal from '../components/Modal';

export default function ManageFaculty() {
  const {
    facultyList,
    subjectList,
    addFaculty,
    updateFaculty,
    deleteFaculty,
  } = useTimeFlow();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Computer Science & Engineering',
    deptCode: 'CSE',
    maxWeeklyLectures: 16,
    currentWeeklyLectures: 0,
    teachableSubjects: [],
  });

  const openAddModal = () => {
    setEditingFaculty(null);
    setFormData({
      name: '',
      email: '',
      department: 'Computer Science & Engineering',
      deptCode: 'CSE',
      maxWeeklyLectures: 16,
      currentWeeklyLectures: 0,
      teachableSubjects: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (faculty) => {
    setEditingFaculty(faculty);
    setFormData({
      name: faculty.name,
      email: faculty.email,
      department: faculty.department,
      deptCode: faculty.deptCode || 'CSE',
      maxWeeklyLectures: faculty.maxWeeklyLectures,
      currentWeeklyLectures: faculty.currentWeeklyLectures || 0,
      teachableSubjects: faculty.teachableSubjects || [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingFaculty) {
      updateFaculty(editingFaculty.id, formData);
    } else {
      addFaculty(formData);
    }
    setIsModalOpen(false);
  };

  const handleSubjectToggle = (subjName) => {
    setFormData((prev) => {
      const exists = prev.teachableSubjects.includes(subjName);
      if (exists) {
        return {
          ...prev,
          teachableSubjects: prev.teachableSubjects.filter((s) => s !== subjName),
        };
      } else {
        return {
          ...prev,
          teachableSubjects: [...prev.teachableSubjects, subjName],
        };
      }
    });
  };

  // Filtered List
  const filteredFaculty = facultyList.filter((faculty) => {
    const matchesSearch =
      faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept =
      selectedDept === 'ALL' || faculty.deptCode === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            Faculty Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintain professors, lecturers, teaching quotas, and assigned specialization courses
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by faculty name, email, department..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="CSE">Computer Science (CSE)</option>
            <option value="IT">Information Tech (IT)</option>
          </select>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {filteredFaculty.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No faculty members found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or department filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Faculty Name & Email</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Teachable Subjects</th>
                  <th className="py-3.5 px-4">Workload (Weekly)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredFaculty.map((faculty) => {
                  const workloadPct = Math.min(
                    100,
                    Math.round(
                      (faculty.currentWeeklyLectures /
                        faculty.maxWeeklyLectures) *
                        100
                    )
                  );
                  const isOverloaded =
                    faculty.currentWeeklyLectures >= faculty.maxWeeklyLectures;

                  return (
                    <tr
                      key={faculty.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                              faculty.avatarColor || 'bg-indigo-600'
                            }`}
                          >
                            {faculty.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(-2)
                              .join('')}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {faculty.name}
                            </span>
                            <span className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {faculty.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {faculty.deptCode || 'CSE'}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-1">
                          {faculty.department}
                        </span>
                      </td>

                      {/* Subjects */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {faculty.teachableSubjects?.map((subj, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              {subj}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Workload Progress */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {faculty.currentWeeklyLectures} / {faculty.maxWeeklyLectures} hrs
                            </span>
                            <span
                              className={`font-semibold text-[11px] ${
                                isOverloaded ? 'text-rose-600' : 'text-slate-500'
                              }`}
                            >
                              {workloadPct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOverloaded
                                  ? 'bg-rose-500'
                                  : workloadPct > 75
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${workloadPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {faculty.status === 'Absent' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Absent Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Available
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(faculty)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete ${faculty.name}?`
                                )
                              ) {
                                deleteFaculty(faculty.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete faculty"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Member' : 'Add New Faculty Member'}
        subtitle="Manage instructor profile, weekly lecture capacity, and subject certifications."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Arthur Wright"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
              Institutional Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. arthur.wright@cdgi.edu.in"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                Department
              </label>
              <select
                value={formData.deptCode}
                onChange={(e) => {
                  const code = e.target.value;
                  const dept =
                    code === 'CSE'
                      ? 'Computer Science & Engineering'
                      : 'Information Technology';
                  setFormData({ ...formData, deptCode: code, department: dept });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
              >
                <option value="CSE">Computer Science & Engineering (CSE)</option>
                <option value="IT">Information Technology (IT)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                Max Weekly Lectures (Hrs)
              </label>
              <input
                type="number"
                min="6"
                max="30"
                value={formData.maxWeeklyLectures}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxWeeklyLectures: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Teachable Subjects Multi-Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Teachable Subjects (Specializations)
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-44 overflow-y-auto">
              {subjectList.map((subject) => {
                const isChecked = formData.teachableSubjects.includes(subject.name);
                return (
                  <label
                    key={subject.id}
                    className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 hover:text-indigo-600"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleSubjectToggle(subject.name)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      {subject.name} ({subject.code})
                    </span>
                    {subject.isLab && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded-sm">
                        Lab
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-colors"
            >
              {editingFaculty ? 'Save Changes' : 'Add Faculty'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
