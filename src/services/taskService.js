// src/services/taskService.js
import apiClient, { mockDelay } from './api';
import { STORAGE_KEYS, INITIAL_TASKS } from '../utils/storage';

export const taskService = {
  async getAllTasks(filters = {}) {
    try {
      const response = await apiClient.get('/tasks/', { params: filters });
      return response.data;
    } catch {
      await mockDelay(150);
      let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || JSON.stringify(INITIAL_TASKS));

      if (filters.assignedToId && filters.assignedToId !== 'All') {
        list = list.filter((t) => t.assignedToId === filters.assignedToId);
      }
      if (filters.status && filters.status !== 'All') {
        list = list.filter((t) => t.status === filters.status);
      }
      if (filters.priority && filters.priority !== 'All') {
        list = list.filter((t) => t.priority === filters.priority);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.assignedToName.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q)
        );
      }

      return list;
    }
  },

  async createTask(taskData) {
    try {
      const response = await apiClient.post('/tasks/', taskData);
      return response.data;
    } catch {
      await mockDelay(200);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || JSON.stringify(INITIAL_TASKS));

      const newTask = {
        id: `task-${Date.now()}`,
        title: taskData.title,
        description: taskData.description,
        assignedBy: taskData.assignedBy || 'Dr. Rajiv Sharma (HOD)',
        assignedToId: taskData.assignedToId,
        assignedToName: taskData.assignedToName,
        section: taskData.section || 'Section A & B',
        priority: taskData.priority || 'Medium',
        deadline: taskData.deadline,
        category: taskData.category || 'Academic Duty',
        status: 'Pending',
        progressPct: 0,
        completionReport: '',
        submittedDate: null,
        createdAt: new Date().toISOString().split('T')[0],
      };

      const updated = [newTask, ...list];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
      return newTask;
    }
  },

  async updateTaskProgress(id, { progressPct, status, completionReport }) {
    try {
      const response = await apiClient.patch(`/tasks/${id}/progress/`, {
        progressPct,
        status,
        completionReport,
      });
      return response.data;
    } catch {
      await mockDelay(180);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || JSON.stringify(INITIAL_TASKS));
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('Task not found.');

      const updated = {
        ...list[idx],
        progressPct: progressPct !== undefined ? Number(progressPct) : list[idx].progressPct,
        status: status || list[idx].status,
        completionReport: completionReport !== undefined ? completionReport : list[idx].completionReport,
        submittedDate: status === 'Completed' || status === 'Under Review' ? new Date().toISOString().split('T')[0] : list[idx].submittedDate,
      };

      list[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(list));
      return updated;
    }
  },

  async reviewTask(id, { status, remarks }) {
    try {
      const response = await apiClient.post(`/tasks/${id}/review/`, { status, remarks });
      return response.data;
    } catch {
      await mockDelay(180);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || JSON.stringify(INITIAL_TASKS));
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('Task not found.');

      const updated = {
        ...list[idx],
        status,
        hodRemarks: remarks,
      };
      list[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(list));
      return updated;
    }
  },

  async deleteTask(id) {
    try {
      await apiClient.delete(`/tasks/${id}/`);
      return { success: true };
    } catch {
      await mockDelay(150);
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || JSON.stringify(INITIAL_TASKS));
      const filtered = list.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
      return { success: true };
    }
  },
};

export default taskService;

