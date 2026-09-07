import React, { useEffect, useState } from "react";
import { getCurrentUser, updateProfile, logoutUser, changePassword, forgotPassword, resetPassword } from "../api";
import { useNavigate } from "react-router-dom";
import { Loader, Save, AlertCircle, CheckCircle, ExternalLink, Lock, Eye, EyeOff, KeyRound, Mail, Send } from 'lucide-react';
import Navbar from "../components/Navbar";

export default function TeacherProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  // ── Change Password State ───────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Forgot Password Inline State ────────────────────────────────────────────
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Enter OTP & New Password
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNew, setShowForgotNew] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data.role !== "teacher") {
          navigate("/student-dashboard");
        } else {
          setProfile(res.data);
        }
      })
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const showNotification = (message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  // ── Format Validation Helpers & Regexes ──────────────────────────────────
  const LINKEDIN_FORMAT_REGEX = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.%]+(\/.*)?$/i;
  const GITHUB_FORMAT_REGEX = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_\-\.%]+(\/.*)?$/i;

  const isValidHttpUrl = (str) => {
    if (!str || typeof str !== "string") return false;
    const trimmed = str.trim();
    if (!trimmed) return false;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withProto);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  // Validation statuses
  const picRaw = (profile?.profilePic || "").trim();
  const isPicValid = !picRaw || isValidHttpUrl(picRaw);

  const linkedinRaw = (profile?.linkedinUrl || "").trim();
  const isLinkedinValid = !linkedinRaw || LINKEDIN_FORMAT_REGEX.test(linkedinRaw);

  const githubRaw = (profile?.githubUrl || "").trim();
  const isGithubValid = !githubRaw || GITHUB_FORMAT_REGEX.test(githubRaw);

  const resumeRaw = (profile?.resumeUrl || "").trim();
  const isResumeValid = !resumeRaw || isValidHttpUrl(resumeRaw);

  const isAllFieldsValid = Boolean(isPicValid && isLinkedinValid && isGithubValid && isResumeValid);

  const formatIssues = [];
  if (picRaw && !isPicValid) formatIssues.push("Profile Picture: Must be a valid web URL starting with https://");
  if (linkedinRaw && !isLinkedinValid) formatIssues.push("LinkedIn: Must be in the format https://www.linkedin.com/in/username");
  if (githubRaw && !isGithubValid) formatIssues.push("GitHub: Must be in the format https://github.com/username");
  if (resumeRaw && !isResumeValid) formatIssues.push("Resume / CV: Must be a valid web URL starting with https://");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAllFieldsValid) {
      showNotification(`Cannot save: Please correct invalid field formats:\n• ${formatIssues.join("\n• ")}`, "error");
      return;
    }

    setSaving(true);
    const normalizedData = {
      ...profile,
      profilePic: picRaw ? normalizeUrl(picRaw) : "",
      linkedinUrl: linkedinRaw ? normalizeUrl(linkedinRaw) : "",
      githubUrl: githubRaw ? normalizeUrl(githubRaw) : "",
      resumeUrl: resumeRaw ? normalizeUrl(resumeRaw) : "",
    };

    updateProfile(normalizedData)
      .then((res) => {
        showNotification("Profile updated successfully!", "success");
        if (res?.data) {
          setProfile(res.data);
        }
      })
      .catch((err) => {
        showNotification(err.response?.data?.message || "Failed to update profile.");
      })
      .finally(() => setSaving(false));
  };
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      navigate('/login');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showNotification("New passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      showNotification("New password must be at least 6 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      showNotification("Password changed successfully!", "success");
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleToggleForgot = (mode) => {
    setForgotMode(mode);
    setForgotStep(1);
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
  };

  const handleSendOtp = async () => {
    if (!profile?.email) {
      showNotification("No registered email found for your account.");
      return;
    }
    setForgotLoading(true);
    try {
      await forgotPassword({ email: profile.email, identifier: profile.email });
      showNotification(`OTP sent to ${profile.email}!`, "success");
      setForgotStep(2);
      setResendCooldown(30);
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetWithOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      showNotification("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      showNotification("New passwords do not match.");
      return;
    }
    if (forgotNewPass.length < 6) {
      showNotification("New password must be at least 6 characters.");
      return;
    }
    setForgotLoading(true);
    try {
      await resetPassword({
        email: profile.email,
        identifier: profile.email,
        otp: forgotOtp.trim(),
        password: forgotNewPass,
      });
      showNotification("Password reset successfully!", "success");
      handleToggleForgot(false);
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to reset password. Please verify the OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader className="w-10 h-10 text-cyan-600 animate-spin" />
      </div>
    );
  }

  const pwMatch = pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword;
  const pwMismatch = pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword;

  const forgotMatch = forgotConfirmPass && forgotNewPass === forgotConfirmPass;
  const forgotMismatch = forgotConfirmPass && forgotNewPass !== forgotConfirmPass;

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
       {notification.message && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          <span>{notification.message}</span>
        </div>
      )}
      <div className="relative max-w-4xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar user={profile} handleLogout={handleLogout} />
        
        {/* ── Profile Info Form ─────────────────────────────────────────────── */}
        <section className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <img
                src={profile.profilePic || `https://placehold.co/120x120/E0E7FF/4F46E5?text=${profile.fullName.charAt(0)}`}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
              />
              <div className="flex-grow text-center sm:text-left">
                <h2 className="text-3xl font-bold text-gray-800">{profile.fullName}</h2>
                <p className="text-gray-500">{profile.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
              {/* Profile Picture URL */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Profile Picture URL
                  </label>
                  <div className="flex items-center gap-2">
                    {isPicValid && picRaw ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Filled
                      </span>
                    ) : !isPicValid ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Invalid URL (https://...)
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || "Faculty")}&background=0284c7&color=fff&bold=true`;
                        setProfile((prev) => ({ ...prev, profilePic: avatarUrl }));
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>⚡</span> Use SRM Avatar
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  name="profilePic"
                  value={profile.profilePic || ""}
                  onChange={handleChange}
                  onBlur={() => {
                    if (profile.profilePic?.trim() && !/^https?:\/\//i.test(profile.profilePic.trim())) {
                      setProfile((p) => ({ ...p, profilePic: `https://${p.profilePic.trim()}` }));
                    }
                  }}
                  placeholder="https://ui-avatars.com/api/?name=Faculty... or click 'Use SRM Avatar'"
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                />
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Department / Branch</label>
                <input
                  type="text"
                  name="department"
                  value={profile.department || ""}
                  onChange={handleChange}
                  placeholder="e.g. Dept of ECE, Dept of CSE"
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                />
              </div>

              {/* Years of Experience */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  name="experience"
                  value={profile.experience || ""}
                  onChange={handleChange}
                  placeholder="e.g. 8"
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                />
              </div>

              {/* Skills */}
              <div className="md:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Skills &amp; Domains (comma-separated)</label>
                <input
                  type="text"
                  name="skills"
                  value={profile.skills || ""}
                  onChange={handleChange}
                  placeholder="e.g. Embedded Systems, VLSI, Machine Learning, Signal Processing"
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                />
              </div>

              {/* LinkedIn & GitHub */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-[#0A66C2]">💼</span> LinkedIn Profile URL
                    </label>
                    <div className="flex items-center gap-1.5">
                      {isLinkedinValid && linkedinRaw ? (
                        <>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Valid
                          </span>
                          <a
                            href={normalizeUrl(profile.linkedinUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#0A66C2] hover:underline font-bold flex items-center gap-1"
                          >
                            Preview <ExternalLink size={10} />
                          </a>
                        </>
                      ) : !isLinkedinValid ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          Must be https://www.linkedin.com/in/username
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <input
                    type="url"
                    name="linkedinUrl"
                    value={profile.linkedinUrl || ""}
                    placeholder="https://www.linkedin.com/in/username"
                    onChange={handleChange}
                    onBlur={() => {
                      if (profile.linkedinUrl?.trim() && !/^https?:\/\//i.test(profile.linkedinUrl.trim())) {
                        setProfile((p) => ({ ...p, linkedinUrl: `https://${p.linkedinUrl.trim()}` }));
                      }
                    }}
                    className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-slate-900">🐙</span> GitHub Profile URL
                    </label>
                    <div className="flex items-center gap-1.5">
                      {isGithubValid && githubRaw ? (
                        <>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Valid
                          </span>
                          <a
                            href={normalizeUrl(profile.githubUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-slate-900 hover:underline font-bold flex items-center gap-1"
                          >
                            Preview <ExternalLink size={10} />
                          </a>
                        </>
                      ) : !isGithubValid ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          Must be https://github.com/username
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <input
                    type="url"
                    name="githubUrl"
                    value={profile.githubUrl || ""}
                    placeholder="https://github.com/username"
                    onChange={handleChange}
                    onBlur={() => {
                      if (profile.githubUrl?.trim() && !/^https?:\/\//i.test(profile.githubUrl.trim())) {
                        setProfile((p) => ({ ...p, githubUrl: `https://${p.githubUrl.trim()}` }));
                      }
                    }}
                    className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                  />
                </div>
              </div>

              {/* Resume / CV URL */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>📄</span> Resume / CV URL
                  </label>
                  <div className="flex items-center gap-1.5">
                    {isResumeValid && resumeRaw ? (
                      <>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Valid
                        </span>
                        <a
                          href={normalizeUrl(profile.resumeUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-cyan-700 hover:underline font-bold flex items-center gap-1"
                        >
                          Preview <ExternalLink size={10} />
                        </a>
                      </>
                    ) : !isResumeValid ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Invalid URL (must start with https://)
                      </span>
                    ) : null}
                  </div>
                </div>
                <input
                  type="text"
                  name="resumeUrl"
                  value={profile.resumeUrl || ""}
                  onChange={handleChange}
                  onBlur={() => {
                    if (profile.resumeUrl?.trim() && !/^https?:\/\//i.test(profile.resumeUrl.trim())) {
                      setProfile((p) => ({ ...p, resumeUrl: `https://${p.resumeUrl.trim()}` }));
                    }
                  }}
                  placeholder="https://drive.google.com/... or institutional CV link"
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                />
              </div>

              {/* Bio & Research */}
              <div className="md:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Description / Bio</label>
                <textarea
                  name="description"
                  value={profile.description || ""}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Brief biography, interests, and academic background..."
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Past Research &amp; Publications</label>
                <textarea
                  name="researchPast"
                  value={profile.researchPast || ""}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Key research areas, publications, funded projects..."
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-cyan-600 transition text-sm font-medium"
                />
              </div>
            </div>

            {/* ── Format Issues Checklist Banner ────────────────────────────── */}
            {formatIssues.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>Cannot save changes: Please fix the following format issues:</span>
                </div>
                <div className="flex flex-col gap-1.5 pl-4 sm:pl-6">
                  {formatIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 font-semibold text-amber-900 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0"></span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={!isAllFieldsValid || saving}
                className={`w-full md:w-auto flex items-center justify-center gap-2 py-3 px-6 font-semibold rounded-lg shadow-md transition-all ${
                  !isAllFieldsValid || saving
                    ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                    : "bg-cyan-600 hover:bg-cyan-700 text-white transform hover:scale-105 cursor-pointer"
                }`}
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ── Change / Forgot Password Section ──────────────────────────────── */}
        <section className="mt-6 bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          {!forgotMode ? (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Change Password</h3>
                    <p className="text-xs text-slate-500 font-medium">Update your account password. You'll need your current password to confirm.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                {/* Current Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Current Password</label>
                    <button
                      type="button"
                      onClick={() => handleToggleForgot(true)}
                      className="text-xs font-bold text-cyan-600 hover:text-cyan-800 hover:underline transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      required
                      className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                    />
                    <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">New Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showNew ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      minLength={6}
                      required
                      className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                    />
                    <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Confirm New Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      minLength={6}
                      required
                      className={`w-full pl-4 pr-11 py-2.5 text-slate-900 bg-slate-50 border-2 rounded-xl focus:outline-none transition text-sm font-medium ${
                        pwMismatch ? "border-red-400 focus:border-red-500" :
                        pwMatch ? "border-emerald-400 focus:border-emerald-500" :
                        "border-slate-300 focus:border-black"
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwMismatch && <p className="mt-1.5 text-[11px] font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</p>}
                  {pwMatch && <p className="mt-1.5 text-[11px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Passwords match</p>}
                </div>

                <button
                  type="submit"
                  disabled={pwSaving || pwMismatch || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                  className="flex items-center gap-2 py-2.5 px-6 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {pwSaving ? <><Loader className="animate-spin w-4 h-4" /> Updating...</> : <><KeyRound className="w-4 h-4" /> Update Password</>}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Forgot Password</h3>
                    <p className="text-xs text-slate-500 font-medium">Verify via OTP sent to your registered email to set a new password.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleForgot(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-500 px-3 py-1.5 rounded-lg transition"
                >
                  Back to Change Password
                </button>
              </div>

              {forgotStep === 1 ? (
                <div className="max-w-lg space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700 flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Email</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{profile.email}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    We will send a 6-digit verification OTP code to your official email above.
                  </p>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={forgotLoading}
                    className="flex items-center gap-2 py-2.5 px-6 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {forgotLoading ? (
                      <><Loader className="animate-spin w-4 h-4" /> Sending OTP...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Verification OTP</>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetWithOtp} className="space-y-4 max-w-lg">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>OTP sent to <span className="font-bold">{profile.email}</span></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={resendCooldown > 0 || forgotLoading}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed ml-2 flex-shrink-0"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>

                  {/* OTP Input */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">6-Digit OTP</label>
                    <div className="relative mt-1.5">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        className="w-full pl-4 pr-4 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-bold tracking-widest"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">Check your SRM email inbox for the 6-digit verification code.</p>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">New Password</label>
                    <div className="relative mt-1.5">
                      <input
                        type={showForgotNew ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={forgotNewPass}
                        onChange={(e) => setForgotNewPass(e.target.value)}
                        minLength={6}
                        required
                        className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                      />
                      <button type="button" onClick={() => setShowForgotNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
                        {showForgotNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Confirm New Password</label>
                    <div className="relative mt-1.5">
                      <input
                        type={showForgotConfirm ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={forgotConfirmPass}
                        onChange={(e) => setForgotConfirmPass(e.target.value)}
                        minLength={6}
                        required
                        className={`w-full pl-4 pr-11 py-2.5 text-slate-900 bg-slate-50 border-2 rounded-xl focus:outline-none transition text-sm font-medium ${
                          forgotMismatch ? "border-red-400 focus:border-red-500" :
                          forgotMatch ? "border-emerald-400 focus:border-emerald-500" :
                          "border-slate-300 focus:border-black"
                        }`}
                      />
                      <button type="button" onClick={() => setShowForgotConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
                        {showForgotConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {forgotMismatch && <p className="mt-1.5 text-[11px] font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</p>}
                    {forgotMatch && <p className="mt-1.5 text-[11px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Passwords match</p>}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={forgotLoading || forgotMismatch || forgotOtp.length !== 6 || !forgotNewPass || !forgotConfirmPass}
                      className="flex items-center gap-2 py-2.5 px-6 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {forgotLoading ? <><Loader className="animate-spin w-4 h-4" /> Resetting...</> : <><KeyRound className="w-4 h-4" /> Reset Password</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleForgot(false)}
                      className="py-2.5 px-4 text-slate-600 hover:text-slate-900 font-semibold text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
