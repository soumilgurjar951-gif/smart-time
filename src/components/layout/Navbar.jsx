// src/components/layout/Navbar.jsx
import React, { useState } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  LogOut,
  User,
  CheckCircle2,
  Clock,
  ChevronDown,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useOdrms } from '../../context/OdrmsContext';
import { DEPARTMENT_INFO } from '../../utils/constants';

export default function Navbar({ onToggleSidebar }) {
  const { user, isHod, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { counts, recentActivities } = useOdrms();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const totalPendingNotifications =
    (counts.pendingTasksCount || 0) +
    (counts.pendingAchievementsCount || 0) +
    (counts.pendingBookingsCount || 0);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-midnight-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-midnight-800 px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile Toggle & Scope Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-midnight-800"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-electric-50 dark:bg-electric-950/60 text-electric-700 dark:text-electric-400 border border-electric-200/80 dark:border-electric-900 text-xs font-bold">
              <GraduationCap className="w-4 h-4" />
              <span>{DEPARTMENT_INFO.department} Department</span>
            </span>

            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-midnight-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-midnight-700">
              <Layers className="w-3.5 h-3.5 text-electric-600" />
              <span>{DEPARTMENT_INFO.year} • {DEPARTMENT_INFO.semester} (Sec A & B)</span>
            </span>
          </div>
        </div>

        {/* Right: Theme Toggle, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-midnight-800 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-midnight-800 transition-colors"
              title="Departmental Notifications"
            >
              <Bell className="w-4 h-4" />
              {totalPendingNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-midnight-800 shadow-xl py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 dark:border-midnight-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Department Activity
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-electric-50 dark:bg-electric-950 text-electric-700 dark:text-electric-400">
                    CSIT 5th Sem
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-midnight-800/60 max-h-80 overflow-y-auto">
                  {recentActivities.map((act) => (
                    <div key={act.id} className="p-3 hover:bg-offwhite dark:hover:bg-midnight-800/50 transition-colors">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{act.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{act.subtitle}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Badge & Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 p-1 sm:pl-2 sm:pr-3 rounded-xl hover:bg-slate-100 dark:hover:bg-midnight-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-electric-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                {user?.avatar || (isHod ? 'RS' : 'AM')}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {user?.full_name || 'Faculty Member'}
                </p>
                <p className="text-[10px] text-electric-600 dark:text-electric-400 font-semibold">
                  {user?.role} • {DEPARTMENT_INFO.department}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-midnight-800 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                <div className="p-2 bg-offwhite dark:bg-midnight-800/60 rounded-xl">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-electric-100 dark:bg-electric-950 text-electric-700 dark:text-electric-300">
                    {user?.designation}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-midnight-800 pt-2 space-y-1 text-xs">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

