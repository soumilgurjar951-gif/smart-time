// src/api/axios.js
import axios from 'axios';

// Base Axios instance configured for future Node/Express/MongoDB backend connection
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for attaching auth token when backend is integrated
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('timeflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('API call simulated or failed:', error.message);
    return Promise.reject(error);
  }
);

export default api;
