// src/components/StatCard.jsx
import React from 'react';

export default function StatCard({
  title,
  value,
  icon: Icon,
  badge,
  badgeType = 'default', // 'danger' | 'success' | 'warning' | 'indigo' | 'default'
  subtext,
  iconBg = 'bg-electric-50 text-electric-600',
  onClick,
}) {
  const badgeStyles = {
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indigo: 'bg-electric-50 text-electric-700 border-electric-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-electric-300' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-3xl font-bold tracking-tight text-slate-800">
          {value}
        </div>
        {badge && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
              badgeStyles[badgeType] || badgeStyles.default
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          {subtext}
        </p>
      )}
    </div>
  );
}
