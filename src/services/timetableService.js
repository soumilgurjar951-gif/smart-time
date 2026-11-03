import apiClient from './api';

const listData = (data) => (Array.isArray(data) ? data : data.results || []);

export const timetableService = {
  async getSlots() {
    const { data } = await apiClient.get('/lectures/time-slots/');
    return listData(data);
  },
  async getSections() {
    const { data } = await apiClient.get('/lectures/sections/');
    return listData(data);
  },
  async getSubjects() {
    const { data } = await apiClient.get('/lectures/subjects/');
    return listData(data);
  },
  async getFaculty() {
    const { data } = await apiClient.get('/faculty/');
    return listData(data);
  },
  async getAcademicYears() {
    const { data } = await apiClient.get('/lectures/academic-years/');
    return listData(data);
  },
  async getAssignments() {
    const { data } = await apiClient.get('/lectures/faculty-subjects/');
    return listData(data);
  },
  async getEntries(filters = {}) {
    const { data } = await apiClient.get('/lectures/timetable/entries/weekly/', { params: filters });
    return data.results || [];
  },
  async getHistory() {
    const { data } = await apiClient.get('/lectures/timetable/history/');
    return listData(data);
  },
  async getNotifications() {
    const { data } = await apiClient.get('/notifications/');
    return listData(data);
  },
  async createEntry(payload) {
    const { data } = await apiClient.post('/lectures/timetable/entries/', payload);
    return data;
  },
  async updateEntry(id, payload) {
    const { data } = await apiClient.patch(`/lectures/timetable/entries/${id}/`, payload);
    return data;
  },
  async deleteEntry(id) {
    await apiClient.delete(`/lectures/timetable/entries/${id}/`);
  },
  async saveTimeSlot(id, payload) {
    const { data } = await apiClient.patch(`/lectures/time-slots/${id}/`, payload);
    return data;
  },
  async saveAssignment(id, payload) {
    const { data } = id
      ? await apiClient.patch(`/lectures/faculty-subjects/${id}/`, payload)
      : await apiClient.post('/lectures/faculty-subjects/', payload);
    return data;
  },
  async deleteAssignment(id) {
    await apiClient.delete(`/lectures/faculty-subjects/${id}/`);
  },
  async updateFaculty(id, payload) {
    const { data } = await apiClient.patch(`/faculty/${id}/`, payload);
    return data;
  },
  async createOccurrence(id, date) {
    const { data } = await apiClient.post(`/lectures/timetable/entries/${id}/occurrence/`, { date });
    return data;
  },
};

export default timetableService;
