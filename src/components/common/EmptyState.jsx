// src/components/common/EmptyState.jsx
import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items matching your criteria at this moment.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-midnight-800 bg-white/50 dark:bg-midnight-900/40">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-midnight-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <Icon className="w-6 h-6 stroke-[1.8]" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

