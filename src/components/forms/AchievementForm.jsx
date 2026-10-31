// src/components/forms/AchievementForm.jsx
import React, { useState } from 'react';
import Button from '../common/Button';
import { ACHIEVEMENT_CATEGORIES } from '../../utils/constants';

export default function AchievementForm({
  user,
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    facultyId: user?.id || 'fac-2',
    facultyName: user?.name || 'Faculty Member',
    designation: user?.designation || 'Assistant Professor',
    category: 'Publications',
    title: '',
    issuingBody: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    certificateFileName: '',
  });

  const [simulatedFileUploaded, setSimulatedFileUploaded] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        certificateFileName: file.name,
      }));
      setSimulatedFileUploaded(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Achievement Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {ACHIEVEMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Date of Achievement / Publication *
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Title / Honor / Paper Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Published Research Paper in IEEE Transactions or NPTEL Elite Gold"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Issuing Body / Publisher / Organization *
        </label>
        <input
          type="text"
          required
          value={formData.issuingBody}
          onChange={(e) => setFormData({ ...formData, issuingBody: e.target.value })}
          placeholder="e.g. IEEE, Springer, AICTE, IIT Madras, Patent Office"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Detailed Summary & Contribution *
        </label>
        <textarea
          rows={3}
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Summary of research impact, indexation (SCI/Scopus), or certificate details..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Certificate Upload Simulation */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Upload Supporting Certificate / Paper Proof (PDF / Image) *
        </label>
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/50 transition-colors">
          <input
            type="file"
            id="cert-upload"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="cert-upload" className="cursor-pointer">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {simulatedFileUploaded
                ? `Attached: ${formData.certificateFileName}`
                : 'Click to select certificate file (PDF/JPEG)'}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Files are digitally timestamped and submitted to HOD review queue.
            </p>
          </label>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Submit for HOD Approval
        </Button>
      </div>
    </form>
  );
}

