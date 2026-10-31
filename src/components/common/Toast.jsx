// src/components/common/Toast.jsx
import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useOdrms } from '../../context/OdrmsContext';

export default function Toast() {
  const { toast, hideToast } = useOdrms();

  if (!toast) return null;

  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold backdrop-blur-md ${
          isError
            ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
            : isWarning
            ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
        }`}
      >
        {isError ? (
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
        ) : isWarning ? (
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        )}

        <span>{toast.message}</span>

        <button
          onClick={hideToast}
          className="ml-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

