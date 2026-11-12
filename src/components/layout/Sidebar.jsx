// src/components/layout/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  CheckSquare,
  Award,
  Building2,
  BarChart3,
  LogOut,
  X,
  BookOpen,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOdrms } from '../../context/OdrmsContext';
import { DEPARTMENT_INFO } from '../../utils/constants';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isHod, logout } = useAuth();
  const { counts } = useOdrms();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Role-based Nav Items
  const navItems = isHod
    ? [
        {
          to: '/hod/dashboard',
          label: 'HOD Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          to: '/classes',
          label: 'Class Management',
          icon: GraduationCap,
          badge: null,
        },
        {
          to: '/faculty',
          label: 'Faculty Management',
          icon: Users,
          badge: counts.facultyCount ? `${counts.facultyCount} Active` : null,
          badgeColor: 'bg-electric-50 text-electric-700 dark:bg-electric-950 dark:text-electric-300',
        },
        {
          to: '/lectures',
          label: 'Lecture Management',
          icon: CalendarDays,
          badge: null,
        },
        {
          to: '/timetable',
          label: 'Timetable & Assignments',
          icon: CalendarDays,
          badge: null,
        },
        {
          to: '/attendance',
          label: 'Per-Lecture Attendance',
          icon: ClipboardCheck,
          badge: 'Sec A & B',
          badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        },
        {
          to: '/tasks',
          label: 'Task Management',
          icon: CheckSquare,
          badge: counts.pendingTasksCount > 0 ? `${counts.pendingTasksCount}` : null,
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        },
        {
          to: '/achievements',
          label: 'Faculty Achievements',
          icon: Award,
          badge: counts.pendingAchievementsCount > 0 ? `${counts.pendingAchievementsCount} Review` : null,
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
        },
        {
          to: '/resources',
          label: 'Resource Management',
          icon: Building2,
          badge: counts.pendingBookingsCount > 0 ? `${counts.pendingBookingsCount} Req` : null,
          badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
        },
        {
          to: '/reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
          badge: null,
        },
      ]
    : [
        {
          to: '/faculty/dashboard',
          label: 'Faculty Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          to: '/classes',
          label: 'My Classes',
          icon: GraduationCap,
          badge: null,
        },
        {
          to: '/timetable',
          label: 'My Lectures & Timetable',
          icon: CalendarDays,
          badge: null,
        },
        {
          to: '/attendance',
          label: 'Mark Attendance',
          icon: ClipboardCheck,
          badge: 'Sec A & B',
          badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        },
        {
          to: '/tasks',
          label: 'Assigned Tasks',
          icon: CheckSquare,
          badge: counts.pendingTasksCount > 0 ? `${counts.pendingTasksCount}` : null,
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        },
        {
          to: '/achievements',
          label: 'My Achievements',
          icon: Award,
          badge: null,
        },
        {
          to: '/resources',
          label: 'Resource Booking',
          icon: Building2,
          badge: null,
        },
        {
          to: '/reports',
          label: 'Department Reports',
          icon: BarChart3,
          badge: null,
        },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-midnight-950/60 backdrop-blur-xs lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 sm:w-72 bg-midnight-900 border-r border-midnight-700/60 transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & System Header */}
        <div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-midnight-700/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                <img
                  src="/cdgi-logo.png"
                  alt="CDGI Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black tracking-tight text-white truncate font-['Plus_Jakarta_Sans',sans-serif]">
                  ODRMS • CSIT
                </h1>
                <p className="text-[11px] font-bold text-electric-400 truncate">
                  3rd Year / 5th Sem
                </p>
                <p className="text-[10px] text-midnight-300 font-medium truncate">
                  Sections A & B
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-midnight-300 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-midnight-300/80">
              {isHod ? 'Department Administration' : 'Faculty Teaching & Duties'}
            </div>

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
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-electric-600 text-white shadow-sm shadow-electric-600/40'
                        : 'text-midnight-200 hover:bg-midnight-800 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-slate-100 text-slate-700 dark:bg-midnight-800 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Card & Logout */}
        <div className="p-4 border-t border-midnight-700/60">
          <div className="rounded-2xl bg-midnight-800/70 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-electric-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {String(user?.full_name || 'U')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((word) => word[0].toUpperCase())
                  .join('') || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-midnight-300 truncate">
                  {user?.designation || user?.role} • {DEPARTMENT_INFO.department}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-midnight-300 hover:text-rose-400 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
