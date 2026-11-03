// src/services/classService.js
import apiClient from './api';

const listData = (data) => (Array.isArray(data) ? data : data.results || []);

// Permission choices for class faculty access (HOD grants these per class)
export const PERMISSIONS = [
  { value: 'VIEW', label: 'View records' },
  { value: 'MANAGE_TIMETABLE', label: 'Manage timetable' },
  { value: 'MARK_ATTENDANCE', label: 'Mark attendance' },
  { value: 'MANAGE_RESOURCES', label: 'Manage resources' },
  { value: 'MANAGE_TASKS', label: 'Manage tasks' },
];

export const classService = {
  async listClasses(filters = {}) {
    const { data } = await apiClient.get('/classes/', { params: filters });
    return listData(data);
  },
  async createClass(payload) {
    const { data } = await apiClient.post('/classes/', payload);
    return data;
  },
  async updateClass(id, payload) {
    const { data } = await apiClient.patch(`/classes/${id}/`, payload);
    return data;
  },
  async getClass(id) {
    const { data } = await apiClient.get(`/classes/${id}/`);
    return data;
  },
  async deleteClass(id) {
    await apiClient.delete(`/classes/${id}/`);
  },
  async getDashboard(id) {
    const { data } = await apiClient.get(`/classes/${id}/dashboard/`);
    return data;
  },
  async getTimetable(id) {
    const { data } = await apiClient.get(`/classes/${id}/timetable/`);
    return data;
  },
  async getAttendance(id, filters = {}) {
    const { data } = await apiClient.get(`/classes/${id}/attendance/`, { params: filters });
    return data;
  },
  async getFacultyView(id) {
    const { data } = await apiClient.get(`/classes/${id}/faculty/`);
    return data;
  },
  async listSubjects(id) {
    const { data } = await apiClient.get(`/classes/${id}/subjects/`);
    return listData(data);
  },
  async linkSubject(id, subjectId) {
    const { data } = await apiClient.post(`/classes/${id}/subjects/`, { subject: subjectId });
    return data;
  },
  async assignFaculty(id, facultyId, subjectId) {
    const { data } = await apiClient.post(`/classes/${id}/assign-faculty/`, {
      faculty: facultyId,
      subject: subjectId,
    });
    return data;
  },
  async listAccess(id) {
    const { data } = await apiClient.get(`/classes/${id}/faculty-access/`);
    return listData(data);
  },
  async grantAccess(id, { faculty, permissions }) {
    const { data } = await apiClient.post(`/classes/${id}/faculty-access/`, { faculty, permissions });
    return data;
  },
  async revokeAccess(id, accessId) {
    const { data } = await apiClient.delete(`/classes/${id}/faculty-access/${accessId}/`);
    return data;
  },
  async getSummary() {
    const { data } = await apiClient.get('/classes/summary/');
    return data;
  },
  async getDepartments() {
    const { data } = await apiClient.get('/departments/');
    return listData(data);
  },
};

export default classService;
