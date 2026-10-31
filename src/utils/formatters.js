// src/utils/formatters.js

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '—';
  try {
    const d = new Date(dateTimeString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTimeString;
  }
}

export function getPriorityBadgeColor(priority) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900';
    case 'medium':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900';
    case 'low':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
    default:
      return 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800';
  }
}

export function getStatusBadgeColor(status) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'approved':
    case 'available':
    case 'active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
    case 'in progress':
    case 'pending':
    case 'under review':
    case 'booked':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900';
    case 'rejected':
    case 'maintenance':
    case 'inactive':
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900';
    default:
      return 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800';
  }
}

