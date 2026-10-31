// src/components/common/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ message = 'Loading departmental data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
      <div className="w-8 h-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}

