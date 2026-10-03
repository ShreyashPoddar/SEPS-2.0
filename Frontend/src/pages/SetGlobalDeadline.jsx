import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getGlobalDeadline, setGlobalDeadline, logoutUser } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import showToast from "../utils/toastUtils";
import {
  Calendar,
  ArrowLeft,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
} from "lucide-react";

const toIstDate = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

import { isAdminEmail } from "../utils/adminUtils";
export default function SetGlobalDeadline({ user }) {
  const navigate = useNavigate();
  const [deadline, setDeadline] = useState("");
  const [currentRaw, setCurrentRaw] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Normalize authorization check
  const userEmail = (user?.email || "").trim().toLowerCase();
  const isAuthorized =
    user?.role === "teacher" &&
    isAdminEmail(userEmail);

  useEffect(() => {
    getGlobalDeadline()
      .then((res) => {
        if (res.data?.deadline) {
          const raw = res.data.deadline;
          setCurrentRaw(raw);
          const dateObj = new Date(raw);
          if (!isNaN(dateObj.getTime())) {
            setDeadline(toIstDate(dateObj));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load global deadline:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      navigate("/login");
    }
  };

  const currentDateObj = useMemo(() => {
    if (!currentRaw) return null;
    const d = new Date(currentRaw);
    return isNaN(d.getTime()) ? null : d;
  }, [currentRaw]);

  const isDeadlinePassed = useMemo(() => {
    if (!currentDateObj) return false;
    return new Date() > currentDateObj;
  }, [currentDateObj]);

  const daysRemaining = useMemo(() => {
    if (!currentDateObj) return null;
    const diffMs = currentDateObj.getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [currentDateObj]);

  const applyPreset = (daysAhead) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setDeadline(toIstDate(target));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deadline) {
      showToast.error("Please select a valid deadline date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await setGlobalDeadline(deadline);
      const updatedDate = res.data?.deadline || deadline;
      setCurrentRaw(updatedDate);
      showToast.success("Major project global deadline updated successfully!");
    } catch (err) {
      showToast.error(err, { fallback: "Failed to update deadline. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar user={user} handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border-2 border-red-300 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border-2 border-red-300 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-950">Unauthorized Access</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Only authorized departmental major project coordinators can configure or modify the institutional major project registration deadline.
            </p>
            <button
              onClick={() => navigate("/teacher-dashboard")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full text-xs transition shadow-md"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Teacher Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex flex-col font-sans text-slate-900">
      <Navbar user={user} handleLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation & Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate("/teacher-dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-full text-xs border-2 border-slate-900 shadow-sm transition active:scale-95 w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Admin Coordinator Portal</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-10 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 text-cyan-400 flex items-center justify-center font-bold shadow-md shadow-cyan-900/10">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Major Project Deadline
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Configure the institutional cutoff date for student major project proposal submissions
                </p>
              </div>
            </div>
          </div>

          {/* Current Deadline Status Banner */}
          <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Current Active Window
              </span>
              <div className="flex items-center gap-3">
                <span className="text-lg sm:text-xl font-black text-slate-950">
                  {currentDateObj
                    ? currentDateObj.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No deadline currently configured"}
                </span>
                {currentDateObj && (
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      isDeadlinePassed
                        ? "bg-red-100 text-red-700 border-red-300"
                        : "bg-emerald-100 text-emerald-800 border-emerald-300"
                    }`}
                  >
                    {isDeadlinePassed ? "Expired / Closed" : "Open / Active"}
                  </span>
                )}
              </div>
            </div>

            {currentDateObj && !isDeadlinePassed && daysRemaining !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs font-black self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-cyan-700" />
                <span>
                  {daysRemaining === 0
                    ? "Closes Today (23:59)"
                    : daysRemaining === 1
                    ? "1 Day Remaining"
                    : `${daysRemaining} Days Remaining`}
                </span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                Select New Application Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-5 py-3.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-slate-950 font-bold text-base transition shadow-sm"
                required
              />
              <p className="text-[11px] text-slate-500 font-medium">
                Note: Setting a date grants students access until 23:59:59 IST on that day. Submissions will be automatically locked thereafter.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "+3 Days", days: 3 },
                  { label: "+1 Week", days: 7 },
                  { label: "+2 Weeks", days: 14 },
                  { label: "+1 Month", days: 30 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => applyPreset(preset.days)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition active:scale-95"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950 text-xs font-medium space-y-1">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <Info className="w-4 h-4 text-amber-600" />
                <span>How This Deadline Affects the Portal</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Displayed immediately on all Student and Faculty Dashboards in real time.</li>
                <li>When the deadline expires, student project proposal applications are locked.</li>
                <li>Faculties can continue evaluating existing team applications and assigning grades.</li>
              </ul>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/teacher-dashboard")}
                className="px-5 py-3 rounded-full border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-black text-xs sm:text-sm border-2 border-black shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="xs" color="#ffffff" />
                    <span>Saving Deadline...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>Save Major Project Deadline</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
