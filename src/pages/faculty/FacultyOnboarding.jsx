// src/pages/faculty/FacultyOnboarding.jsx
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useOdrms } from '../../context/OdrmsContext';
import { facultyService } from '../../services/facultyService';
import { DEPARTMENT_INFO } from '../../utils/constants';

export default function FacultyOnboarding() {
  const { user } = useAuth();
  const { showToast } = useOdrms();
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    contact: user?.contact_number || '',
    qualifications: '',
    specialization: '',
    dateOfJoining: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user?.profile_status === 'VERIFIED') {
    return <Navigate to="/faculty/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.qualifications.trim()) {
      setError('Qualifications are required to submit your profile.');
      return;
    }
    if (!form.specialization.trim()) {
      setError('Specialization is required to submit your profile.');
      return;
    }
    if (!form.dateOfJoining) {
      setError('Date of joining is required to submit your profile.');
      return;
    }

    setLoading(true);
    try {
      await facultyService.updateFaculty(user.faculty_profile_id, {
        name: form.fullName,
        contact: form.contact,
        qualifications: form.qualifications,
        specialization: form.specialization,
        dateOfJoining: form.dateOfJoining,
      });
      showToast('Profile submitted for HOD verification!');
      navigate('/faculty/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to submit your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-electric-500/20 focus:border-electric-600 transition-all';

  const readOnlyField = (label, value) => (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900">
      <span className="text-slate-400 block text-[10px] uppercase font-bold">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs break-all">{value || '—'}</span>
    </div>
  );

  const statusBanner = () => {
    if (user?.profile_status === 'CHANGES_REQUESTED') {
      return (
        <div className="mb-5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            The HOD has requested changes to your profile. Please update the required details below and resubmit for
            verification.
          </span>
        </div>
      );
    }
    if (user?.profile_status === 'SUBMITTED') {
      return (
        <div className="mb-5 p-3 rounded-2xl bg-electric-50 dark:bg-electric-950/60 border border-electric-200 dark:border-electric-900 text-electric-700 dark:text-electric-300 text-xs font-semibold flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Your profile has been submitted and is awaiting HOD verification.</span>
        </div>
      );
    }
    return (
      <div className="mb-5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Your profile is <strong>{user?.profile_status || 'Incomplete'}</strong>. Please complete all required details
          and submit for HOD verification before accessing the faculty dashboard.
        </span>
      </div>
    );
  };

  if (user?.profile_status === 'VERIFIED') {
    return <Navigate to="/faculty/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-950 via-midnight-800 to-midnight-900 flex items-center justify-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-white dark:bg-midnight-900 text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200/90 dark:border-midnight-800 shadow-2xl p-6 sm:p-9 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-lg border border-slate-200 dark:border-midnight-700 mb-3 flex items-center justify-center">
            <img src="/cdgi-logo.png" alt="Chameli Devi Group of Institutions" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Complete Your Profile
          </h1>
          <p className="text-xs font-bold text-electric-600 dark:text-electric-400 uppercase tracking-widest mt-0.5">
            Faculty Onboarding • {DEPARTMENT_INFO.department}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Welcome, {user?.full_name || user?.email}. Your account was created by the HOD. Please provide your
            professional details and submit for verification.
          </p>
        </div>

        {/* Status Banner */}
        {statusBanner()}

        {loading ? (
          <LoadingSpinner message="Submitting your profile..." />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Assigned (read-only) details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Assigned by HOD (Read-only)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {readOnlyField('College ID / Employee ID', user?.employee_id)}
                {readOnlyField('Official Email', user?.email)}
                {readOnlyField('Department', user?.department)}
                {readOnlyField('Authorized Designation', user?.designation)}
              </div>
            </div>

            {/* Editable onboarding details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Your Details (Editable)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="+91 98260 00000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Joining *
                  </label>
                  <input
                    type="date"
                    value={form.dateOfJoining}
                    onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qualifications *
                  </label>
                  <input
                    type="text"
                    value={form.qualifications}
                    onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                    placeholder="e.g. M.Tech in Computer Science"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    placeholder="e.g. Distributed Systems"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => navigate('/faculty/dashboard')} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Submit for Verification
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
