// src/utils/storage.js - Clean Storage (No Demo Data)
import {
  DEPARTMENT_INFO,
  CSIT_5TH_SEM_SUBJECTS,
  TIME_SLOTS,
} from './constants';

export const STORAGE_KEYS = {
  TOKEN: 'odrms_token',
  REFRESH_TOKEN: 'odrms_refresh_token',
  USER: 'odrms_user',
  FACULTY: 'odrms_faculty',
  LECTURES: 'odrms_lectures',
  ATTENDANCE: 'odrms_attendance',
  TASKS: 'odrms_tasks',
  ACHIEVEMENTS: 'odrms_achievements',
  RESOURCES: 'odrms_resources',
  BOOKINGS: 'odrms_bookings',
  THEME: 'odrms_theme',
  SELECTED_CLASS: 'odrms_selected_class_id',
};

// Empty Initial Data - Production Ready
export const INITIAL_FACULTY = [];
export const INITIAL_LECTURES = [];
export const INITIAL_ATTENDANCE = [];
export const INITIAL_TASKS = [];
export const INITIAL_ACHIEVEMENTS = [];
export const INITIAL_RESOURCES = [];
export const INITIAL_BOOKINGS = [];

// Storage utilities
export const storage = {
  getToken: () => localStorage.getItem(STORAGE_KEYS.TOKEN),
  setToken: (token) => localStorage.setItem(STORAGE_KEYS.TOKEN, token),
  removeToken: () => localStorage.removeItem(STORAGE_KEYS.TOKEN),

  getUser: () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(STORAGE_KEYS.USER),

  getTheme: () => localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
  setTheme: (theme) => localStorage.setItem(STORAGE_KEYS.THEME, theme),

  // Generic get/set for any key
  get: (key) => {
    const data = localStorage.getItem(STORAGE_KEYS[key.toUpperCase()]);
    return data ? JSON.parse(data) : null;
  },
  set: (key, value) => {
    localStorage.setItem(STORAGE_KEYS[key.toUpperCase()], JSON.stringify(value));
  },

  // Clear all app data
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
};

// Seed data function (optional - can be called manually if needed)
export const initializeStorage = () => seedInitialData();

export const seedInitialData = () => {
  if (!storage.get('FACULTY') || storage.get('FACULTY').length === 0) {
    storage.set('FACULTY', INITIAL_FACULTY);
  }
  if (!storage.get('LECTURES') || storage.get('LECTURES').length === 0) {
    storage.set('LECTURES', INITIAL_LECTURES);
  }
  if (!storage.get('ATTENDANCE') || storage.get('ATTENDANCE').length === 0) {
    storage.set('ATTENDANCE', INITIAL_ATTENDANCE);
  }
  if (!storage.get('TASKS') || storage.get('TASKS').length === 0) {
    storage.set('TASKS', INITIAL_TASKS);
  }
  if (!storage.get('ACHIEVEMENTS') || storage.get('ACHIEVEMENTS').length === 0) {
    storage.set('ACHIEVEMENTS', INITIAL_ACHIEVEMENTS);
  }
  if (!storage.get('RESOURCES') || storage.get('RESOURCES').length === 0) {
    storage.set('RESOURCES', INITIAL_RESOURCES);
  }
  if (!storage.get('BOOKINGS') || storage.get('BOOKINGS').length === 0) {
    storage.set('BOOKINGS', INITIAL_BOOKINGS);
  }
};

export default storage;
