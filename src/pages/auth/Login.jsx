// src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DESIGNATION_OPTIONS, OTHER_DESIGNATION } from '../../utils/constants';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [customDesignation, setCustomDesignation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const selectedDesignation = designation === OTHER_DESIGNATION ? customDesignation.trim() : designation;

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
      const result = await login(identifier, password, selectedDesignation || undefined);
      const loggedInUser = result.user;
      if (loggedInUser.role === 'HOD') {
        navigate('/hod/dashboard');
      } else if (['SUBMITTED', 'VERIFIED'].includes(loggedInUser.profile_status)) {
        navigate('/faculty/dashboard');
      } else {
        navigate('/faculty/onboarding');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-950 via-midnight-800 to-midnight-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white dark:bg-midnight-900 text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200/90 dark:border-midnight-800 shadow-2xl p-6 sm:p-9 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-lg border border-slate-200 dark:border-midnight-700 mb-3 flex items-center justify-center">
            <img
              src="/cdgi-logo.png"
              alt="Chameli Devi Group of Institutions"
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            CDGI Portal
          </h1>
          <p className="text-xs font-bold text-electric-600 dark:text-electric-400 uppercase tracking-widest mt-0.5">
            Chameli Devi Group of Institutions
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-midnight-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-midnight-700">
            <GraduationCap className="w-3.5 h-3.5 text-electric-600" />
            <span>Academic Management System</span>
          </div>
        </div>

        {/* Login Information */}
        <div className="mb-5 p-3 rounded-2xl bg-electric-50/70 dark:bg-electric-950/40 border border-electric-100 dark:border-electric-900/60 text-xs">
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
            Enter your institutional credentials to access the system
          </span>
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
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@cdgi.edu.in"
                className="w-full pl-10 pr-4 py-2.5 bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-electric-500/20 focus:border-electric-600 transition-all"
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
                className="w-full pl-10 pr-10 py-2.5 bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-electric-500/20 focus:border-electric-600 transition-all"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Designation
            </label>
            <select
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-electric-500/20 focus:border-electric-600 transition-all"
            >
              <option value="">Select your designation</option>
              {DESIGNATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value={OTHER_DESIGNATION}>Other</option>
            </select>
            {designation === OTHER_DESIGNATION && (
              <input
                type="text"
                value={customDesignation}
                onChange={(e) => setCustomDesignation(e.target.value)}
                placeholder="Enter your designation"
                className="mt-2 w-full px-3.5 py-2.5 bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-electric-500/20 focus:border-electric-600 transition-all"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-electric-600 hover:bg-electric-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-electric-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure institutional portal</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Chameli Devi Group of Institutions • Smart Time Portal
      </footer>
    </div>
  );
}
