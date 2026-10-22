// src/pages/TimetableBuilder.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  MapPin,
  User,
  BookOpen,
  Filter,
  Info,
  Clock,
} from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';
import TimetableGrid from '../components/TimetableGrid';
import Modal from '../components/Modal';

export default function TimetableBuilder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    classList,
    subjectList,
    facultyList,
    timetableEntries,
    timePeriods,
    addTimetableEntry,
    deleteTimetableEntry,
    checkFacultyConflict,
    checkRoomConflict,
    absences,
  } = useTimeFlow();

  // Active Class Selection
  const initialClassId = searchParams.get('classId') || (classList[0]?.id ?? '');
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);

  useEffect(() => {
    const cid = searchParams.get('classId');
    if (cid && cid !== selectedClassId) {
      setSelectedClassId(cid);
    }
  }, [searchParams]);

  const handleClassChange = (newId) => {
    setSelectedClassId(newId);
    setSearchParams({ classId: newId });
  };

  const currentClass = classList.find((c) => c.id === selectedClassId) || classList[0];

  // Filter entries for the selected class
  const classTimetableEntries = useMemo(() => {
    return timetableEntries.filter((t) => t.classId === selectedClassId);
  }, [timetableEntries, selectedClassId]);

  // Modal State for slot assignment
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotDay, setSlotDay] = useState('Monday');
  const [slotPeriod, setSlotPeriod] = useState(1);

  // Form inputs for slot assignment
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [roomInput, setRoomInput] = useState('');

  // Open modal when an empty slot is clicked
  const handleCellClick = (day, period) => {
    setSlotDay(day);
    setSlotPeriod(period);
    // Defaults
    setSelectedSubjectId(subjectList[0]?.id || '');
    setSelectedFacultyId(facultyList[0]?.id || '');
    setRoomInput(currentClass?.room || 'Room 301');
    setIsSlotModalOpen(true);
  };

  // Real-time conflict checking
  const facultyConflict = useMemo(() => {
    if (!selectedFacultyId) return null;
    return checkFacultyConflict(selectedFacultyId, slotDay, slotPeriod);
  }, [selectedFacultyId, slotDay, slotPeriod, checkFacultyConflict]);

  const roomConflict = useMemo(() => {
    if (!roomInput) return null;
    return checkRoomConflict(roomInput, slotDay, slotPeriod);
  }, [roomInput, slotDay, slotPeriod, checkRoomConflict]);

  // Handle Save Slot
  const handleSaveSlot = (e) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId || !selectedFacultyId || !roomInput) {
      return;
    }

    const subject = subjectList.find((s) => s.id === selectedSubjectId);
    const faculty = facultyList.find((f) => f.id === selectedFacultyId);

    addTimetableEntry({
      classId: selectedClassId,
      className: currentClass?.name,
      subjectId: selectedSubjectId,
      subjectName: subject?.name || 'Subject',
      facultyId: selectedFacultyId,
      facultyName: faculty?.name || 'Faculty',
      room: roomInput,
      day: slotDay,
      period: Number(slotPeriod),
    });

    setIsSlotModalOpen(false);
  };

  const periodObj = timePeriods.find((p) => p.period === Number(slotPeriod));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header with Class Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Timetable Builder & Scheduler
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build and optimize weekly class schedules. Click any open period slot to assign subjects and faculty.
          </p>
        </div>

        {/* Class Selection Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
            Selected Class:
          </label>
          <div className="relative min-w-[200px]">
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer pr-10 shadow-xs"
            >
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.department} ({c.room})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Class Meta & Stats Bar */}
      {currentClass && (
        <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 rounded-2xl border border-indigo-100/70 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-indigo-900 text-sm">
              {currentClass.name}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">
              {currentClass.department}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              Cohort: <strong>{currentClass.totalStudents} Students</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              Default Hall: <strong>{currentClass.room}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-bold text-[11px]">
              {classTimetableEntries.length} Slots Assigned
            </span>
            <span className="text-slate-500">
              (out of 36 weekly slots)
            </span>
          </div>
        </div>
      )}

      {/* Weekly Timetable Grid */}
      <TimetableGrid
        timetableEntries={classTimetableEntries}
        onCellClick={handleCellClick}
        onDeleteEntry={deleteTimetableEntry}
        mode="class"
      />

      {/* Legend & Instructions */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">Guide:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-50 border border-indigo-200"></span>
            Scheduled Class Slot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md border border-dashed border-slate-300"></span>
            Unassigned Period (Click to Add)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-50 border border-rose-300"></span>
            Faculty Absent Alert
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Double booking warnings are automatically validated before saving.
        </span>
      </div>

      {/* Assign Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title={`Assign Slot • ${slotDay} Period ${slotPeriod}`}
        subtitle={`${periodObj?.startTime || ''} - ${periodObj?.endTime || ''} for ${currentClass?.name}`}
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          {/* Subject Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
              Select Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="" disabled>
                -- Choose Subject --
              </option>
              {subjectList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) {s.isLab ? '[LAB]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
              Assign Instructor / Faculty <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="" disabled>
                -- Choose Faculty Member --
              </option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.deptCode}) — Load: {f.currentWeeklyLectures}/{f.maxWeeklyLectures} hrs
                  {f.status === 'Absent' ? ' (Reported Absent)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Room input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
              Classroom / Lecture Hall / Lab <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="e.g. Room 301, Lab 2, Hall A"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* REAL-TIME WARNING 1: Red Warning if selected faculty is busy in that day & period */}
          {facultyConflict && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  Faculty Double-Booking Warning:
                </strong>
                <span>
                  {facultyConflict.facultyName} is already assigned to{' '}
                  <strong>{facultyConflict.subjectName}</strong> in{' '}
                  {facultyConflict.className || 'another class'} during{' '}
                  {slotDay} Period {slotPeriod} ({facultyConflict.room})!
                </span>
              </div>
            </div>
          )}

          {/* REAL-TIME WARNING 2: Yellow Warning if the room is already booked in that day & period */}
          {roomConflict && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  Room Double-Booking Warning:
                </strong>
                <span>
                  {roomInput} is already occupied on {slotDay} Period {slotPeriod} by{' '}
                  <strong>{roomConflict.subjectName}</strong> ({roomConflict.facultyName})!
                </span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsSlotModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all ${
                facultyConflict
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              Save Slot Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
