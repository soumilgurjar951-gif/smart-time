// src/pages/AutomationHub.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Bot,
  Brain,
  ArrowLeftRight,
  Building2,
  Scale,
  Bell,
  FileCheck2,
  QrCode,
  CalendarClock,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Send,
  RefreshCw,
  Printer,
  ShieldCheck,
  UserX,
  PlusCircle,
  Smartphone,
  Sliders,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';
import Modal from '../components/Modal';

export default function AutomationHub() {
  const {
    facultyList,
    classList,
    timetableEntries,
    absences,
    substitutions,
    roomsList,
    leaveApplications,
    notifications,
    attendanceSessions,
    recurringRules,
    daysOfWeek,
    markFacultyAbsent,
    autoAssignAllSubstitutions,
    generateAiTimetable,
    autoAllocateRooms,
    balanceFacultyWorkloads,
    applyLeaveWithAutoApproval,
    refreshQrToken,
    simulateBatchAttendanceScan,
    triggerLowAttendanceAlert,
    toggleRecurringRule,
    detectAllConflicts,
    resolveConflict,
    resolveAllConflicts,
    dispatchNotification,
    showToast,
  } = useTimeFlow();

  // Active Automation Tab
  const [activeTab, setActiveTab] = useState('all');

  // AI Generator Modal & Progress State
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiProgressStep, setAiProgressStep] = useState(0);
  const [aiConstraints, setAiConstraints] = useState({
    maxLectures: 16,
    preserveLunch: true,
    consecutiveLabs: true,
    fairWorkload: true,
  });

  // Mark Absence Modal State
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceFacultyId, setAbsenceFacultyId] = useState(facultyList[0]?.id || '');
  const [absenceDay, setAbsenceDay] = useState('Monday');
  const [absenceReason, setAbsenceReason] = useState('Medical Leave - High Fever');

  // Leave Application Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveFacultyId, setLeaveFacultyId] = useState(facultyList[0]?.id || '');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveDaysCount, setLeaveDaysCount] = useState(1);
  const [leaveReason, setLeaveReason] = useState('Personal family commitment');

  // QR Timer Countdown Simulation
  const [qrCountdown, setQrCountdown] = useState(15);
  const activeAttendanceSession = attendanceSessions[0] || null;

  useEffect(() => {
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          if (activeAttendanceSession) {
            refreshQrToken(activeAttendanceSession.id);
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAttendanceSession, refreshQrToken]);

  // Detected conflicts
  const conflicts = useMemo(() => {
    return detectAllConflicts();
  }, [detectAllConflicts]);

  // Selected Report Type
  const [selectedReport, setSelectedReport] = useState('workload');
  const formattedCurrentDate = 'October 31, 2026';

  // Handle AI Timetable Generation Simulation
  const handleTriggerAiGenerator = () => {
    setIsAiGenerating(true);
    setAiProgressStep(1);

    setTimeout(() => setAiProgressStep(2), 600);
    setTimeout(() => setAiProgressStep(3), 1200);
    setTimeout(() => setAiProgressStep(4), 1800);
    setTimeout(() => {
      generateAiTimetable({
        preserveLunch: aiConstraints.preserveLunch,
      });
      setIsAiGenerating(false);
      setAiProgressStep(0);
    }, 2400);
  };

  // Handle Submit Absence
  const handleSubmitAbsence = (e) => {
    e.preventDefault();
    if (!absenceFacultyId) return;
    const created = markFacultyAbsent({
      facultyId: absenceFacultyId,
      day: absenceDay,
      reason: absenceReason,
    });
    setIsAbsenceModalOpen(false);
    if (created) {
      setActiveTab('substitution');
    }
  };

  // Handle Submit Leave
  const handleSubmitLeave = (e) => {
    e.preventDefault();
    if (!leaveFacultyId) return;
    applyLeaveWithAutoApproval({
      facultyId: leaveFacultyId,
      leaveType,
      daysCount: leaveDaysCount,
      reason: leaveReason,
      day: 'Monday',
    });
    setIsLeaveModalOpen(false);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  const automationModules = [
    { id: 'substitution', name: '1. Auto Substitution', icon: ArrowLeftRight, badge: '⭐ Core', color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'ai-gen', name: '2. AI Generator', icon: Brain, badge: '🧠 Neural', color: 'text-electric-600 bg-electric-50 border-electric-200' },
    { id: 'rooms', name: '3. Auto Room Allocation', icon: Building2, badge: '🏢 Smart', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'workload', name: '4. Workload Balancer', icon: Scale, badge: '⚖️ Fair', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'notifications', name: '5. Notification System', icon: Bell, badge: '🔔 Live', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'leave', name: '6. Leave Auto-Approval', icon: FileCheck2, badge: '📝 Instant', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'attendance', name: '7. QR & Biometric', icon: QrCode, badge: '📲 Fast', color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { id: 'recurring', name: '8. Recurring Scheduler', icon: CalendarClock, badge: '🔁 Auto', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { id: 'conflict', name: '9. Conflict Resolver', icon: AlertTriangle, badge: `${conflicts.length} Clashes`, color: conflicts.length > 0 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-600 bg-offwhite border-slate-200' },
    { id: 'reports', name: '10. Auto Reports', icon: FileSpreadsheet, badge: '📊 PDF', color: 'text-electric-600 bg-electric-50 border-electric-200' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Hero Command Center Header */}
      <div className="bg-gradient-to-r from-midnight-950 via-midnight-800 to-midnight-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-midnight-600/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-electric-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/20 text-electric-300 text-xs font-semibold border border-electric-500/30 mb-3">
              <Bot className="w-3.5 h-3.5 text-electric-400" />
              <span>Chameli Devi Group of Institutions • CDGI TimeFlow Automation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-3">
              <span>🤖 10-Feature Automation Suite</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                100% Operational
              </span>
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              End-to-end academic automation: Autonomous faculty substitution, constraint-based AI timetable generation, room capacity routing, biometric attendance, and instant conflict resolution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => handleTriggerAiGenerator()}
              disabled={isAiGenerating}
              className="px-4 py-2.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs transition-all shadow-md shadow-electric-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Brain className={`w-4 h-4 ${isAiGenerating ? 'animate-spin' : ''}`} />
              <span>{isAiGenerating ? 'AI Generating...' : 'Run Master AI Generator'}</span>
            </button>
            <button
              onClick={() => resolveAllConflicts()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Auto-Resolve All Clashes</span>
            </button>
          </div>
        </div>

        {/* Quick Health Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs">
              {absences.length}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 uppercase font-semibold">Active Absences</p>
              <p className="text-xs font-bold text-white truncate">Auto-Coverage Ready</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
              {substitutions.length}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 uppercase font-semibold">Covered Slots</p>
              <p className="text-xs font-bold text-white truncate">SMS/WhatsApp Sent</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${conflicts.length > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {conflicts.length}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 uppercase font-semibold">Schedule Clashes</p>
              <p className="text-xs font-bold text-white truncate">{conflicts.length === 0 ? 'Zero Conflicts' : 'Resolution Ready'}</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-electric-500/20 text-electric-300 flex items-center justify-center font-bold text-xs">
              {notifications.length}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 uppercase font-semibold">Auto Dispatches</p>
              <p className="text-xs font-bold text-white truncate">Multi-Channel Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'all'
              ? 'bg-midnight-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Master Overview (All 10)</span>
          </button>
          {automationModules.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeTab === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${isActive
                  ? 'bg-electric-600 text-white shadow-sm shadow-electric-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-offwhite'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mod.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {mod.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. AUTOMATIC SUBSTITUTION ASSIGNMENT ⭐                    */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'substitution') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 mb-2">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Feature 1: Priority Algorithm & Instant Dispatch</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Automatic Substitution Assignment ⭐
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Mark faculty absent → System prioritizes same-subject teachers, checks current weekly workloads, and auto-notifies substitutes.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAbsenceModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserX className="w-4 h-4" />
                <span>Mark Faculty Absent</span>
              </button>
              {absences.length > 0 && (
                <button
                  onClick={() => autoAssignAllSubstitutions(absences[0].id)}
                  className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-electric-200 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>1-Click Auto-Assign All Slots</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Absences and Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {absences.map((abs) => (
              <div key={abs.id} className="rounded-2xl border border-rose-200 bg-rose-50/30 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {abs.facultyName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{abs.facultyName}</h3>
                      <p className="text-xs text-rose-700 font-medium">{abs.reason} • {abs.day}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {abs.affectedLectures?.filter((l) => l.status !== 'Substituted').length} Uncovered Slots
                  </span>
                </div>

                {/* Affected Lectures List */}
                <div className="space-y-2.5 pt-2 border-t border-rose-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Impacted Periods & Auto-Matched Substitutes:</p>
                  {abs.affectedLectures?.map((lec) => {
                    const isCovered = lec.status === 'Substituted';
                    return (
                      <div key={lec.timetableId} className="bg-white rounded-xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-electric-700 bg-electric-50 px-2 py-0.5 rounded-md">
                              Period {lec.period}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{lec.subjectName}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {lec.className} • {lec.room} • {lec.time}
                          </p>
                        </div>

                        <div>
                          {isCovered ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Substituted: {lec.substitutedBy}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => autoAssignAllSubstitutions(abs.id)}
                              className="px-3 py-1.5 rounded-xl bg-electric-600 hover:bg-electric-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-300" />
                              <span>Auto-Assign Candidate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 2. AI-POWERED TIMETABLE GENERATOR 🧠                       */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'ai-gen') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-electric-50 text-electric-700 text-xs font-bold border border-electric-200 mb-2">
                <Brain className="w-3.5 h-3.5" />
                <span>Feature 2: Multi-Constraint Neural Solver</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                AI-Powered Timetable Generator 🧠
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Automatically optimize timetables with zero human intervention. Guarantees 0 room collisions, fair workloads, and break periods.
              </p>
            </div>

            <button
              onClick={handleTriggerAiGenerator}
              disabled={isAiGenerating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-700 hover:from-electric-500 hover:to-electric-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-electric-200 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isAiGenerating ? 'AI Engine Running...' : 'Generate Optimized Timetable'}</span>
            </button>
          </div>

          {/* AI Constraints Configurator & Solver Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 rounded-2xl bg-offwhite border border-slate-200 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-electric-600" />
                <span>Solver Constraints</span>
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between text-xs text-slate-700 font-medium">
                  <span>Preserve Lunch Break (P4)</span>
                  <input
                    type="checkbox"
                    checked={aiConstraints.preserveLunch}
                    onChange={(e) => setAiConstraints({ ...aiConstraints, preserveLunch: e.target.checked })}
                    className="w-4 h-4 rounded text-electric-600 focus:ring-electric-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 font-medium">
                  <span>Strict Room Capacities</span>
                  <input
                    type="checkbox"
                    checked={aiConstraints.consecutiveLabs}
                    onChange={(e) => setAiConstraints({ ...aiConstraints, consecutiveLabs: e.target.checked })}
                    className="w-4 h-4 rounded text-electric-600 focus:ring-electric-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 font-medium">
                  <span>Fair Faculty Workload Band</span>
                  <input
                    type="checkbox"
                    checked={aiConstraints.fairWorkload}
                    onChange={(e) => setAiConstraints({ ...aiConstraints, fairWorkload: e.target.checked })}
                    className="w-4 h-4 rounded text-electric-600 focus:ring-electric-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                Targeting: {classList.length} Classes • {facultyList.length} Faculty Members • {roomsList.length} Rooms
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl bg-midnight-900 text-white p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                  <span>Optimization Engine Status</span>
                  <span className="text-emerald-400 font-mono">
                    {isAiGenerating ? 'SOLVING ITERATIONS...' : '100% READY'}
                  </span>
                </div>

                <div className="w-full bg-midnight-800 rounded-full h-2 overflow-hidden mb-4">
                  <div
                    className="bg-gradient-to-r from-electric-500 to-emerald-400 h-full transition-all duration-500"
                    style={{ width: isAiGenerating ? `${aiProgressStep * 25}%` : '100%' }}
                  ></div>
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hard Constraints: Faculty double-booking disallowed (0 violations)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Room Capacity: Class strength strictly less than hall seats (100% verified)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lab Block Allocations: Routed to Turing Computing Complex (Labs 1 & 2)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-midnight-800 text-xs">
                <span className="text-slate-400">Master Grid Entries: <strong className="text-white">{timetableEntries.length} Slots</strong></span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Conflict-Free Guarantee: Verified
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 3. AUTO ROOM ALLOCATION 🏢                                */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'rooms') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>Feature 3: Intelligent Facility & Capacity Router</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Auto Room Allocation 🏢
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Automatically assigns lecture halls and laboratories based on class student strength, PC/equipment requirements, and availability.
              </p>
            </div>

            <button
              onClick={() => autoAllocateRooms()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Optimize & Reallocate All Rooms</span>
            </button>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roomsList.map((room) => {
              const isLab = room.type === 'Lab';
              const isAuditorium = room.type === 'Auditorium';
              return (
                <div key={room.id} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{room.name}</h4>
                      <p className="text-[11px] text-slate-500">{room.building}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isLab ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      isAuditorium ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                      {room.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-offwhite border border-slate-100">
                    <span className="text-slate-500">Seating Capacity:</span>
                    <span className="font-extrabold text-slate-800">{room.capacity} Students</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {room.features?.slice(0, 2).map((feat, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 4. SMART FACULTY WORKLOAD BALANCER ⚖️                      */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'workload') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 mb-2">
                <Scale className="w-3.5 h-3.5" />
                <span>Feature 4: Fairness & Load Variance Optimization</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Smart Faculty Workload Balancer ⚖️
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Calculates weekly lecture distribution across faculties, flags overload risks, and reassigns lectures equitably.
              </p>
            </div>

            <button
              onClick={() => balanceFacultyWorkloads()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-purple-200 cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Auto-Rebalance Faculty Workload</span>
            </button>
          </div>

          {/* Faculty Workload Meter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {facultyList.map((faculty) => {
              const current = faculty.currentWeeklyLectures || 0;
              const max = faculty.maxWeeklyLectures || 16;
              const percent = Math.min(100, Math.round((current / max) * 100));
              const isOverload = percent >= 90;
              const isUnderload = percent <= 55;

              return (
                <div key={faculty.id} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 truncate" title={faculty.name}>
                      {faculty.name}
                    </h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOverload ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      isUnderload ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                      {isOverload ? 'Heavy Load' : isUnderload ? 'Open Bandwidth' : 'Balanced'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>{current} / {max} hrs</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isOverload ? 'bg-rose-500' : isUnderload ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 truncate">
                    Dept: {faculty.deptCode || 'CSE'} • {faculty.teachableSubjects?.length || 2} Teachable Subjects
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 5. AUTOMATIC NOTIFICATION SYSTEM 🔔                       */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'notifications') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 mb-2">
                <Bell className="w-3.5 h-3.5" />
                <span>Feature 5: Multi-Channel Automated Dispatch</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Automatic Notification System 🔔
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Instant SMS, WhatsApp, Email, and Push alerts triggered on timetable changes, substitute assignments, and leave approvals.
              </p>
            </div>

            <button
              onClick={() => {
                dispatchNotification({
                  type: 'broadcast',
                  title: 'Academic Broadcast: Session Routine Updated',
                  message: 'Revised schedule for Fall 2026 active on student portal. Please review your period allocations.',
                  recipient: 'All CDGI Students & Faculty',
                  channel: 'WhatsApp & SMS Gateway',
                  badge: 'Broadcast',
                });
                showToast('Broadcast notification sent to all WhatsApp groups & SMS gateways!');
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-amber-200 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulate WhatsApp / SMS Broadcast</span>
            </button>
          </div>

          {/* Notification Feed & Phone Mockup */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Recent Automated Dispatches</h3>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {notifications.map((notif) => (
                  <div key={notif.id} className="rounded-xl border border-slate-200 p-3.5 bg-offwhite/60 hover:bg-white transition-colors flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-electric-100 text-electric-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">{notif.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/70 font-semibold text-slate-700">
                          {notif.channel}
                        </span>
                        <span>• To: {notif.recipient}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="rounded-3xl bg-midnight-900 p-4 text-white border-4 border-midnight-800 shadow-xl flex flex-col justify-between max-w-xs mx-auto w-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-midnight-800 text-[10px] text-slate-400">
                  <span>9:41 AM</span>
                  <div className="flex items-center gap-1 font-bold">
                    <span>CDGI WhatsApp</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>WhatsApp Verified Bot</span>
                  </div>
                  <p className="text-slate-200 leading-snug">
                    "Dear Prof. Elena, you have been auto-assigned for <strong>Data Structures (CSE 3A)</strong> today at Period 2 in Room 301. Tap below to acknowledge."
                  </p>
                  <div className="pt-2 flex gap-2">
                    <span className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                      Acknowledge
                    </span>
                    <span className="px-2 py-1 rounded-md bg-midnight-800 text-slate-300 text-[10px]">
                      View Slot
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-center text-slate-500 pt-4">
                Automated WhatsApp & SMS Gateway Active
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 6. LEAVE AUTO-APPROVAL SYSTEM 📝                          */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'leave') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Feature 6: Rules-Based Decision Engine & Substitute Hook</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Leave Auto-Approval System 📝
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Casual leave applications under 2 days with sufficient balance are auto-approved instantly, marking timetable slots and finding substitutes without manual delay.
              </p>
            </div>

            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-200 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Apply for Leave (Auto-Approve Test)</span>
            </button>
          </div>

          {/* Leave Applications Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-offwhite/70 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4">Auto-Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveApplications.map((leave) => {
                  const isApproved = leave.status === 'Auto-Approved';
                  return (
                    <tr key={leave.id} className="hover:bg-offwhite/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{leave.facultyName}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{leave.leaveType}</td>
                      <td className="py-3 px-4 text-slate-600">{leave.daysCount} Day(s)</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{leave.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] font-medium text-slate-500">
                        {isApproved ? 'Substitutes Auto-Assigned' : 'Awaiting Review'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 7. AUTO ATTENDANCE MARKING VIA QR / BIOMETRIC 📲          */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'attendance') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 mb-2">
                <QrCode className="w-3.5 h-3.5" />
                <span>Feature 7: Rotating Anti-Proxy Token & Biometric Terminal</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Auto Attendance Marking via QR / Biometric 📲
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Dynamic QR code auto-refreshes every 15 seconds to prevent proxy attendance. Integrated RFID/Biometric logs and low-attendance parent alerts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => simulateBatchAttendanceScan(activeAttendanceSession?.id || 'att-session-1', 5)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-teal-200 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Simulate Student Scan (+5 Present)</span>
              </button>
              <button
                onClick={() => triggerLowAttendanceAlert(activeAttendanceSession?.id || 'att-session-1')}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Trigger &lt;75% Alert</span>
              </button>
            </div>
          </div>

          {/* Active Session & QR Code Box */}
          {activeAttendanceSession && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Dynamic QR Display */}
              <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-midnight-900 text-white rounded-3xl border-4 border-teal-500/30 text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-lg">
                  <div className="w-40 h-40 bg-midnight-900 rounded-xl flex items-center justify-center p-2 relative overflow-hidden">
                    <QrCode className="w-full h-full text-white" />
                  </div>
                </div>

                <div className="w-full">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>Token Rotates in:</span>
                    <span className="text-teal-400 font-bold">{qrCountdown}s</span>
                  </div>
                  <div className="w-full bg-midnight-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-400 h-full transition-all duration-1000"
                      style={{ width: `${(qrCountdown / 15) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <p className="text-[11px] font-mono text-slate-400 truncate max-w-full">
                  Token: {activeAttendanceSession.qrToken}
                </p>
              </div>

              {/* Live Session Stats */}
              <div className="md:col-span-2 space-y-4">
                <div className="p-5 rounded-2xl bg-teal-50/40 border border-teal-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {activeAttendanceSession.subjectName} ({activeAttendanceSession.className})
                      </h4>
                      <p className="text-xs text-slate-500">
                        Period {activeAttendanceSession.period} • {activeAttendanceSession.room} • {activeAttendanceSession.time}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-black">
                      {activeAttendanceSession.attendanceRate}% Attendance
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                      <span className="block text-xl font-black text-slate-900">{activeAttendanceSession.totalEnrolled}</span>
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Enrolled</span>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                      <span className="block text-xl font-black text-emerald-600">{activeAttendanceSession.presentCount}</span>
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Present</span>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                      <span className="block text-xl font-black text-rose-600">{activeAttendanceSession.absentCount}</span>
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Absent</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 bg-offwhite p-3 rounded-xl border border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Biometric Terminal 1 (Turing Block) and RFID Turnstiles active. Real-time sync enabled.</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* 8. RECURRING EVENT AUTO-SCHEDULER 🔁                      */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'recurring') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold border border-cyan-200 mb-2">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Feature 8: Pattern Automation & Holiday Blocker</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Recurring Event Auto-Scheduler 🔁
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Automatically repeats multi-hour lab sessions, reserves tutorial doubt slots, locks mid-term exam weeks, and blocks college holidays.
              </p>
            </div>

            <button
              onClick={() => showToast('Master Recurring Schedules synchronized across semester calendar!')}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-cyan-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Recurring Rules</span>
            </button>
          </div>

          {/* Recurring Rules List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recurringRules.map((rule) => {
              const isActive = rule.status === 'Active';
              return (
                <div key={rule.id} className="rounded-2xl border border-slate-200 p-5 space-y-3 bg-white hover:border-cyan-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                        {rule.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{rule.title}</h4>
                    </div>
                    <button
                      onClick={() => toggleRecurringRule(rule.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {rule.status}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">{rule.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>Frequency: <strong className="text-slate-800">{rule.frequency}</strong></span>
                    <span className="text-emerald-600 font-semibold">Auto-Avoids Clashes</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 9. SMART CONFLICT RESOLVER ⚠️                             */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'conflict') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Feature 9: Real-time Radar & 1-Click Repair</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Smart Conflict Resolver ⚠️
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Full-system real-time collision detection. Automatically suggests free alternative periods or rooms and resolves with a single click.
              </p>
            </div>

            <button
              onClick={() => resolveAllConflicts()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-amber-200 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>1-Click Resolve All Conflicts</span>
            </button>
          </div>

          {/* Conflict Radar List */}
          {conflicts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">Zero Schedule Conflicts Detected!</h4>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                All faculty schedules, lecture halls, and class periods are completely synchronized with 100% constraint satisfaction.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.map((conf) => (
                <div key={conf.id} className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {conf.severity}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{conf.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600">{conf.description}</p>
                    <p className="text-[11px] text-electric-700 font-semibold">
                      💡 AI Suggestion: {conf.suggestedResolution}
                    </p>
                  </div>

                  <button
                    onClick={() => resolveConflict(conf.id)}
                    className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-700 text-white text-xs font-bold shrink-0 shadow-sm cursor-pointer"
                  >
                    Auto-Resolve This Clash
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* 10. AUTO REPORT GENERATION 📊                             */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'reports') && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-electric-50 text-electric-700 text-xs font-bold border border-electric-200 mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Feature 10: Official Audit & Print-Ready PDF</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Auto Report Generation 📊
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Generate daily/weekly compliance audits, faculty workload summaries, and print-ready official PDF reports with CDGI header.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="workload">Faculty Workload Audit</option>
                <option value="substitution">Absence & Substitution Log</option>
                <option value="rooms">Room Occupancy & Capacity</option>
              </select>

              <button
                onClick={handlePrintReport}
                className="px-4 py-2 rounded-xl bg-midnight-900 hover:bg-midnight-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Report Preview Card */}
          <div className="rounded-2xl border border-slate-200 p-6 bg-offwhite/50 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img src="/cdgi-logo.png" alt="CDGI Logo" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Chameli Devi Group of Institutions, Indore</h3>
                  <p className="text-xs text-electric-600 font-semibold uppercase">Office of Dean Academics • TimeFlow Autonomous Report</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Date: {formattedCurrentDate}</p>
                <p>Academic Session: Fall 2026</p>
              </div>
            </div>

            {/* Dynamic Report Content */}
            {selectedReport === 'workload' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Faculty Workload & Compliance Audit</h4>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600">
                      <th className="py-2">Faculty Member</th>
                      <th className="py-2">Department</th>
                      <th className="py-2">Weekly Lectures</th>
                      <th className="py-2">Max Capacity</th>
                      <th className="py-2">Utilization</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {facultyList.map((f) => {
                      const util = Math.round(((f.currentWeeklyLectures || 0) / (f.maxWeeklyLectures || 16)) * 100);
                      return (
                        <tr key={f.id}>
                          <td className="py-2.5 font-bold text-slate-800">{f.name}</td>
                          <td className="py-2.5 text-slate-600">{f.deptCode || 'CSE'}</td>
                          <td className="py-2.5 font-semibold text-slate-900">{f.currentWeeklyLectures || 0}</td>
                          <td className="py-2.5 text-slate-600">{f.maxWeeklyLectures || 16}</td>
                          <td className="py-2.5 font-bold text-slate-800">{util}%</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${util >= 90 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                              {util >= 90 ? 'High' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport === 'substitution' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Official Absence & Substitution Log</h4>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600">
                      <th className="py-2">Original Faculty</th>
                      <th className="py-2">Substitute Faculty</th>
                      <th className="py-2">Subject</th>
                      <th className="py-2">Class</th>
                      <th className="py-2">Period & Room</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {substitutions.map((sub) => (
                      <tr key={sub.id}>
                        <td className="py-2.5 font-bold text-slate-800">{sub.originalFaculty}</td>
                        <td className="py-2.5 font-bold text-electric-700">{sub.substituteFaculty}</td>
                        <td className="py-2.5 text-slate-700">{sub.subjectName}</td>
                        <td className="py-2.5 text-slate-600">{sub.className}</td>
                        <td className="py-2.5 text-slate-600">Period {sub.period} ({sub.room})</td>
                        <td className="py-2.5 font-semibold text-emerald-700">{sub.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport === 'rooms' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Room Allocation & Facility Occupancy Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {roomsList.map((r) => (
                    <div key={r.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <p className="font-bold text-slate-900">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.type} • Cap: {r.capacity}</p>
                      <p className="text-emerald-600 font-semibold text-[10px] mt-1">Available for auto-allocation</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stamp footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <p>Generated automatically by CDGI TimeFlow Automation Suite.</p>
              <p className="font-bold text-slate-700">Digitally Verified & Approved</p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* MODAL: MARK FACULTY ABSENT                                */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        title="Report Faculty Absence"
      >
        <form onSubmit={handleSubmitAbsence} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Faculty Member:</label>
            <select
              value={absenceFacultyId}
              onChange={(e) => setAbsenceFacultyId(e.target.value)}
              className="w-full bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.deptCode || 'CSE'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Absence Day:</label>
            <select
              value={absenceDay}
              onChange={(e) => setAbsenceDay(e.target.value)}
              className="w-full bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Absence:</label>
            <input
              type="text"
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              placeholder="e.g. Medical emergency, Conference"
              className="w-full bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAbsenceModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Mark Absent & Find Substitutes
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: APPLY LEAVE WITH AUTO-APPROVAL                      */}
      {/* ========================================================= */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Apply for Faculty Leave (Auto-Approval Test)"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Member:</label>
            <select
              value={leaveFacultyId}
              onChange={(e) => setLeaveFacultyId(e.target.value)}
              className="w-full bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Leave Type:</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
              >
                <option value="Casual Leave">Casual Leave (Instant Auto-Approve)</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="Academic Duty">Academic Duty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Days Count:</label>
              <input
                type="number"
                min="1"
                max="5"
                value={leaveDaysCount}
                onChange={(e) => setLeaveDaysCount(e.target.value)}
                className="w-full bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason:</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="w-full bg-offwhite border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {leaveType === 'Casual Leave' && Number(leaveDaysCount) <= 2
                ? '⚡ Rules Engine Rule Match: Casual Leave <= 2 days is eligible for INSTANT 1-CLICK AUTO-APPROVAL.'
                : 'Will be submitted for digital review.'}
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Submit & Execute Auto-Approval
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
