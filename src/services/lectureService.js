// src/services/lectureService.js
import apiClient, { mockDelay } from './api';
import { STORAGE_KEYS, INITIAL_LECTURES } from '../utils/storage';

export const lectureService = {
  async getAllLectures(filters = {}) {
    try {
      const response = await apiClient.get('/lectures/', { params: filters });
      return response.data;
    } catch {
      await mockDelay(150);
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.LECTURES) || JSON.stringify(INITIAL_LECTURES));

      if (filters.section && filters.section !== 'All') {
        list = list.filter((l) => l.section === filters.section);
      }
      if (filters.facultyId && filters.facultyId !== 'All') {
        list = list.filter((l) => l.facultyId === filters.facultyId);
      }
      if (filters.day && filters.day !== 'All') {
        list = list.filter((l) => l.day === filters.day);
      }
      if (filters.subjectCode && filters.subjectCode !== 'All') {
        list = list.filter((l) => l.subjectCode === filters.subjectCode);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (l) =>
            l.subjectName.toLowerCase().includes(q) ||
            l.subjectCode.toLowerCase().includes(q) ||
            l.facultyName.toLowerCase().includes(q) ||
            l.classroom.toLowerCase().includes(q) ||
            (l.topic && l.topic.toLowerCase().includes(q))
        );
      }

      return list;
    }
  },

  async getLectureById(id) {
    try {
      const response = await apiClient.get(`/lectures/${id}/`);
      return response.data;
    } catch {
      await mockDelay(100);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.LECTURES) || JSON.stringify(INITIAL_LECTURES));
      const found = list.find((l) => l.id === id);
      if (!found) throw new Error('Lecture not found.');
      return found;
    }
  },

  async createLecture(lectureData) {
    try {
      const response = await apiClient.post('/lectures/', lectureData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.LECTURES) || JSON.stringify(INITIAL_LECTURES));

      const newLecture = {
        id: `lec-${Date.now()}`,
        subjectCode: lectureData.subjectCode,
        subjectName: lectureData.subjectName,
        facultyId: lectureData.facultyId,
        facultyName: lectureData.facultyName,
        section: lectureData.section || 'Section A',
        day: lectureData.day || 'Monday',
        date: lectureData.date || new Date().toISOString().split('T')[0],
        timeSlot: lectureData.timeSlot || '09:00 AM - 10:00 AM',
        period: Number(lectureData.period) || 1,
        classroom: lectureData.classroom || 'CSIT Smart Classroom 301',
        lectureType: lectureData.lectureType || 'Theory',
        topic: lectureData.topic || 'Subject Curriculum Module',
        status: lectureData.status || 'Scheduled',
        attendanceMarked: false,
      };

      const updated = [newLecture, ...list];
      localStorage.setItem(STORAGE_KEYS.LECTURES, JSON.stringify(updated));
      return newLecture;
    }
  },

  async updateLecture(id, updateData) {
    try {
      const response = await apiClient.put(`/lectures/${id}/`, updateData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.LECTURES) || JSON.stringify(INITIAL_LECTURES));
      const index = list.findIndex((l) => l.id === id);
      if (index === -1) throw new Error('Lecture not found.');

      const updated = {
        ...list[index],
        ...updateData,
      };
      list[index] = updated;
      localStorage.setItem(STORAGE_KEYS.LECTURES, JSON.stringify(list));
      return updated;
    }
  },

  async deleteLecture(id) {
    try {
      await apiClient.delete(`/lectures/${id}/`);
      return { success: true };
    } catch {
      await mockDelay(150);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.LECTURES) || JSON.stringify(INITIAL_LECTURES));
      const filtered = list.filter((l) => l.id !== id);
      localStorage.setItem(STORAGE_KEYS.LECTURES, JSON.stringify(filtered));
      return { success: true };
    }
  },
};

export default lectureService;

