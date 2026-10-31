// src/components/common/StatCard.jsx
import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
  color = 'indigo',
  onClick,
}) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-100 dark:border-amber-900',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-100 dark:border-rose-900',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-100 dark:border-purple-900',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-100 dark:border-blue-900',
  };

  const iconClasses = colorMap[color] || colorMap.indigo;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs transition-all ${
        onClick ? 'hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
              {value}
            </span>
            {badge && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${iconClasses}`}>
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        )}
      </div>
    </div>
  );
}

