// src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEPARTMENT_INFO } from '../../utils/constants';

export default function Login() {
  const [identifier, setIdentifier] = useState('hod.csit@cdgi.edu.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleQuickFill = (role) => {
    if (role === 'HOD') {
      setIdentifier('hod.csit@cdgi.edu.in');
      setPassword('password123');
    } else {
      setIdentifier('ananya.mukherjee@cdgi.edu.in');
      setPassword('password123');
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your institutional email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      const result = await login(identifier, password);
      if (result.user.role === 'HOD') {
        navigate('/hod/dashboard');
      } else {
        navigate('/faculty/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-9 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-lg border border-slate-200 dark:border-slate-700 mb-3 flex items-center justify-center">
            <img
              src="/cdgi-logo.png"
              alt="Chameli Devi Group of Institutions"
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            ODRMS Portal
          </h1>
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">
            Online Departmental Resource Management System
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>CSIT Dept • 3rd Year / 5th Sem (Sec A & B)</span>
          </div>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div className="mb-5 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs">
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
            1-Click Demo Credentials:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('HOD')}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:bg-indigo-50 transition-colors cursor-pointer text-center"
            >
              HOD Account
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Faculty')}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Faculty Account
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Institutional Email or Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@cdgi.edu.in or employee ID"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to ODRMS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Role-restricted portal for HOD and Faculty members</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Chameli Devi Group of Institutions • CSIT Department ODRMS v1.0
      </footer>
    </div>
  );
}

