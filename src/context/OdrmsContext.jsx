// src/context/OdrmsContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import facultyService from '../services/facultyService';
import lectureService from '../services/lectureService';
import taskService from '../services/taskService';
import resourceService from '../services/resourceService';
import achievementService from '../services/achievementService';
import { initializeStorage } from '../utils/storage';
import { useAuth } from './AuthContext';

const OdrmsContext = createContext(null);

export function OdrmsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({
    facultyCount: 0,
    lectureCount: 0,
    pendingTasksCount: 0,
    pendingAchievementsCount: 0,
    pendingBookingsCount: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  // Toast notifier
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const addActivity = useCallback((title, subtitle, type = 'info') => {
    setRecentActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        title,
        subtitle,
        time: 'Just now',
        type,
      },
      ...prev.slice(0, 7),
    ]);
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const [fac, lec, tsk, ach, bkg] = await Promise.all([
        facultyService.getAllFaculty(),
        lectureService.getAllLectures(),
        taskService.getAllTasks(),
        achievementService.getAllAchievements(),
        resourceService.getAllBookings(),
      ]);

      setCounts({
        facultyCount: fac.length,
        lectureCount: lec.length,
        pendingTasksCount: tsk.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length,
        pendingAchievementsCount: ach.filter((a) => a.status === 'Under Review').length,
        pendingBookingsCount: bkg.filter((b) => b.status === 'Pending').length,
      });
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    initializeStorage();
    refreshCounts();
  }, [isAuthenticated, refreshCounts]);

  const value = {
    toast,
    showToast,
    hideToast,
    counts,
    refreshCounts,
    recentActivities,
    addActivity,
  };

  return <OdrmsContext.Provider value={value}>{children}</OdrmsContext.Provider>;
}

export function useOdrms() {
  const context = useContext(OdrmsContext);
  if (!context) {
    throw new Error('useOdrms must be used within an OdrmsProvider');
  }
  return context;
}

export default OdrmsContext;
