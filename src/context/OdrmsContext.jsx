// src/context/OdrmsContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import facultyService from '../services/facultyService';
import lectureService from '../services/lectureService';
import taskService from '../services/taskService';
import resourceService from '../services/resourceService';
import achievementService from '../services/achievementService';
import { initializeStorage } from '../utils/storage';

const OdrmsContext = createContext(null);

export function OdrmsProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({
    facultyCount: 0,
    lectureCount: 0,
    pendingTasksCount: 0,
    pendingAchievementsCount: 0,
    pendingBookingsCount: 0,
  });
  const [recentActivities, setRecentActivities] = useState([
    {
      id: 'act-1',
      title: 'DAA Python Lab Booking Approved',
      subtitle: 'Turing Block Lab 1 reserved for Section B by Prof. Vikramaditya',
      time: '15 mins ago',
      type: 'resource',
    },
    {
      id: 'act-2',
      title: 'Attendance Submitted for TOC (Sec A)',
      subtitle: '93.3% attendance recorded by Dr. Rajiv Sharma',
      time: '1 hour ago',
      type: 'attendance',
    },
    {
      id: 'act-3',
      title: 'New Faculty Achievement Submitted',
      subtitle: 'Dr. Amitav Banerjee uploaded IEEE Research Paper publication',
      time: '3 hours ago',
      type: 'achievement',
    },
    {
      id: 'act-4',
      title: 'NAAC Course File Task Progress Updated',
      subtitle: 'Dr. Ananya Mukherjee updated progress to 65%',
      time: 'Yesterday',
      type: 'task',
    },
  ]);

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
    initializeStorage();
    refreshCounts();
  }, [refreshCounts]);

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

