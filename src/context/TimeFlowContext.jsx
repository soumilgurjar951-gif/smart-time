// src/context/TimeFlowContext.jsx
import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  INITIAL_FACULTY,
  INITIAL_SUBJECTS,
  INITIAL_CLASSES,
  INITIAL_TIMETABLE,
  INITIAL_ABSENCES,
  INITIAL_SUBSTITUTIONS,
  TIME_PERIODS,
  DAYS_OF_WEEK,
  CURRENT_USER,
} from '../data/dummyData';

const TimeFlowContext = createContext(null);

export function TimeFlowProvider({ children }) {
  // Core Entities State
  const [facultyList, setFacultyList] = useState(INITIAL_FACULTY);
  const [subjectList, setSubjectList] = useState(INITIAL_SUBJECTS);
  const [classList, setClassList] = useState(INITIAL_CLASSES);
  const [timetableEntries, setTimetableEntries] = useState(INITIAL_TIMETABLE);
  const [absences, setAbsences] = useState(INITIAL_ABSENCES);
  const [substitutions, setSubstitutions] = useState(INITIAL_SUBSTITUTIONS);
  
  // Auth state
  const [user, setUser] = useState(CURRENT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Global Notification / Toast message
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Login / Logout
  const login = (role, email) => {
    setUser({
      ...CURRENT_USER,
      email: email || CURRENT_USER.email,
      role: role || 'Admin',
    });
    setIsAuthenticated(true);
    showToast(`Welcome back! Logged in as ${role || 'Admin'}`);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  // Faculty Handlers
  const addFaculty = (newFaculty) => {
    const faculty = {
      ...newFaculty,
      id: `fac-${Date.now()}`,
      currentWeeklyLectures: Number(newFaculty.currentWeeklyLectures) || 0,
      maxWeeklyLectures: Number(newFaculty.maxWeeklyLectures) || 16,
      avatarColor: 'bg-indigo-600',
      status: 'Available',
      isAbsentToday: false,
    };
    setFacultyList((prev) => [faculty, ...prev]);
    showToast(`Faculty member "${faculty.name}" added successfully.`);
  };

  const updateFaculty = (id, updatedData) => {
    setFacultyList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updatedData } : f))
    );
    showToast('Faculty details updated successfully.');
  };

  const deleteFaculty = (id) => {
    const target = facultyList.find((f) => f.id === id);
    setFacultyList((prev) => prev.filter((f) => f.id !== id));
    // Also remove from timetable if needed
    setTimetableEntries((prev) => prev.filter((t) => t.facultyId !== id));
    showToast(`Faculty "${target?.name || 'Member'}" removed.`);
  };

  // Subject Handlers
  const addSubject = (newSubject) => {
    const subject = {
      ...newSubject,
      id: `sub-${Date.now()}`,
      semester: Number(newSubject.semester) || 1,
      weeklyLectures: Number(newSubject.weeklyLectures) || 4,
      isLab: Boolean(newSubject.isLab),
      color: newSubject.isLab
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-indigo-50 border-indigo-200 text-indigo-700',
    };
    setSubjectList((prev) => [subject, ...prev]);
    showToast(`Subject "${subject.name}" added successfully.`);
  };

  const updateSubject = (id, updatedData) => {
    setSubjectList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updatedData } : s))
    );
    showToast('Subject updated successfully.');
  };

  const deleteSubject = (id) => {
    const target = subjectList.find((s) => s.id === id);
    setSubjectList((prev) => prev.filter((s) => s.id !== id));
    setTimetableEntries((prev) => prev.filter((t) => t.subjectId !== id));
    showToast(`Subject "${target?.name || 'Subject'}" removed.`);
  };

  // Class Handlers
  const addClass = (newClass) => {
    const cls = {
      ...newClass,
      id: `cls-${Date.now()}`,
      semester: Number(newClass.semester) || 1,
      totalStudents: Number(newClass.totalStudents) || 60,
      academicYear: '2026-2027',
    };
    setClassList((prev) => [cls, ...prev]);
    showToast(`Class "${cls.name}" added successfully.`);
  };

  const updateClass = (id, updatedData) => {
    setClassList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedData } : c))
    );
    showToast('Class updated successfully.');
  };

  const deleteClass = (id) => {
    const target = classList.find((c) => c.id === id);
    setClassList((prev) => prev.filter((c) => c.id !== id));
    setTimetableEntries((prev) => prev.filter((t) => t.classId !== id));
    showToast(`Class "${target?.name || 'Class'}" removed.`);
  };

  // Timetable Handlers
  const addTimetableEntry = (entry) => {
    const newEntry = {
      ...entry,
      id: `tt-${Date.now()}`,
    };
    setTimetableEntries((prev) => [...prev, newEntry]);

    // Increment faculty workload
    setFacultyList((prev) =>
      prev.map((f) =>
        f.id === entry.facultyId
          ? { ...f, currentWeeklyLectures: f.currentWeeklyLectures + 1 }
          : f
      )
    );

    showToast('Timetable slot allocated successfully!');
  };

  const deleteTimetableEntry = (id) => {
    const entry = timetableEntries.find((t) => t.id === id);
    if (entry) {
      setFacultyList((prev) =>
        prev.map((f) =>
          f.id === entry.facultyId
            ? { ...f, currentWeeklyLectures: Math.max(0, f.currentWeeklyLectures - 1) }
            : f
        )
      );
    }
    setTimetableEntries((prev) => prev.filter((t) => t.id !== id));
    showToast('Timetable entry removed.');
  };

  // Conflict checkers
  const checkFacultyConflict = (facultyId, day, period, excludeId = null) => {
    if (!facultyId || !day || !period) return null;
    return timetableEntries.find(
      (entry) =>
        entry.facultyId === facultyId &&
        entry.day === day &&
        Number(entry.period) === Number(period) &&
        entry.id !== excludeId
    );
  };

  const checkRoomConflict = (room, day, period, excludeId = null) => {
    if (!room || !day || !period) return null;
    return timetableEntries.find(
      (entry) =>
        entry.room?.trim().toLowerCase() === room?.trim().toLowerCase() &&
        entry.day === day &&
        Number(entry.period) === Number(period) &&
        entry.id !== excludeId
    );
  };

  // Substitution Finder Algorithm
  const getAvailableSubstitutes = (lecture, day = 'Monday') => {
    if (!lecture) return [];

    const absentFacultyId = lecture.facultyId;
    const period = Number(lecture.period);

    // 1. Find all faculty assigned at the same day & period
    const busyFacultyIds = new Set(
      timetableEntries
        .filter((entry) => entry.day === day && Number(entry.period) === period)
        .map((entry) => entry.facultyId)
    );

    // Also absent faculties today cannot be substitutes
    absences.forEach((abs) => {
      if (abs.day === day) {
        busyFacultyIds.add(abs.facultyId);
      }
    });

    if (absentFacultyId) {
      busyFacultyIds.add(absentFacultyId);
    }

    // 2. Filter available faculty
    const available = facultyList.filter(
      (f) => !busyFacultyIds.has(f.id) && f.status !== 'Absent'
    );

    // 3. Score and prioritize:
    // - Teaches the same subject (+100)
    // - Lower current weekly workload (higher remaining capacity)
    // - Same department (+25)
    const scored = available.map((f) => {
      const canTeach = f.teachableSubjects.some(
        (subjName) =>
          subjName.toLowerCase() === lecture.subjectName?.toLowerCase()
      );
      const remainingCapacity = f.maxWeeklyLectures - f.currentWeeklyLectures;
      const sameDept = f.deptCode === lecture.deptCode;

      let score = 0;
      if (canTeach) score += 100;
      if (sameDept) score += 25;
      score += remainingCapacity * 2; // more capacity = higher score

      return {
        ...f,
        canTeachSubject: canTeach,
        remainingCapacity,
        matchScore: score,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored;
  };

  // Assign a substitute
  const assignSubstitution = ({
    absenceId,
    lectureTimetableId,
    substituteFaculty,
    lectureInfo,
  }) => {
    // 1. Update absence affected lecture status
    setAbsences((prev) =>
      prev.map((abs) => {
        if (abs.id === absenceId) {
          return {
            ...abs,
            affectedLectures: abs.affectedLectures.map((lec) => {
              if (lec.timetableId === lectureTimetableId) {
                return {
                  ...lec,
                  status: 'Substituted',
                  substitutedBy: substituteFaculty.name,
                  substituteFacultyId: substituteFaculty.id,
                };
              }
              return lec;
            }),
          };
        }
        return abs;
      })
    );

    // 2. Increment substitute faculty workload
    setFacultyList((prev) =>
      prev.map((f) =>
        f.id === substituteFaculty.id
          ? { ...f, currentWeeklyLectures: f.currentWeeklyLectures + 1 }
          : f
      )
    );

    // 3. Add to substitutions record
    const newSubstRecord = {
      id: `subst-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      day: lectureInfo.day || 'Monday',
      originalFaculty: lectureInfo.originalFacultyName || lectureInfo.facultyName,
      substituteFaculty: substituteFaculty.name,
      className: lectureInfo.className,
      subjectName: lectureInfo.subjectName,
      period: lectureInfo.period,
      time: lectureInfo.time,
      room: lectureInfo.room,
      status: 'Active Assignment',
      matchScore: substituteFaculty.canTeachSubject
        ? 'Best Match (Subject Specialist)'
        : 'Available Match',
    };

    setSubstitutions((prev) => [newSubstRecord, ...prev]);

    showToast(
      `Successfully assigned ${substituteFaculty.name} for ${lectureInfo.subjectName} (${lectureInfo.className})!`
    );
  };

  // Quick stats
  const stats = useMemo(() => {
    const totalFaculty = facultyList.length;
    const totalClasses = classList.length;
    const totalSubjects = subjectList.length;
    const todayAbsences = absences.length;
    const activeSubstitutionsCount = substitutions.length;

    return {
      totalFaculty,
      totalClasses,
      totalSubjects,
      todayAbsences,
      activeSubstitutionsCount,
    };
  }, [facultyList, classList, subjectList, absences, substitutions]);

  const value = {
    facultyList,
    subjectList,
    classList,
    timetableEntries,
    absences,
    substitutions,
    timePeriods: TIME_PERIODS,
    daysOfWeek: DAYS_OF_WEEK,
    user,
    isAuthenticated,
    toast,
    stats,
    login,
    logout,
    showToast,
    addFaculty,
    updateFaculty,
    deleteFaculty,
    addSubject,
    updateSubject,
    deleteSubject,
    addClass,
    updateClass,
    deleteClass,
    addTimetableEntry,
    deleteTimetableEntry,
    checkFacultyConflict,
    checkRoomConflict,
    getAvailableSubstitutes,
    assignSubstitution,
  };

  return (
    <TimeFlowContext.Provider value={value}>
      {children}
    </TimeFlowContext.Provider>
  );
}

export function useTimeFlow() {
  const context = useContext(TimeFlowContext);
  if (!context) {
    throw new Error('useTimeFlow must be used within a TimeFlowProvider');
  }
  return context;
}
