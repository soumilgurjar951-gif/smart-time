// src/components/forms/ResourceForm.jsx
import React, { useState } from 'react';
import Button from '../common/Button';
import { RESOURCE_TYPES } from '../../utils/constants';

export default function ResourceForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'Classroom',
    location: initialData?.location || 'CSIT Wing, 3rd Floor',
    capacity: initialData?.capacity || 60,
    features: Array.isArray(initialData?.features) ? initialData.features.join(', ') : initialData?.features || 'Interactive Projector, AC, High-Speed Wi-Fi',
    status: initialData?.status || 'Available',
    dedicatedFor: initialData?.dedicatedFor || 'CSIT 3rd Year / 5th Sem',
    manager: initialData?.manager || 'CSIT Department Staff',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Resource Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. CSIT Smart Classroom 303"
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Resource Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Location / Block *
          </label>
          <input
            type="text"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. Turing Block, 1st Floor"
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Capacity (Seats/Units) *
          </label>
          <input
            type="number"
            min="1"
            max="500"
            required
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Current Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="Available">Available</option>
            <option value="Booked">Booked</option>
            <option value="Under Maintenance">Under Maintenance</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Dedicated For / Purpose
        </label>
        <input
          type="text"
          value={formData.dedicatedFor}
          onChange={(e) => setFormData({ ...formData, dedicatedFor: e.target.value })}
          placeholder="e.g. Section A (Theory) or DAA Practicals"
          className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Features / Equipment (Comma Separated)
        </label>
        <input
          type="text"
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder="e.g. 45 Workstations, Dual Projectors, Air Conditioned, Gigabit LAN"
          className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Resource' : 'Save Department Resource'}
        </Button>
      </div>
    </form>
  );
}

