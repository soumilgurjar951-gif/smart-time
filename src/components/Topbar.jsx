// src/components/Topbar.jsx
import React from 'react';
import {
  Menu,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';
import { Link } from 'react-router-dom';

export default function Topbar({ onToggleSidebar }) {
  const { user, toast, stats } = useTimeFlow();

  // Current formatted date
  const todayFormatted = 'Monday, Oct 22, 2026';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 transition-all">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger & breadcrumbs/title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <span className="flex items-center gap-2 font-medium text-slate-800 bg-offwhite border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                <img
                  src="/cdgi-logo.png"
                  alt="CDGI Logo"
                  className="w-5 h-5 object-contain rounded-full"
                />
                <span className="font-semibold text-slate-800 hidden md:inline">
                  {user?.college || 'Chameli Devi Group of Institutions, Indore'}
                </span>
                <span className="font-semibold text-slate-800 md:hidden">
                  CDGI Indore
                </span>
              </span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="hidden sm:inline-block bg-electric-50 text-electric-700 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                {user?.academicSession || 'Session 2026-27'}
              </span>
            </div>
          </div>

          {/* Right: Date, Urgent Alert, Profile quick glance */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Day & Date */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-offwhite border border-slate-200/70 text-xs font-medium text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-electric-600" />
              <span>{todayFormatted}</span>
            </div>

            {/* Substitution alert pill if absences exist */}
            {stats.todayAbsences > 0 && (
              <Link
                to="/substitutions"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                title={`${stats.todayAbsences} faculty members reported absent today`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>{stats.todayAbsences} Absences Today</span>
              </Link>
            )}

            {/* Admin Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-electric-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {user?.avatar || 'AD'}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {user?.full_name}
                </p>
                <p className="text-[10px] text-slate-500">{user?.role} Portal</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : toast.type === 'warning' ? (
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <p>{toast.message}</p>
          </div>
        </div>
      )}
    </>
  );
}
