// src/services/reportService.js
import apiClient, { mockDelay } from './api';
import {
  STORAGE_KEYS,
  INITIAL_FACULTY,
  INITIAL_LECTURES,
  INITIAL_ATTENDANCE,
  INITIAL_TASKS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_RESOURCES,
} from '../utils/storage';

export const reportService = {
  async getDepartmentOverview() {
    try {
      const response = await apiClient.get('/reports/overview/');
      return response.data;
    } catch {
      await mockDelay(150);
      const faculty = JSON.parse(localStorage.getItem(STORAGE_KEYS.FACULTY) || JSON.stringify(INITIAL_FACULTY));
      const lectures = JSON.parse(localStorage.getItem(STORAGE_KEYS.LECTURES) || JSON.stringify(INITIAL_LECTURES));
      const attendance = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || JSON.stringify(INITIAL_ATTENDANCE));
      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || JSON.stringify(INITIAL_TASKS));
      const achievements = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS) || JSON.stringify(INITIAL_ACHIEVEMENTS));
      const resources = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || JSON.stringify(INITIAL_RESOURCES));
      const bookings = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || '[]');

      const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
      const pendingTasks = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
      const underReviewTasks = tasks.filter((t) => t.status === 'Under Review').length;

      const pendingAchievements = achievements.filter((a) => a.status === 'Under Review').length;
      const pendingBookings = bookings.filter((b) => b.status === 'Pending').length;

      const secAAttendance = attendance.filter((a) => a.section === 'Section A');
      const secBAttendance = attendance.filter((a) => a.section === 'Section B');

      const avgSecA = secAAttendance.length
        ? (secAAttendance.reduce((acc, curr) => acc + curr.attendanceRate, 0) / secAAttendance.length).toFixed(1)
        : 0;

      const avgSecB = secBAttendance.length
        ? (secBAttendance.reduce((acc, curr) => acc + curr.attendanceRate, 0) / secBAttendance.length).toFixed(1)
        : 0;

      return {
        metrics: {
          totalFaculty: faculty.length,
          assignedLectures: lectures.length,
          completedLectures: lectures.filter((l) => l.status === 'Completed').length,
          pendingTasks,
          underReviewTasks,
          completedTasks,
          pendingBookings,
          pendingAchievements,
          totalResources: resources.length,
          availableResources: resources.filter((r) => r.status === 'Available').length,
          bookedResources: resources.filter((r) => r.status === 'Booked').length,
          attendanceSecA: Number(avgSecA),
          attendanceSecB: Number(avgSecB),
          overallAttendance: Number(((Number(avgSecA) + Number(avgSecB)) / 2).toFixed(1)),
        },
        taskDistribution: [
          { name: 'Completed', count: completedTasks, color: '#10b981' },
          { name: 'In Progress', count: tasks.filter((t) => t.status === 'In Progress').length, color: '#f59e0b' },
          { name: 'Under Review', count: underReviewTasks, color: '#6366f1' },
          { name: 'Pending', count: tasks.filter((t) => t.status === 'Pending').length, color: '#ef4444' },
        ],
        attendanceBySubject: [
          { subject: 'TOC', secA: 93.3, secB: 91.5 },
          { subject: 'DBMS', secA: 90.0, secB: 88.4 },
          { subject: 'DAA', secA: 94.2, secB: 95.0 },
          { subject: 'SE', secA: 89.5, secB: 92.1 },
          { subject: 'WTC', secA: 91.0, secB: 89.8 },
          { subject: 'Labs', secA: 96.5, secB: 95.2 },
        ],
        resourceUtilization: [
          { type: 'Classrooms', total: 2, inUse: 2 },
          { type: 'Laboratories', total: 2, inUse: 1 },
          { type: 'Seminar Hall', total: 1, inUse: 1 },
          { type: 'Projectors', total: 1, inUse: 0 },
          { type: 'GPU Rig', total: 1, inUse: 1 },
        ],
      };
    }
  },
};

export default reportService;

