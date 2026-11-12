// src/pages/achievements/AchievementManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Plus,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AchievementForm from '../../components/forms/AchievementForm';
import { achievementService } from '../../services/achievementService';
import { useOdrms } from '../../context/OdrmsContext';
import { useAuth } from '../../context/AuthContext';
import { ACHIEVEMENT_CATEGORIES } from '../../utils/constants';

export default function AchievementManagement() {
  const { user, isHod } = useAuth();
  const { showToast, refreshCounts, addActivity } = useOdrms();

  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reviewingAch, setReviewingAch] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const data = await achievementService.getAllAchievements();
      setAchievements(data);
    } catch {
      showToast('Error loading achievements.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((a) => {
      const matchCat = categoryFilter === 'All' || a.category === categoryFilter;
      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
      const matchSearch =
        search === '' ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.facultyName.toLowerCase().includes(search.toLowerCase()) ||
        a.issuingBody.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase());

      return matchCat && matchStatus && matchSearch;
    });
  }, [achievements, categoryFilter, statusFilter, search]);

  const handleSubmitAchievement = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await achievementService.submitAchievement(formData);
      setAchievements((prev) => [created, ...prev]);
      showToast(`Achievement "${created.title}" submitted for HOD verification!`);
      addActivity(`Achievement Uploaded by ${created.facultyName}`, created.title, 'achievement');
      setIsSubmitModalOpen(false);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error submitting achievement.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewDecision = async (status) => {
    if (!reviewingAch) return;
    setIsSubmitting(true);
    try {
      const updated = await achievementService.reviewAchievement(reviewingAch.id, {
        status,
        approvedBy: user?.full_name || 'HOD',
        reviewNotes,
      });
      setAchievements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Achievement has been ${status}!`);
      addActivity(`Achievement ${status}: ${updated.title}`, `Verified by ${user?.full_name}`, 'achievement');
      setReviewingAch(null);
      setReviewNotes('');
      refreshCounts();
    } catch {
      showToast('Error recording review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-400 text-xs font-bold border border-purple-200 dark:border-purple-900 mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Research, Patents & Professional Certifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Faculty Achievements & Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Submit scholarly publications, NPTEL/ATAL FDPs, patents, and awards with supporting certificates for HOD approval.
          </p>
        </div>

        <Button onClick={() => setIsSubmitModalOpen(true)} icon={Plus}>
          Submit New Achievement
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by title, faculty, or publisher..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Categories</option>
            {ACHIEVEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Under Review">Under Review</option>
            <option value="Changes Requested">Changes Requested</option>
          </select>
        </div>
      </div>

      {/* Achievements Grid */}
      {loading ? (
        <LoadingSpinner message="Loading faculty achievements..." />
      ) : filteredAchievements.length === 0 ? (
        <EmptyState
          title="No achievements found"
          description="Try selecting a different filter category or upload your first scholarly paper or award."
          actionLabel="Submit New Achievement"
          onAction={() => setIsSubmitModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAchievements.map((ach) => {
            const isApproved = ach.status === 'Approved';
            const isUnderReview = ach.status === 'Under Review';

            return (
              <div
                key={ach.id}
                className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-electric-300 dark:hover:border-electric-700 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {ach.category}
                    </span>
                    <Badge status={ach.status}>{ach.status}</Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {ach.title}
                    </h3>
                    <p className="text-xs text-electric-600 dark:text-electric-400 font-semibold mt-1">
                      {ach.issuingBody}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>

                  {/* Faculty & Date */}
                  <div className="pt-2 border-t border-slate-100 dark:border-midnight-800 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Faculty:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{ach.facultyName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Date:</span>
                      <span>{ach.date}</span>
                    </div>
                    {isApproved && ach.approvedBy && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Verified By:</span>
                        <span>{ach.approvedBy}</span>
                      </div>
                    )}
                  </div>

                  {/* Supporting Certificate Mock Tag */}
                  <div className="p-2.5 rounded-xl bg-offwhite dark:bg-midnight-800/60 border border-slate-100 dark:border-midnight-700/80 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                      📄 {ach.certificateFileName || 'certificate-proof.pdf'}
                    </span>
                    <span className="text-electric-600 dark:text-electric-400 font-bold">
                      Digital Verified
                    </span>
                  </div>
                </div>

                {/* HOD Review Trigger */}
                {isHod && isUnderReview && (
                  <div className="pt-3 border-t border-slate-100 dark:border-midnight-800">
                    <Button
                      size="sm"
                      onClick={() => setReviewingAch(ach)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      HOD Verification Interface
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Submit Achievement */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Faculty Achievement"
        subtitle="Upload paper proof or certification for departmental accreditation files"
      >
        <AchievementForm
          user={user}
          onSubmit={handleSubmitAchievement}
          onCancel={() => setIsSubmitModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Modal: HOD Verification Dialog */}
      <Modal
        isOpen={Boolean(reviewingAch)}
        onClose={() => setReviewingAch(null)}
        title="HOD Achievement Verification"
        subtitle={reviewingAch?.title}
      >
        {reviewingAch && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 space-y-1.5">
              <p><strong>Faculty:</strong> {reviewingAch.facultyName} ({reviewingAch.designation})</p>
              <p><strong>Category:</strong> {reviewingAch.category}</p>
              <p><strong>Issuing Body:</strong> {reviewingAch.issuingBody}</p>
              <p><strong>Details:</strong> {reviewingAch.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Verification Feedback / Endorsement Notes
              </label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Scopus Q1 verified, eligible for NAAC Criteria 3.4 citation score..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReviewDecision('Changes Requested')}
                isLoading={isSubmitting}
              >
                Request Revisions
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleReviewDecision('Approved')}
                isLoading={isSubmitting}
              >
                Approve & Endorse
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

