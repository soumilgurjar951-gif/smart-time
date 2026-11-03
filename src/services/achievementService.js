// src/services/achievementService.js
import apiClient, { mockDelay } from './api';
import { STORAGE_KEYS, INITIAL_ACHIEVEMENTS } from '../utils/storage';

export const achievementService = {
  async getAllAchievements(filters = {}) {
    try {
      const response = await apiClient.get('/achievements/', { params: filters });
      const data = response.data;
      return Array.isArray(data) ? data : data?.results || [];
    } catch {
      await mockDelay(150);
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS) || JSON.stringify(INITIAL_ACHIEVEMENTS));

      if (filters.facultyId && filters.facultyId !== 'All') {
        list = list.filter((a) => a.facultyId === filters.facultyId);
      }
      if (filters.category && filters.category !== 'All') {
        list = list.filter((a) => a.category === filters.category);
      }
      if (filters.status && filters.status !== 'All') {
        list = list.filter((a) => a.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.facultyName.toLowerCase().includes(q) ||
            a.issuingBody.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
        );
      }

      return list;
    }
  },

  async submitAchievement(achievementData) {
    try {
      const response = await apiClient.post('/achievements/', achievementData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS) || JSON.stringify(INITIAL_ACHIEVEMENTS));

      const newAch = {
        id: `ach-${Date.now()}`,
        facultyId: achievementData.facultyId,
        facultyName: achievementData.facultyName,
        designation: achievementData.designation || 'Assistant Professor',
        category: achievementData.category || 'Certifications',
        title: achievementData.title,
        issuingBody: achievementData.issuingBody,
        date: achievementData.date || new Date().toISOString().split('T')[0],
        description: achievementData.description,
        certificateUrl: achievementData.certificateUrl || '/certificates/sample-verification-doc.pdf',
        certificateFileName: achievementData.certificateFileName || 'certificate-proof.pdf',
        status: 'Under Review',
        approvedBy: null,
        reviewedOn: null,
        reviewNotes: '',
      };

      const updated = [newAch, ...list];
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(updated));
      return newAch;
    }
  },

  async reviewAchievement(id, { status, approvedBy, reviewNotes }) {
    try {
      const response = await apiClient.post(`/achievements/${id}/review/`, {
        status,
        approvedBy,
        reviewNotes,
      });
      return response.data;
    } catch {
      await mockDelay(180);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS) || JSON.stringify(INITIAL_ACHIEVEMENTS));
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error('Achievement record not found.');

      const updated = {
        ...list[idx],
        status,
        approvedBy: status === 'Approved' ? approvedBy || 'Dr. Rajiv Sharma (HOD)' : null,
        reviewedOn: new Date().toISOString().split('T')[0],
        reviewNotes: reviewNotes || '',
      };

      list[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(list));
      return updated;
    }
  },
};

export default achievementService;

