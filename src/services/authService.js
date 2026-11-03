// src/services/authService.js
import apiClient from './api';
import { STORAGE_KEYS } from '../utils/storage';

export const authService = {
  async login(identifier, password, designation = null) {
    try {
      const response = await apiClient.post('/auth/login/', {
        email: identifier.trim(),
        password,
        ...(designation ? { designation } : {}),
      });
      const { access, refresh, user } = response.data;
      localStorage.setItem(STORAGE_KEYS.TOKEN, access);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return { success: true, user, token: access };
    } catch (error) {
      const responseError = error.response?.data?.error;
      const message = responseError?.message || error.response?.data?.detail || error.message;
      throw new Error(message || 'Unable to sign in. Check the API connection and credentials.');
    }
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  isAuthenticated() {
    return Boolean(this.getToken() && this.getCurrentUser());
  },
};

export default authService;
