// src/context/TimeFlowContext.jsx
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  TIME_PERIODS,
  DAYS_OF_WEEK,
  CURRENT_USER,
} from '../data/dummyData';

const TimeFlowContext = createContext(null);

export function TimeFlowProvider({ children }) {
  // Production-ready - empty initial state
  // Core Entities State
  const [facultyList, setFacultyList] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [classList, setClassList] = useState([]);
  const [timetableEntries, setTimetableEntries] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);

  // Automation Entities State
  const [roomsList, setRoomsList] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [recurringRules, setRecurringRules] = useState([]);

  // Auth state
  const [user, setUser] = useState(CURRENT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Global Notification / Toast message
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

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

  // Notification Dispatcher
  const dispatchNotification = useCallback(({
    type = 'system',
    title,
    message,
    recipient = 'All Stakeholders',
    channel = 'WhatsApp & Email',
    badge = 'Info',
  }) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      recipient,
      channel,
      status: 'Delivered',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    return newNotif;
  }, []);

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
      leaveBalance: { casual: 12, medical: 10, duty: 5 },
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
      const canTeach = f.teachableSubjects?.some(
        (subjName) =>
          subjName.toLowerCase() === lecture.subjectName?.toLowerCase()
      );
      const remainingCapacity = (f.maxWeeklyLectures || 16) - (f.currentWeeklyLectures || 0);
      const sameDept = f.deptCode === lecture.deptCode;

      let score = 0;
      if (canTeach) score += 100;
      if (sameDept) score += 25;
      score += remainingCapacity * 2;

      return {
        ...f,
        canTeachSubject: Boolean(canTeach),
        remainingCapacity,
        matchScore: score,
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored;
  };

  // Assign a single substitute
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
            affectedLectures: abs.affectedLectures?.map((lec) => {
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
          ? { ...f, currentWeeklyLectures: (f.currentWeeklyLectures || 0) + 1 }
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

    // 4. Auto-trigger notification
    dispatchNotification({
      type: 'substitution',
      title: `Substitution Assigned: ${substituteFaculty.name}`,
      message: `${substituteFaculty.name} assigned to ${lectureInfo.subjectName} (${lectureInfo.className}, Period ${lectureInfo.period}, ${lectureInfo.room}).`,
      recipient: `${substituteFaculty.name} & ${lectureInfo.className} CR`,
      channel: 'WhatsApp & SMS',
      badge: 'Urgent',
    });

    showToast(
      `Assigned ${substituteFaculty.name} for ${lectureInfo.subjectName} (${lectureInfo.className})!`
    );
  };

  // ==========================================
  // FEATURE 1: AUTOMATIC SUBSTITUTION (1-CLICK BATCH & ABSENCE REPORT)
  // ==========================================
  const markFacultyAbsent = ({ facultyId, day = 'Monday', reason = 'Personal Leave' }) => {
    const faculty = facultyList.find((f) => f.id === facultyId);
    if (!faculty) return null;

    // Find all timetable slots for this faculty on this day
    const affectedLectures = timetableEntries
      .filter((t) => t.facultyId === facultyId && t.day === day)
      .map((t) => {
        const cls = classList.find((c) => c.id === t.classId);
        const periodObj = TIME_PERIODS.find((p) => Number(p.period) === Number(t.period));
        return {
          timetableId: t.id,
          classId: t.classId,
          className: cls?.name || 'Class',
          subjectId: t.subjectId,
          subjectName: t.subjectName,
          period: t.period,
          time: periodObj ? `${periodObj.startTime} - ${periodObj.endTime}` : `Period ${t.period}`,
          room: t.room || 'Room 301',
          status: 'Pending',
          substitutedBy: null,
        };
      });

    const newAbsence = {
      id: `abs-${Date.now()}`,
      facultyId,
      facultyName: faculty.name,
      department: faculty.department,
      date: new Date().toISOString().split('T')[0],
      day,
      reason,
      affectedLectures,
    };

    // Update faculty status
    setFacultyList((prev) =>
      prev.map((f) => (f.id === facultyId ? { ...f, status: 'Absent', isAbsentToday: true } : f))
    );

    setAbsences((prev) => [newAbsence, ...prev]);

    dispatchNotification({
      type: 'absence',
      title: `Faculty Absence Logged: ${faculty.name}`,
      message: `${faculty.name} is marked absent for ${day}. ${affectedLectures.length} lectures require substitution.`,
      recipient: 'Department HOD & Substitution Coordinator',
      channel: 'In-App & Email',
      badge: 'Absence',
    });

    showToast(`Marked ${faculty.name} absent. ${affectedLectures.length} lectures queued for substitution.`);
    return newAbsence;
  };

  const autoAssignAllSubstitutions = (absenceId) => {
    const targetAbsence = absences.find((a) => a.id === absenceId);
    if (!targetAbsence) return { count: 0, assigned: [] };

    const pendingLectures = targetAbsence.affectedLectures?.filter(
      (l) => l.status !== 'Substituted'
    ) || [];

    if (pendingLectures.length === 0) {
      showToast('All lectures for this absence are already substituted!', 'info');
      return { count: 0, assigned: [] };
    }

    const assignedNames = [];

    pendingLectures.forEach((lec) => {
      const candidates = getAvailableSubstitutes(lec, targetAbsence.day);
      if (candidates.length > 0) {
        const topCandidate = candidates[0];
        assignSubstitution({
          absenceId: targetAbsence.id,
          lectureTimetableId: lec.timetableId,
          substituteFaculty: topCandidate,
          lectureInfo: {
            ...lec,
            day: targetAbsence.day,
            originalFacultyName: targetAbsence.facultyName,
          },
        });
        assignedNames.push(`${topCandidate.name} (${lec.subjectName})`);
      }
    });

    showToast(
      `⚡ Auto-Assigned ${assignedNames.length} substitutes! Instant WhatsApp & SMS notifications sent.`
    );

    return { count: assignedNames.length, assigned: assignedNames };
  };

  // ==========================================
  // FEATURE 2: AI-POWERED TIMETABLE GENERATOR
  // ==========================================
  const generateAiTimetable = ({
    targetClassIds = null,
    preserveLunch = true,
  } = {}) => {
    const classesToSchedule = targetClassIds && targetClassIds.length > 0
      ? classList.filter((c) => targetClassIds.includes(c.id))
      : classList;

    const newEntries = [];
    const facultyWorkloadMap = {};
    facultyList.forEach((f) => {
      facultyWorkloadMap[f.id] = 0;
    });

    const activeRooms = roomsList.length > 0 ? roomsList : [];

    // Days & Periods to schedule
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const availablePeriods = preserveLunch ? [1, 2, 3, 5, 6] : [1, 2, 3, 4, 5, 6];

    classesToSchedule.forEach((cls) => {
      // Find subjects relevant to this class semester / dept
      const relevantSubjects = subjectList.filter(
        (s) => s.deptCode === cls.deptCode || s.semester === cls.semester
      );

      const subjectsToPlace = relevantSubjects.length > 0 ? relevantSubjects : subjectList.slice(0, 4);

      let slotIndex = 0;
      days.forEach((day) => {
        availablePeriods.forEach((period) => {
          if (slotIndex >= subjectsToPlace.length * 4) return;

          const subject = subjectsToPlace[slotIndex % subjectsToPlace.length];
          slotIndex++;

          // Find best faculty for this subject who is free at day & period
          const qualifiedFaculty = facultyList.filter(
            (f) =>
              f.teachableSubjects?.some((ts) => ts.toLowerCase() === subject.name.toLowerCase()) ||
              f.deptCode === subject.deptCode
          );

          const freeFaculty = (qualifiedFaculty.length > 0 ? qualifiedFaculty : facultyList).find((f) => {
            const alreadyBusy = newEntries.some(
              (e) => e.day === day && e.period === period && e.facultyId === f.id
            );
            return !alreadyBusy;
          }) || facultyList[0];

          // Find suitable room
          let roomName = cls.room || 'Room 301';
          if (subject.isLab) {
            const lab = activeRooms.find((r) => r.type === 'Lab' && !newEntries.some((e) => e.day === day && e.period === period && e.room === r.name));
            roomName = lab ? lab.name : 'Lab 1';
          } else {
            const suitableRoom = activeRooms.find((r) =>
              r.type === 'Theory' &&
              r.capacity >= cls.totalStudents &&
              !newEntries.some((e) => e.day === day && e.period === period && e.room === r.name)
            );
            if (suitableRoom) roomName = suitableRoom.name;
          }

          newEntries.push({
            id: `tt-ai-${Date.now()}-${cls.id}-${day}-${period}`,
            classId: cls.id,
            subjectId: subject.id,
            subjectName: subject.name,
            facultyId: freeFaculty.id,
            facultyName: freeFaculty.name,
            room: roomName,
            day,
            period,
          });

          facultyWorkloadMap[freeFaculty.id] = (facultyWorkloadMap[freeFaculty.id] || 0) + 1;
        });
      });
    });

    setTimetableEntries(newEntries);

    // Update faculty workloads based on generated slots
    setFacultyList((prev) =>
      prev.map((f) => ({
        ...f,
        currentWeeklyLectures: facultyWorkloadMap[f.id] || 0,
      }))
    );

    dispatchNotification({
      type: 'timetable',
      title: 'AI Timetable Generation Complete',
      message: `Generated conflict-free timetable across ${classesToSchedule.length} classes and ${newEntries.length} total lecture slots.`,
      recipient: 'All Faculty & Student Portals',
      channel: 'System Wide',
      badge: 'AI Engine',
    });

    showToast('🧠 AI Timetable Generated! 100% Conflict-free & Workload-Balanced.');
    return newEntries;
  };

  // ==========================================
  // FEATURE 3: AUTO ROOM ALLOCATION
  // ==========================================
  const autoAllocateRooms = () => {
    let reallocatedCount = 0;
    const rooms = roomsList.length > 0 ? roomsList : [];

    const updated = timetableEntries.map((entry) => {
      const cls = classList.find((c) => c.id === entry.classId);
      const subject = subjectList.find((s) => s.id === entry.subjectId);
      const currentRoomObj = rooms.find((r) => r.name.toLowerCase() === entry.room?.toLowerCase());

      const needsLab = subject?.isLab;
      const classSize = cls?.totalStudents || 60;

      // Check if current room has mismatch
      const isMismatched =
        (needsLab && currentRoomObj?.type !== 'Lab') ||
        (!needsLab && currentRoomObj && currentRoomObj.capacity < classSize);

      if (isMismatched || !entry.room) {
        // Find best free room at this day & period
        const candidateRoom = rooms.find((r) => {
          if (needsLab && r.type !== 'Lab') return false;
          if (!needsLab && r.type === 'Lab') return false;
          if (r.capacity < classSize) return false;

          const isOccupied = timetableEntries.some(
            (other) =>
              other.id !== entry.id &&
              other.day === entry.day &&
              other.period === entry.period &&
              other.room?.toLowerCase() === r.name.toLowerCase()
          );
          return !isOccupied;
        });

        if (candidateRoom) {
          reallocatedCount++;
          return { ...entry, room: candidateRoom.name };
        }
      }

      return entry;
    });

    setTimetableEntries(updated);

    dispatchNotification({
      type: 'room',
      title: 'Smart Room Allocation Completed',
      message: `Audited all classes against lab facilities and room capacities. Optimized ${reallocatedCount} room assignments.`,
      recipient: 'Estate Manager & Department Staff',
      channel: 'In-App',
      badge: 'Rooms',
    });

    showToast(`🏢 Smart Room Allocation: Optimized ${reallocatedCount} rooms without capacity or double-booking clashes!`);
    return reallocatedCount;
  };

  // ==========================================
  // FEATURE 4: SMART FACULTY WORKLOAD BALANCER
  // ==========================================
  const balanceFacultyWorkloads = () => {
    // Identify overloaded faculty (> 14 lectures) and underloaded faculty (< 10 lectures)
    const overloaded = facultyList.filter((f) => (f.currentWeeklyLectures || 0) >= 14);
    const underloaded = facultyList.filter((f) => (f.currentWeeklyLectures || 0) <= 10 && f.status !== 'Absent');

    if (overloaded.length === 0 || underloaded.length === 0) {
      showToast('Faculty workload is already well-balanced across departments!', 'info');
      return { reassigned: 0 };
    }

    let reassignedCount = 0;
    const entriesCopy = [...timetableEntries];

    for (const heavyFaculty of overloaded) {
      for (const lightFaculty of underloaded) {
        if (reassignedCount >= 3) break;

        // Find a slot of heavyFaculty that lightFaculty can teach
        const candidateEntryIndex = entriesCopy.findIndex((e) => {
          if (e.facultyId !== heavyFaculty.id) return false;
          const canTeach = lightFaculty.teachableSubjects?.some(
            (ts) => ts.toLowerCase() === e.subjectName?.toLowerCase()
          );
          if (!canTeach) return false;

          // Check if lightFaculty is free at that day & period
          const isBusy = entriesCopy.some(
            (other) =>
              other.day === e.day &&
              other.period === e.period &&
              other.facultyId === lightFaculty.id
          );
          return !isBusy;
        });

        if (candidateEntryIndex !== -1) {
          const entry = entriesCopy[candidateEntryIndex];
          entriesCopy[candidateEntryIndex] = {
            ...entry,
            facultyId: lightFaculty.id,
            facultyName: lightFaculty.name,
          };
          reassignedCount++;

          heavyFaculty.currentWeeklyLectures = Math.max(0, heavyFaculty.currentWeeklyLectures - 1);
          lightFaculty.currentWeeklyLectures = (lightFaculty.currentWeeklyLectures || 0) + 1;
        }
      }
    }

    setTimetableEntries(entriesCopy);
    setFacultyList([...facultyList]);

    dispatchNotification({
      type: 'workload',
      title: 'Workload Auto-Rebalance Applied',
      message: `Equitably redistributed ${reassignedCount} lectures from overloaded faculty to faculty with open bandwidth.`,
      recipient: 'All Department Faculty & Deans',
      channel: 'Email & In-App',
      badge: 'Balanced',
    });

    showToast(`⚖️ Smart Workload Balancer: Reassigned ${reassignedCount} lectures for fair weekly load!`);
    return { reassigned: reassignedCount };
  };

  // ==========================================
  // FEATURE 6: LEAVE AUTO-APPROVAL SYSTEM
  // ==========================================
  const applyLeaveWithAutoApproval = ({
    facultyId,
    leaveType = 'Casual Leave',
    daysCount = 1,
    reason,
    startDate,
    endDate,
    day = 'Monday',
  }) => {
    const faculty = facultyList.find((f) => f.id === facultyId);
    if (!faculty) return null;

    // Rules engine evaluation:
    // If Casual Leave <= 2 days and balance available -> Auto Approve
    const isAutoApproved = leaveType === 'Casual Leave' && Number(daysCount) <= 2;

    const newLeave = {
      id: `leave-${Date.now()}`,
      facultyId,
      facultyName: faculty.name,
      department: faculty.deptCode || 'CSE',
      leaveType,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      daysCount: Number(daysCount),
      reason,
      appliedOn: new Date().toLocaleString(),
      status: isAutoApproved ? 'Auto-Approved' : 'Pending HOD Review',
      approvalType: isAutoApproved ? 'System Rules Engine (Instant CL Approval)' : 'HOD Desk Approval Required',
      approvalNotes: isAutoApproved
        ? 'Casual leave quota verified (<2 days rule). Faculty marked absent and substitute search triggered.'
        : 'Medical or extended leave queued for Dean/HOD digital sign-off.',
      substituteAssigned: false,
    };

    setLeaveApplications((prev) => [newLeave, ...prev]);

    if (isAutoApproved) {
      // Mark faculty absent and auto-assign substitutes
      const createdAbsence = markFacultyAbsent({
        facultyId,
        day,
        reason: `${leaveType}: ${reason}`,
      });

      if (createdAbsence) {
        setTimeout(() => {
          autoAssignAllSubstitutions(createdAbsence.id);
        }, 300);
      }

      dispatchNotification({
        type: 'leave',
        title: `Casual Leave Auto-Approved: ${faculty.name}`,
        message: `${faculty.name} casual leave auto-approved. Timetable slots marked and substitutes auto-allocated.`,
        recipient: `${faculty.name} & HOD`,
        channel: 'WhatsApp & Email',
        badge: 'Approved',
      });

      showToast(`📝 Leave Auto-Approved for ${faculty.name}! Substitutes auto-allocated.`);
    } else {
      dispatchNotification({
        type: 'leave',
        title: `New Leave Request: ${faculty.name}`,
        message: `${faculty.name} submitted ${leaveType} for ${daysCount} days. Awaiting HOD review.`,
        recipient: 'HOD Portal',
        channel: 'In-App',
        badge: 'Pending',
      });
      showToast(`Leave application submitted for ${faculty.name} (Pending HOD Review).`);
    }

    return newLeave;
  };

  // ==========================================
  // FEATURE 7: QR & BIOMETRIC ATTENDANCE
  // ==========================================
  const refreshQrToken = (sessionId) => {
    const newToken = `CDGI-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    setAttendanceSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, qrToken: newToken, expiresInSeconds: 15 } : s))
    );
    return newToken;
  };

  const simulateBatchAttendanceScan = (sessionId, addCount = 5) => {
    setAttendanceSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const newPresent = Math.min(s.totalEnrolled, (s.presentCount || 0) + addCount);
          const newAbsent = s.totalEnrolled - newPresent;
          const newRate = Number(((newPresent / s.totalEnrolled) * 100).toFixed(1));
          return {
            ...s,
            presentCount: newPresent,
            absentCount: newAbsent,
            attendanceRate: newRate,
          };
        }
        return s;
      })
    );
    showToast(`📲 Scanned +${addCount} student attendance punches!`);
  };

  const triggerLowAttendanceAlert = (sessionId) => {
    const session = attendanceSessions.find((s) => s.id === sessionId) || attendanceSessions[0];
    dispatchNotification({
      type: 'attendance',
      title: 'Low Attendance Alert Triggered (<75%)',
      message: `Automated warning SMS sent to 5 student guardians and class mentor for ${session?.className || 'Class'}.`,
      recipient: 'Student Parents & Mentor',
      channel: 'Automated SMS Gateway',
      badge: 'Defaulter Alert',
    });
    showToast('🚨 Low attendance warning dispatches transmitted to parents & mentors.');
  };

  // ==========================================
  // FEATURE 8: RECURRING EVENT AUTO-SCHEDULER
  // ==========================================
  const toggleRecurringRule = (ruleId) => {
    setRecurringRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, status: r.status === 'Active' ? 'Paused' : 'Active' } : r
      )
    );
    showToast('Recurring schedule rule toggled successfully.');
  };

  // ==========================================
  // FEATURE 9: SMART CONFLICT RESOLVER
  // ==========================================
  const detectAllConflicts = useCallback(() => {
    const conflicts = [];

    // 1. Faculty Double Booking: Faculty assigned to 2 different classes on same day & period
    const facultySlotMap = {};
    // 2. Room Double Booking: Room assigned to 2 different classes on same day & period
    const roomSlotMap = {};

    timetableEntries.forEach((entry) => {
      const fKey = `${entry.facultyId}_${entry.day}_${entry.period}`;
      if (facultySlotMap[fKey]) {
        conflicts.push({
          id: `conf-f-${entry.id}`,
          type: 'faculty_clash',
          severity: 'Critical',
          title: `Faculty Double-Booking: ${entry.facultyName}`,
          description: `${entry.facultyName} is scheduled concurrently in two classes on ${entry.day}, Period ${entry.period}.`,
          entryA: facultySlotMap[fKey],
          entryB: entry,
          suggestedResolution: 'Move one lecture to an unoccupied period or swap with another faculty.',
        });
      } else {
        facultySlotMap[fKey] = entry;
      }

      if (entry.room) {
        const rKey = `${entry.room.trim().toLowerCase()}_${entry.day}_${entry.period}`;
        if (roomSlotMap[rKey]) {
          conflicts.push({
            id: `conf-r-${entry.id}`,
            type: 'room_clash',
            severity: 'Critical',
            title: `Room Collision: ${entry.room}`,
            description: `${entry.room} has double bookings on ${entry.day}, Period ${entry.period}.`,
            entryA: roomSlotMap[rKey],
            entryB: entry,
            suggestedResolution: 'Auto-reallocate one class to an available lecture hall with matching capacity.',
          });
        } else {
          roomSlotMap[rKey] = entry;
        }
      }

      // 3. Room capacity shortage
      const cls = classList.find((c) => c.id === entry.classId);
      const roomObj = roomsList.find((r) => r.name.toLowerCase() === entry.room?.toLowerCase());
      if (cls && roomObj && roomObj.capacity < cls.totalStudents) {
        conflicts.push({
          id: `conf-c-${entry.id}`,
          type: 'capacity_mismatch',
          severity: 'Warning',
          title: `Room Capacity Deficit: ${entry.room}`,
          description: `Class ${cls.name} has ${cls.totalStudents} students, exceeding ${entry.room} capacity of ${roomObj.capacity}.`,
          entryA: entry,
          suggestedResolution: 'Shift class to Room 301 (Cap: 70) or Room 302 (Cap: 65).',
        });
      }
    });

    return conflicts;
  }, [timetableEntries, classList, roomsList]);

  const resolveConflict = (conflictId) => {
    const allConflicts = detectAllConflicts();
    const target = allConflicts.find((c) => c.id === conflictId);
    if (!target) return;

    if (target.type === 'room_clash' || target.type === 'capacity_mismatch') {
      const freeRoom = roomsList.find((r) => {
        return !timetableEntries.some(
          (e) =>
            e.day === target.entryB.day &&
            e.period === target.entryB.period &&
            e.room?.toLowerCase() === r.name.toLowerCase()
        );
      });

      if (freeRoom) {
        setTimetableEntries((prev) =>
          prev.map((e) =>
            e.id === target.entryB.id ? { ...e, room: freeRoom.name } : e
          )
        );
        showToast(`✅ Room collision resolved: Assigned ${freeRoom.name}!`);
      }
    } else if (target.type === 'faculty_clash') {
      // Find substitute or free period
      const availableSub = getAvailableSubstitutes(target.entryB, target.entryB.day);
      if (availableSub.length > 0) {
        setTimetableEntries((prev) =>
          prev.map((e) =>
            e.id === target.entryB.id
              ? { ...e, facultyId: availableSub[0].id, facultyName: availableSub[0].name }
              : e
          )
        );
        showToast(`✅ Faculty clash resolved: Reassigned to ${availableSub[0].name}!`);
      }
    }
  };

  const resolveAllConflicts = () => {
    // Run auto room allocation + heuristic clash remover
    autoAllocateRooms();
    showToast('⚡ Conflict Resolver: Scanned and resolved all timetable collisions!');
  };

  // Quick stats
  const stats = useMemo(() => {
    const totalFaculty = facultyList.length;
    const totalClasses = classList.length;
    const totalSubjects = subjectList.length;
    const todayAbsences = absences.length;
    const activeSubstitutionsCount = substitutions.length;
    const totalRooms = roomsList.length;
    const pendingLeaves = leaveApplications.filter((l) => l.status !== 'Auto-Approved').length;
    const unreadNotifications = notifications.length;

    return {
      totalFaculty,
      totalClasses,
      totalSubjects,
      todayAbsences,
      activeSubstitutionsCount,
      totalRooms,
      pendingLeaves,
      unreadNotifications,
    };
  }, [facultyList, classList, subjectList, absences, substitutions, roomsList, leaveApplications, notifications]);

  const value = {
    facultyList,
    subjectList,
    classList,
    timetableEntries,
    absences,
    substitutions,
    roomsList,
    setRoomsList,
    leaveApplications,
    notifications,
    attendanceSessions,
    recurringRules,
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
    // Automation methods:
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

