// src/services/facultyService.js
import apiClient, { mockDelay } from './api';
import { STORAGE_KEYS, INITIAL_FACULTY } from '../utils/storage';

export const facultyService = {
  async getAllFaculty(filters = {}) {
    try {
      const response = await apiClient.get('/faculty/', { params: filters });
      return response.data;
    } catch {
      await mockDelay(150);
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FACULTY) || JSON.stringify(INITIAL_FACULTY));
      
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.employeeId.toLowerCase().includes(q) ||
            f.email.toLowerCase().includes(q) ||
            f.assignedSubjects.some((s) => s.toLowerCase().includes(q))
        );
      }

      if (filters.status && filters.status !== 'All') {
        list = list.filter((f) => f.status === filters.status);
      }

      if (filters.section && filters.section !== 'All') {
        list = list.filter((f) => f.assignedSections.includes(filters.section));
      }

      return list;
    }
  },

  async getFacultyById(id) {
    try {
      const response = await apiClient.get(`/faculty/${id}/`);
      return response.data;
    } catch {
      await mockDelay(100);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FACULTY) || JSON.stringify(INITIAL_FACULTY));
      const found = list.find((f) => f.id === id);
      if (!found) throw new Error('Faculty member not found.');
      return found;
    }
  },

  async createFaculty(facultyData) {
    try {
      const response = await apiClient.post('/faculty/', facultyData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FACULTY) || JSON.stringify(INITIAL_FACULTY));
      
      const newFaculty = {
        id: `fac-${Date.now()}`,
        employeeId: facultyData.employeeId || `EMP-CSIT-${String(list.length + 1).padStart(3, '0')}`,
        name: facultyData.name,
        email: facultyData.email,
        username: facultyData.username || facultyData.email.split('@')[0],
        role: facultyData.role || 'Faculty',
        designation: facultyData.designation || 'Assistant Professor',
        department: 'CSIT',
        contact: facultyData.contact || '+91 98260 00000',
        cabin: facultyData.cabin || 'CSIT Faculty Wing',
        assignedSubjects: Array.isArray(facultyData.assignedSubjects) ? facultyData.assignedSubjects : [facultyData.assignedSubjects].filter(Boolean),
        assignedSections: Array.isArray(facultyData.assignedSections) ? facultyData.assignedSections : ['Section A'],
        status: facultyData.status || 'Active',
        qualification: facultyData.qualification || 'M.Tech in CSIT',
        experienceYears: Number(facultyData.experienceYears) || 3,
        avatar: (facultyData.name || 'FC').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      };

      const updated = [newFaculty, ...list];
      localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(updated));
      return newFaculty;
    }
  },

  async updateFaculty(id, updateData) {
    try {
      const response = await apiClient.put(`/faculty/${id}/`, updateData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FACULTY) || JSON.stringify(INITIAL_FACULTY));
      const index = list.findIndex((f) => f.id === id);
      if (index === -1) throw new Error('Faculty member not found.');

      const updatedRecord = {
        ...list[index],
        ...updateData,
        assignedSubjects: Array.isArray(updateData.assignedSubjects)
          ? updateData.assignedSubjects
          : list[index].assignedSubjects,
        assignedSections: Array.isArray(updateData.assignedSections)
          ? updateData.assignedSections
          : list[index].assignedSections,
      };

      list[index] = updatedRecord;
      localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(list));
      return updatedRecord;
    }
  },

  async deleteFaculty(id) {
    try {
      await apiClient.delete(`/faculty/${id}/`);
      return { success: true };
    } catch {
      await mockDelay(150);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FACULTY) || JSON.stringify(INITIAL_FACULTY));
      const filtered = list.filter((f) => f.id !== id);
      localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(filtered));
      return { success: true };
    }
  },
};

export default facultyService;

