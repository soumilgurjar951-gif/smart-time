// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { INITIAL_FACULTY } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Sync state on mount
  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    const storedToken = authService.getToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
  }, []);

  const login = async (identifier, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.login(identifier, password);
      setUser(result.user);
      setToken(result.token);
      setIsLoading(false);
      return result;
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
      setIsLoading(false);
      throw err;
    }
  };

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  // Quick switcher for demo convenience between HOD and Faculty
  const switchUserRole = (role) => {
    const target = role === 'HOD' ? INITIAL_FACULTY[0] : INITIAL_FACULTY[1];
    authService.login(target.email, 'password123').then((res) => {
      setUser(res.user);
      setToken(res.token);
    });
  };

  const isHod = user?.role === 'HOD';
  const isFaculty = user?.role === 'Faculty';
  const isAuthenticated = Boolean(user && token);

  const value = {
    user,
    token,
    isLoading,
    authError,
    isAuthenticated,
    isHod,
    isFaculty,
    login,
    logout,
    switchUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

