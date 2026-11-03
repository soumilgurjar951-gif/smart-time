// src/components/common/Badge.jsx
import React from 'react';
import { getPriorityBadgeColor, getStatusBadgeColor } from '../../utils/formatters';

export default function Badge({
  children,
  variant = 'default',
  priority,
  status,
  className = '',
}) {
  let colorClasses = 'bg-slate-100 text-slate-700 dark:bg-midnight-800 dark:text-slate-300 border-slate-200 dark:border-midnight-700';

  if (priority) {
    colorClasses = getPriorityBadgeColor(priority);
  } else if (status) {
    colorClasses = getStatusBadgeColor(status);
  } else if (variant === 'indigo') {
    colorClasses = 'bg-electric-50 text-electric-700 dark:bg-electric-950/60 dark:text-electric-400 border-electric-200 dark:border-electric-900';
  } else if (variant === 'emerald') {
    colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
  } else if (variant === 'amber') {
    colorClasses = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900';
  } else if (variant === 'rose') {
    colorClasses = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
}

