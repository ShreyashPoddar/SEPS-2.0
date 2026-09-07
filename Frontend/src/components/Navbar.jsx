import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, Bell, Users, BookOpen, Ticket } from 'lucide-react';

import { isStudentProfileComplete } from '../api';

export default function Navbar({ user, handleLogout, notificationCount = 0, pendingTicketsCount = 0 }) {
  const navigate = useNavigate();
  const profileUrl = user?.role === 'teacher' ? '/teacher-profile' : '/student-profile';
  const dashboardUrl = user?.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard';

  return (
    <header className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-4">
        <div 
            className="w-12 h-12 flex items-center justify-center bg-slate-950 text-white rounded-2xl border-2 border-slate-900 shadow-md cursor-pointer hover:scale-105 transition"
            onClick={() => {
              if (user?.role === 'student' && !isStudentProfileComplete(user)) {
                navigate('/student-profile', { state: { profileRequired: true } });
              } else {
                navigate(dashboardUrl);
              }
            }}
        >
          <User className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 capitalize tracking-tight">
            {user?.role} Dashboard
          </h1>
          {user && (
            <p className="text-sm font-semibold text-slate-600 mt-0.5">
              Welcome, <span className="font-extrabold text-slate-950">{user.fullName}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        {user && (
          <Link to="/notifications" className="relative p-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full border-2 border-slate-900 shadow-sm transition">
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black border border-white">
                {notificationCount}
              </span>
            )}
          </Link>
        )}

        {/* Statistics Report link for allowed teachers */}
        {user?.role === 'teacher' && [
          "sangeetm@srmist.edu.in",
          "vadivukk@srmist.edu.in",
          "elavelvg@srmist.edu.in"
        ].includes(user.email) && (
          <Link 
            to="/teacher/statistics-report"
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 rounded-full shadow-sm text-xs font-bold transition"
          >
            <BookOpen className="w-3.5 h-3.5" /> Statistics Report
          </Link>
        )}
        {/* My Teams link for Teachers */}
        {user?.role === 'teacher' && (
          <Link 
            to="/teacher/my-teams"
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 rounded-full shadow-sm text-xs font-bold transition"
          >
            <Users className="w-3.5 h-3.5" /> My Teams
          </Link>
        )}
        {/* Member change tickets awaiting faculty review */}
        {user?.role === 'teacher' && (
          <Link
            to="/teacher/tickets"
            className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full border-2 text-xs font-bold transition shadow-sm ${
              pendingTicketsCount > 0
                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-700 font-extrabold"
                : "bg-white hover:bg-slate-100 text-slate-900 border-slate-900"
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Change Tickets</span>
            {pendingTicketsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-950 font-black text-[10px]">
                {pendingTicketsCount}
              </span>
            )}
          </Link>
        )}

        <Link 
          to={profileUrl}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 rounded-full shadow-sm text-xs font-bold transition"
        >
          <User className="w-3.5 h-3.5" /> Profile
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-sm border-2 border-red-900 text-xs font-extrabold transition active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>
    </header>
  );
}