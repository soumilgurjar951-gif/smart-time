// src/services/attendanceService.js
import apiClient, { mockDelay } from './api';
import {
  STORAGE_KEYS,
  INITIAL_ATTENDANCE,
  STUDENTS_SEC_A,
  STUDENTS_SEC_B,
} from '../utils/storage';

export const attendanceService = {
  async getAttendanceForLecture(lecture) {
    try {
      const response = await apiClient.get(`/attendance/lecture/${lecture.id}/`);
      return response.data;
    } catch {
      await mockDelay(150);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || JSON.stringify(INITIAL_ATTENDANCE));
      const existing = list.find((a) => a.lectureId === lecture.id);

      if (existing) {
        return existing;
      }

      // Default roster for this section
      const defaultRoster = lecture.section === 'Section B' ? STUDENTS_SEC_B : STUDENTS_SEC_A;
      const initialSession = {
        id: `att-${lecture.id}`,
        lectureId: lecture.id,
        subjectCode: lecture.subjectCode,
        subjectName: lecture.subjectName,
        facultyName: lecture.facultyName,
        section: lecture.section,
        date: lecture.date || new Date().toISOString().split('T')[0],
        timeSlot: lecture.timeSlot,
        totalStudents: defaultRoster.length,
        presentCount: defaultRoster.length,
        absentCount: 0,
        onLeaveCount: 0,
        attendanceRate: 100,
        records: defaultRoster.map((s) => ({ ...s, status: 'Present' })),
      };

      return initialSession;
    }
  },

  async saveLectureAttendance(attendanceData) {
    try {
      const response = await apiClient.post('/attendance/submit/', attendanceData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || JSON.stringify(INITIAL_ATTENDANCE));
      const lectures = JSON.parse(localStorage.getItem(STORAGE_KEYS.LECTURES) || '[]');

      // Recalculate stats
      const total = attendanceData.records.length;
      const present = attendanceData.records.filter((r) => r.status === 'Present').length;
      const absent = attendanceData.records.filter((r) => r.status === 'Absent').length;
      const onLeave = attendanceData.records.filter((r) => r.status === 'On Leave').length;
      const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

      const recordToSave = {
        ...attendanceData,
        totalStudents: total,
        presentCount: present,
        absentCount: absent,
        onLeaveCount: onLeave,
        attendanceRate: rate,
        savedAt: new Date().toISOString(),
      };

      const existingIndex = list.findIndex((a) => a.lectureId === attendanceData.lectureId);
      if (existingIndex !== -1) {
        list[existingIndex] = recordToSave;
      } else {
        list.unshift(recordToSave);
      }
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));

      // Mark lecture attendanceMarked = true
      const lecIndex = lectures.findIndex((l) => l.id === attendanceData.lectureId);
      if (lecIndex !== -1) {
        lectures[lecIndex].attendanceMarked = true;
        lectures[lecIndex].status = 'Completed';
        localStorage.setItem(STORAGE_KEYS.LECTURES, JSON.stringify(lectures));
      }

      return recordToSave;
    }
  },

  async getAttendanceHistory(filters = {}) {
    try {
      const response = await apiClient.get('/attendance/history/', { params: filters });
      return response.data;
    } catch {
      await mockDelay(150);
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || JSON.stringify(INITIAL_ATTENDANCE));

      if (filters.section && filters.section !== 'All') {
        list = list.filter((a) => a.section === filters.section);
      }
      if (filters.subjectCode && filters.subjectCode !== 'All') {
        list = list.filter((a) => a.subjectCode === filters.subjectCode);
      }
      if (filters.facultyName && filters.facultyName !== 'All') {
        list = list.filter((a) => a.facultyName.toLowerCase().includes(filters.facultyName.toLowerCase()));
      }
      if (filters.date) {
        list = list.filter((a) => a.date === filters.date);
      }

      return list;
    }
  },

  async getSectionSummary() {
    try {
      const response = await apiClient.get('/attendance/summary/');
      return response.data;
    } catch {
      await mockDelay(100);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || JSON.stringify(INITIAL_ATTENDANCE));
      
      const secA = list.filter((a) => a.section === 'Section A');
      const secB = list.filter((a) => a.section === 'Section B');

      const calcAvg = (items) => {
        if (!items.length) return 0;
        const sum = items.reduce((acc, curr) => acc + (curr.attendanceRate || 0), 0);
        return Number((sum / items.length).toFixed(1));
      };

      return {
        sectionA: {
          totalSessions: secA.length,
          averageRate: calcAvg(secA),
        },
        sectionB: {
          totalSessions: secB.length,
          averageRate: calcAvg(secB),
        },
        overallRate: calcAvg(list),
      };
    }
  },
};

export default attendanceService;

