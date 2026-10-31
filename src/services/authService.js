// src/services/authService.js
import apiClient, { mockDelay } from './api';
import { STORAGE_KEYS, INITIAL_FACULTY } from '../utils/storage';

export const authService = {
  async login(identifier, password) {
    try {
      // Attempt live API endpoint
      const response = await apiClient.post('/auth/login/', {
        username: identifier,
        password,
      });
      const { token, user } = response.data;
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return { success: true, user, token };
    } catch {
      // Mock fallback for development
      await mockDelay(250);
      const cleanId = (identifier || '').trim().toLowerCase();

      // Check against stored faculty records
      const storedFaculty = JSON.parse(localStorage.getItem(STORAGE_KEYS.FACULTY) || JSON.stringify(INITIAL_FACULTY));
      const matched = storedFaculty.find(
        (f) =>
          f.email.toLowerCase() === cleanId ||
          f.username.toLowerCase() === cleanId ||
          f.employeeId.toLowerCase() === cleanId
      );

      if (!matched) {
        throw new Error('Invalid credentials. Faculty or HOD account not found for CSIT 3rd Year / 5th Sem.');
      }

      if (password && password.length < 4) {
        throw new Error('Password must be at least 4 characters.');
      }

      const mockToken = `mock-jwt-token-${matched.id}-${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.TOKEN, mockToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(matched));

      return {
        success: true,
        user: matched,
        token: mockToken,
      };
    }
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
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

