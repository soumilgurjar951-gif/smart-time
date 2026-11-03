// src/components/forms/BookingForm.jsx
import React, { useState } from 'react';
import Button from '../common/Button';
import { TIME_SLOTS, SECTIONS } from '../../utils/constants';

export default function BookingForm({
  resourceList = [],
  user,
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    resourceId: resourceList[0]?.id || '',
    resourceName: resourceList[0]?.name || '',
    requestedById: user?.id || 'fac-2',
    requestedByName: user?.name || 'Faculty Member',
    section: 'Section A',
    date: new Date().toISOString().split('T')[0],
    timeSlot: TIME_SLOTS[0].label,
    purpose: '',
    attendeesCount: 60,
  });

  const handleResourceChange = (id) => {
    const res = resourceList.find((r) => r.id === id);
    if (res) {
      setFormData((prev) => ({
        ...prev,
        resourceId: res.id,
        resourceName: res.name,
      }));
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
            Select Department Resource *
          </label>
          <select
            value={formData.resourceId}
            onChange={(e) => handleResourceChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {resourceList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.type} - Cap: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Section *
          </label>
          <select
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="Section A">Section A Only</option>
            <option value="Section B">Section B Only</option>
            <option value="Section A & B">Section A & B (Combined)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Booking Date *
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Time Slot *
          </label>
          <select
            value={formData.timeSlot}
            onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {TIME_SLOTS.map((s) => (
              <option key={s.id} value={s.label}>
                Period {s.period} ({s.label})
              </option>
            ))}
            <option value="02:00 PM - 04:00 PM (2-Hour Lab Block)">
              02:00 PM - 04:00 PM (2-Hour Lab Block)
            </option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Expected Students
          </label>
          <input
            type="number"
            min="1"
            max="200"
            required
            value={formData.attendeesCount}
            onChange={(e) => setFormData({ ...formData, attendeesCount: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Academic Purpose & Requirements *
        </label>
        <textarea
          rows={3}
          required
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          placeholder="e.g. Extra Practical Lab Session on PL/SQL Triggers or Guest Lecture on DevOps..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Submit Booking Request
        </Button>
      </div>
    </form>
  );
}

