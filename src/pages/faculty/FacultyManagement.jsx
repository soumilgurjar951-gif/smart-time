// src/pages/faculty/FacultyManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Eye,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FacultyForm from '../../components/forms/FacultyForm';
import { facultyService } from '../../services/facultyService';
import { useOdrms } from '../../context/OdrmsContext';
import { useAuth } from '../../context/AuthContext';

export default function FacultyManagement() {
  const { isHod } = useAuth();
  const { showToast, refreshCounts } = useOdrms();
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [viewingFaculty, setViewingFaculty] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const data = await facultyService.getAllFaculty();
      setFacultyList(data);
    } catch {
      showToast('Failed to load faculty list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const matchSearch =
        search === '' ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        f.email.toLowerCase().includes(search.toLowerCase()) ||
        f.assignedSubjects.some((s) => s.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'All' || f.status === statusFilter;
      const matchSection = sectionFilter === 'All' || f.assignedSections.includes(sectionFilter);

      return matchSearch && matchStatus && matchSection;
    });
  }, [facultyList, search, statusFilter, sectionFilter]);

  const handleCreateFaculty = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await facultyService.createFaculty(formData);
      setFacultyList((prev) => [created, ...prev]);
      showToast(`Faculty member ${created.name} successfully added!`);
      setIsAddModalOpen(false);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error adding faculty member.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFaculty = async (formData) => {
    if (!editingFaculty) return;
    setIsSubmitting(true);
    try {
      const updated = await facultyService.updateFaculty(editingFaculty.id, formData);
      setFacultyList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast(`Faculty details for ${updated.name} updated!`);
      setEditingFaculty(null);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error updating faculty member.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from CSIT 5th Sem?`)) return;
    try {
      await facultyService.deleteFaculty(id);
      setFacultyList((prev) => prev.filter((f) => f.id !== id));
      showToast(`Faculty member ${name} removed.`);
      refreshCounts();
    } catch {
      showToast('Error removing faculty member.', 'error');
    }
  };

  const pendingSubmissions = useMemo(
    () => facultyList.filter((f) => f.profileStatus === 'Submitted'),
    [facultyList]
  );

  const handleReviewFaculty = async (faculty, action) => {
    setIsSubmitting(true);
    try {
      const updated = await facultyService.reviewFaculty(faculty.id, action);
      setFacultyList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      if (action === 'VERIFY') {
        showToast(`Faculty profile of ${updated.name} verified.`);
      } else {
        showToast(`Changes requested for ${updated.name}.`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile status.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-electric-50 dark:bg-electric-950/70 text-electric-700 dark:text-electric-400 text-xs font-bold border border-electric-200 dark:border-electric-900 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>CSIT Department • 3rd Year / 5th Sem</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Faculty Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain departmental profiles, assigned 5th semester subjects, section allocations, and account status.
          </p>
        </div>

        {isHod && (
          <Button onClick={() => setIsAddModalOpen(true)} icon={Plus}>
            Add Faculty Member
          </Button>
        )}
      </div>

      {/* Faculty Profile Submissions (HOD Review) */}
      {isHod && (
        <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Faculty Profile Submissions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review faculty profiles submitted during onboarding. Verify to approve teaching access or request
                corrections.
              </p>
            </div>
            <Badge status="Submitted">{pendingSubmissions.length}</Badge>
          </div>

          {pendingSubmissions.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">
              No faculty profiles are pending submission right now.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((faculty) => (
                <div
                  key={faculty.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-midnight-800 bg-offwhite/50 dark:bg-midnight-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{faculty.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {faculty.designation} • {faculty.employeeId} • {faculty.email}
                    </p>
                    <p className="text-[11px] text-slate-400">Sections: {faculty.assignedSections.join(', ') || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleReviewFaculty(faculty, 'VERIFY')} isLoading={isSubmitting}>
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReviewFaculty(faculty, 'CHANGES_REQUESTED')}
                      isLoading={isSubmitting}
                    >
                      Request Changes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200/90 dark:border-midnight-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by faculty name, EMP ID, or subject..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Sections (A & B)</option>
            <option value="Section A">Section A Only</option>
            <option value="Section B">Section B Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {loading ? (
        <LoadingSpinner message="Retrieving faculty records..." />
      ) : filteredFaculty.length === 0 ? (
        <EmptyState
          title="No faculty members found"
          description="Try adjusting your search criteria or add a new faculty member to CSIT 5th Semester."
          actionLabel={isHod ? 'Add Faculty Member' : undefined}
          onAction={isHod ? () => setIsAddModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFaculty.map((faculty) => (
            <div
              key={faculty.id}
              className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-5 shadow-xs hover:border-electric-300 dark:hover:border-electric-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header: Avatar, Name, Employee ID */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-electric-600/20">
                      {faculty.avatar || 'FC'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {faculty.name}
                      </h3>
                      <p className="text-xs text-electric-600 dark:text-electric-400 font-semibold">
                        {faculty.designation}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        {faculty.employeeId}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge status={faculty.status}>{faculty.status}</Badge>
                    <Badge status={faculty.profileStatus}>{faculty.profileStatus}</Badge>
                  </div>
                </div>

                {/* Contact and Cabin */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-midnight-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{faculty.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{faculty.contact}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{faculty.cabin}</span>
                  </div>
                </div>

                {/* Assigned Subjects & Sections */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Assigned 5th Sem Subjects:</span>
                    <span className="text-electric-600 dark:text-electric-400">
                      {faculty.assignedSections.join(' & ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {faculty.assignedSubjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-midnight-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-midnight-700"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingFaculty(faculty)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-electric-600 dark:text-electric-400 hover:bg-electric-50 dark:hover:bg-electric-950/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Full Profile</span>
                </button>

                {isHod && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingFaculty(faculty)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-electric-600 dark:hover:text-electric-400 hover:bg-slate-100 dark:hover:bg-midnight-800 transition-colors"
                      title="Edit Faculty"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {faculty.role !== 'HOD' && (
                      <button
                        onClick={() => handleDeleteFaculty(faculty.id, faculty.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-midnight-800 transition-colors"
                        title="Remove Faculty"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Faculty */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Faculty Member"
        subtitle="Register new faculty member for CSIT 3rd Year / 5th Semester"
      >
        <FacultyForm
          onSubmit={handleCreateFaculty}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Modal: Edit Faculty */}
      <Modal
        isOpen={Boolean(editingFaculty)}
        onClose={() => setEditingFaculty(null)}
        title="Edit Faculty Details"
        subtitle={`Update profile and teaching allocations for ${editingFaculty?.name}`}
      >
        {editingFaculty && (
          <FacultyForm
            initialData={editingFaculty}
            onSubmit={handleUpdateFaculty}
            onCancel={() => setEditingFaculty(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>

      {/* Modal: Faculty Profile Drawer */}
      <Modal
        isOpen={Boolean(viewingFaculty)}
        onClose={() => setViewingFaculty(null)}
        title="Faculty Profile"
        subtitle="Department of Computer Science & Information Technology"
      >
        {viewingFaculty && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-offwhite dark:bg-midnight-800/60 border border-slate-200 dark:border-midnight-700">
              <div className="w-16 h-16 rounded-2xl bg-electric-600 text-white font-extrabold text-xl flex items-center justify-center">
                {viewingFaculty.avatar || 'FC'}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {viewingFaculty.name}
                </h3>
                <p className="text-xs text-electric-600 dark:text-electric-400 font-bold">
                  {viewingFaculty.designation}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{viewingFaculty.qualification}</p>
                <span className="inline-block mt-1 text-[10px] font-mono font-bold text-slate-500">
                  EMP ID: {viewingFaculty.employeeId}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingFaculty.email}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingFaculty.contact}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Cabin Location</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingFaculty.cabin}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Experience</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingFaculty.experienceYears} Years</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">5th Semester Teaching Duties</h4>
              <p className="text-slate-500">
                Sections: <strong className="text-electric-600 dark:text-electric-400">{viewingFaculty.assignedSections.join(' & ')}</strong>
              </p>
              <div>
                <span className="text-slate-500 block mb-1">Assigned Subjects:</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingFaculty.assignedSubjects.map((sub, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-electric-50 dark:bg-electric-950 text-electric-700 dark:text-electric-300 font-bold border border-electric-200 dark:border-electric-900 text-xs"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setViewingFaculty(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

