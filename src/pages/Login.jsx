// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, GraduationCap, Lock, Mail, ArrowRight } from 'lucide-react';
import { useTimeFlow } from '../context/TimeFlowContext';

export default function Login() {
  const [email, setEmail] = useState('admin@cdgi.edu.in');
  const [password, setPassword] = useState('••••••••••');
  const [role, setRole] = useState('Admin');
  const { login } = useTimeFlow();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(role, email);
    navigate('/dashboard');
  };

  const roles = [
    { id: 'Admin', label: 'Admin', icon: ShieldCheck },
    { id: 'Faculty', label: 'Faculty', icon: User },
    { id: 'Student', label: 'Student', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background soft glow elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-indigo-100/50 p-8 sm:p-10 relative z-10 backdrop-blur-sm">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-lg shadow-indigo-100 border border-slate-200/80 mb-4 flex items-center justify-center transform hover:scale-105 transition-transform">
            <img
              src="/cdgi-logo.png"
              alt="Chameli Devi Group of Institutions, Indore"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            Chameli Devi Group of Institutions
          </h1>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mt-1">
            CDGI Indore • Timetable Portal
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            College Timetable & Faculty Substitution Management System
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider text-center">
            Sign In As
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Institutional Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cdgi.edu.in"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <span className="text-xs text-indigo-600 hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Remember this workstation</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 flex items-center justify-center gap-2 transition-all group"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Demo credentials are prefilled. Click Continue to explore.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        Chameli Devi Group of Institutions, Indore • TimeFlow Suite v2.4
      </footer>
    </div>
  );
}
