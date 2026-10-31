// src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ArrowLeftRight,
  Users,
  BookOpen,
  GraduationCap,
  CalendarClock,
  LogOut,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, stats } = useTimeFlow();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/automation',
      label: 'Automation Suite',
      icon: Sparkles,
      badge: '10 AI Tools',
      badgeColor: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-2xs font-extrabold',
    },
    {
      to: '/timetable-builder',
      label: 'Timetable Builder',
      icon: CalendarDays,
      badge: 'Editor',
    },
    {
      to: '/substitutions',
      label: 'Substitutions',
      icon: ArrowLeftRight,
      badge: stats.todayAbsences > 0 ? `${stats.todayAbsences} Urgent` : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      to: '/faculty',
      label: 'Manage Faculty',
      icon: Users,
      badge: stats.totalFaculty,
    },
    {
      to: '/subjects',
      label: 'Manage Subjects',
      icon: BookOpen,
      badge: stats.totalSubjects,
    },
    {
      to: '/classes',
      label: 'Manage Classes',
      icon: GraduationCap,
      badge: stats.totalClasses,
    },
    {
      to: '/faculty-timetable',
      label: 'Faculty Timetable',
      icon: CalendarClock,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar aside */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Brand */}
        <div>
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0">
                <img
                  src="/cdgi-logo.png"
                  alt="Chameli Devi Group of Institutions"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-[13px] font-bold tracking-tight text-slate-900 leading-tight truncate font-['Plus_Jakarta_Sans',sans-serif]"
                  title="Chameli Devi Group of Institutions"
                >
                  Chameli Devi
                </h1>
                <p className="text-[11px] font-semibold text-indigo-600 tracking-wide uppercase truncate">
                  Group of Institutions
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  Indore • TimeFlow
                </p>
              </div>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1">
            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-2">
              Main Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                            item.badgeColor
                              ? item.badgeColor
                              : isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Bottom: User Profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-xs mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                {user?.avatar || 'AD'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user?.name || 'Administrator'}
                  </p>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.role || 'Admin'} • {user?.academicSession || 'Fall 2026'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
