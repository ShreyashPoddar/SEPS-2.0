import React, { useEffect, useState } from "react";
import { getCurrentUser, updateProfile, logoutUser, isStudentProfileComplete } from "../api";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader, Save, AlertCircle, CheckCircle, ExternalLink, ArrowRight, Phone } from 'lucide-react';
import Navbar from "../components/Navbar";
import { getStudentDisplayDepartment } from "../utils/departmentUtils";

export default function StudentProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });



  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data.role !== "student") {
          navigate("/teacher-dashboard");
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
  const CGPA_FORMAT_REGEX = /^(?:10(?:\.0{1,2})?|[0-9](?:\.[0-9]{1,2})?)$/;
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

  // 1. CGPA: 0.01 to 10.00, max 2 decimals
  const cgpaRaw = profile?.cgpa !== null && profile?.cgpa !== undefined ? String(profile.cgpa).trim() : "";
  const cgpaNum = Number(cgpaRaw);
  const isCgpaEmpty = !cgpaRaw;
  const isCgpaValid = Boolean(
    !isCgpaEmpty &&
    !isNaN(cgpaNum) &&
    cgpaNum >= 0.01 &&
    cgpaNum <= 10.00 &&
    CGPA_FORMAT_REGEX.test(cgpaRaw)
  );

  // 1b. Phone Number: 10 to 14 digits, optional + or country code
  const phoneRaw = (profile?.phoneNumber || "").trim();
  const cleanPhoneDigits = phoneRaw.replace(/\D/g, "");
  const isPhoneEmpty = !phoneRaw;
  const isPhoneValid = Boolean(
    !isPhoneEmpty &&
    cleanPhoneDigits.length >= 10 &&
    cleanPhoneDigits.length <= 14 &&
    /^[+]?[\d\s\-()]+$/.test(phoneRaw)
  );

  // 2. Department: Selected from valid SRM branches
  const isDeptValid = Boolean(profile?.department && profile?.department.trim().length > 0);

  // 3. Profile Picture: Must be valid HTTP/HTTPS URL
  const picRaw = (profile?.profilePic || "").trim();
  const isPicEmpty = !picRaw;
  const isPicValid = Boolean(!isPicEmpty && isValidHttpUrl(picRaw));

  // 4. LinkedIn: Must match https://linkedin.com/in/username
  const linkedinRaw = (profile?.linkedinUrl || "").trim();
  const isLinkedinEmpty = !linkedinRaw;
  const isLinkedinValid = Boolean(!isLinkedinEmpty && LINKEDIN_FORMAT_REGEX.test(linkedinRaw));

  // 5. GitHub: Must match https://github.com/username
  const githubRaw = (profile?.githubUrl || "").trim();
  const isGithubEmpty = !githubRaw;
  const isGithubValid = Boolean(!isGithubEmpty && GITHUB_FORMAT_REGEX.test(githubRaw));

  // 6. Resume / Portfolio: Must be valid HTTP/HTTPS URL
  const resumeRaw = (profile?.resumeUrl || "").trim();
  const isResumeEmpty = !resumeRaw;
  const isResumeValid = Boolean(!isResumeEmpty && isValidHttpUrl(resumeRaw));

  // 7. Major Project Track & Internship Experience
  const isCorporate = profile?.internshipStatus === "internship";
  const companyRaw = (profile?.internshipCompany || "").trim();
  const durationRaw = (profile?.internshipDuration || "").trim();
  const isCompanyValid = isCorporate ? companyRaw.length >= 2 : true;
  const isDurationValid = isCorporate ? durationRaw.length >= 2 : true;
  const isInternshipValid = isCorporate ? (isCompanyValid && isDurationValid) : true;

  // Complete validity check
  const isAllFieldsFilled = Boolean(
    isCgpaValid &&
    isDeptValid &&
    isPhoneValid &&
    isPicValid &&
    isLinkedinValid &&
    isGithubValid &&
    isResumeValid &&
    isInternshipValid
  );

  // Detailed Missing or Format Issues List
  const formatIssues = [];
  if (isCgpaEmpty) {
    formatIssues.push("CGPA: Required (enter valid CGPA from 0.01 to 10.00)");
  } else if (!isCgpaValid) {
    formatIssues.push("CGPA: Invalid format (must be between 0.01 and 10.00 with max 2 decimals, e.g. 9.92)");
  }

  if (isPhoneEmpty) {
    formatIssues.push("Phone Number: Required (enter valid 10-digit mobile number)");
  } else if (!isPhoneValid) {
    formatIssues.push("Phone Number: Invalid format (must be a valid 10-digit contact number, e.g. 9876543210 or +91 9876543210)");
  }

  if (!isDeptValid) {
    formatIssues.push("Department / Branch: Please select your SRM department");
  }

  if (isPicEmpty) {
    formatIssues.push("Profile Picture: URL is required (or click 'Use SRM Avatar')");
  } else if (!isPicValid) {
    formatIssues.push("Profile Picture: Must be a valid web URL starting with https://");
  }

  if (isLinkedinEmpty) {
    formatIssues.push("LinkedIn Profile: Required (e.g. https://www.linkedin.com/in/username)");
  } else if (!isLinkedinValid) {
    formatIssues.push("LinkedIn Profile: Must follow proper format: https://www.linkedin.com/in/username");
  }

  if (isGithubEmpty) {
    formatIssues.push("GitHub Profile: Required (e.g. https://github.com/username)");
  } else if (!isGithubValid) {
    formatIssues.push("GitHub Profile: Must follow proper format: https://github.com/username");
  }

  if (isResumeEmpty) {
    formatIssues.push("Resume / Portfolio: URL is required (e.g. Google Drive link or portfolio URL)");
  } else if (!isResumeValid) {
    formatIssues.push("Resume / Portfolio: Must be a valid web URL starting with https://");
  }

  if (isCorporate) {
    if (!companyRaw) formatIssues.push("Internship: Company name is required");
    else if (!isCompanyValid) formatIssues.push("Internship: Company name must be at least 2 characters");
    if (!durationRaw) formatIssues.push("Internship: Duration is required (e.g. 6 Months)");
    else if (!isDurationValid) formatIssues.push("Internship: Duration must be at least 2 characters");
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isAllFieldsFilled) {
      showNotification(`Cannot proceed: Please correct the following format requirements:\n• ${formatIssues.join("\n• ")}`, "error");
      return;
    }

    setSaving(true);
    // Exclude institutional read-only fields so students cannot modify them
    // eslint-disable-next-line no-unused-vars
    const {
      role,
      department,
      section,
      sectionId,
      sectionName,
      facultyAdvisor,
      facultyAdvisorId,
      departmentRel,
      departmentId,
      ...profileData
    } = profile;

    // Normalize URLs to canonical https:// format
    const normalizedData = {
      ...profileData,
      phoneNumber: (profile.phoneNumber || "").trim(),
      cgpa: parseFloat(Number(profile.cgpa).toFixed(2)),
      profilePic: normalizeUrl(profile.profilePic),
      linkedinUrl: normalizeUrl(profile.linkedinUrl),
      githubUrl: normalizeUrl(profile.githubUrl),
      resumeUrl: normalizeUrl(profile.resumeUrl),
      isProfileComplete: true,
    };

    updateProfile(normalizedData)
      .then(() => {
        showNotification("Profile successfully saved in database! Proceeding to dashboard...", "success");
        setProfile((prev) => ({ ...prev, ...normalizedData, isProfileComplete: true }));
        setTimeout(() => {
          navigate("/student-dashboard");
        }, 1200);
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

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader className="w-10 h-10 text-cyan-600 animate-spin" />
      </div>
    );
  }

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

        {/* ── Mandatory Profile Completion Alert Banner ─────────────────────── */}
        {!isStudentProfileComplete(profile) && (
          <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-md flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                <span>Action Required: Complete Your Student Profile</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">Mandatory</span>
              </h3>
              <p className="text-xs font-medium text-amber-800 mt-1 leading-relaxed">
                Before accessing the Major Project Dashboard, all required profile details below must be completely filled and saved to the database. The <strong>"Save &amp; Proceed to Dashboard"</strong> button will activate once all fields are complete.
              </p>
            </div>
          </div>
        )}
        
        {/* ── Profile Info Form ─────────────────────────────────────────────── */}
        <section className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <img
                src={profile.profilePic || `https://placehold.co/120x120/E0E7FF/4F46E5?text=${profile.fullName ? profile.fullName.charAt(0) : "S"}`}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-slate-100"
              />
              <div className="flex-grow text-center sm:text-left">
                <h2 className="text-3xl font-bold text-gray-800">{profile.fullName}</h2>
                <p className="text-gray-500">{profile.email || "Institutional email pending"}</p>
                <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Reg No: {profile.regNo || "Not set"}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center gap-1">
                    <span>🏛️</span> Section {profile.section?.name || profile.sectionName || "A"}
                  </span>
                  {isStudentProfileComplete(profile) ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Profile Completed
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Incomplete Profile
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Institutional Mentorship Allocations (RDBMS Relations) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-2 border-blue-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                  👨‍🏫
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-black text-blue-900 tracking-wider">Faculty Advisor</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-200 text-blue-950">Sec {profile.section?.name || profile.sectionName || "A"}</span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {profile.facultyAdvisor?.fullName || "Dr. M. K. Srilekha"}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium truncate">
                    {profile.facultyAdvisor?.email || "srilekhm@srmist.edu.in"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:border-l sm:border-blue-200 sm:pl-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                  🏛️
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-black text-indigo-900 tracking-wider">Department HOD</span>
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {profile.departmentRel?.hod?.fullName || "Dr. S. Ramesh Kumar"}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium truncate">
                    {profile.departmentRel?.hod?.email || "hodece@srmist.edu.in"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              {/* Registration Number */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Registration Number</label>
                <input type="text" name="regNo" value={profile.regNo || "Not set"} disabled className="w-full mt-1.5 px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-not-allowed" />
              </div>

              {/* CGPA */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    CGPA <span className="text-red-500 font-bold">*</span>
                  </label>
                  {isCgpaValid ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Valid
                    </span>
                  ) : !isCgpaEmpty ? (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                      Invalid (e.g. 9.92, max 10.00)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Required (0.01 - 10.00)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  name="cgpa"
                  value={profile.cgpa ?? ""}
                  min={0.01}
                  max={10}
                  step={0.01}
                  placeholder="e.g. 9.92"
                  required
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition font-semibold text-sm"
                />
              </div>

              {/* Phone Number */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-700" />
                    <span>Phone Number</span> <span className="text-red-500 font-bold">*</span>
                  </label>
                  {isPhoneValid ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Valid
                    </span>
                  ) : !isPhoneEmpty ? (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                      10 digits required
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Required
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={profile.phoneNumber ?? ""}
                  placeholder="e.g. 9876543210 or +91 9876543210"
                  required
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition font-semibold text-sm"
                />
              </div>

              {/* Department & Specialization (Official Institutional Allocation - Locked) */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>Official Department &amp; Academic Specialization</span>
                    <span className="text-[10px] text-slate-500 font-semibold">(Institutional Allocation)</span>
                  </label>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-blue-600" /> Officially Verified
                  </span>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    name="department"
                    value={getStudentDisplayDepartment(profile)}
                    disabled
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-100 border-2 border-slate-300 rounded-xl text-slate-800 font-bold text-sm cursor-not-allowed select-none pr-32"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300">
                      Sec {profile.section?.name || profile.sectionName || "A"}
                    </span>
                    <span className="font-bold text-slate-600">🔒 Locked</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Your department, specialization, and section are centrally locked from official university records and cannot be self-modified.
                </p>
              </div>

              {/* Internship Experience & Major Project Track */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/40 border-2 border-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <span>🏢</span> Major Project Track &amp; Internship Status <span className="text-red-500 font-bold">*</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Select whether you are working on an on-campus major project or enrolled in a corporate internship.
                    </p>
                  </div>
                </div>

                {/* Track Selector Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setProfile((prev) => ({ ...prev, internshipStatus: "regular" }))}
                    className={`p-3.5 rounded-xl border-2 text-left transition flex items-center gap-3 cursor-pointer ${
                      profile.internshipStatus !== "internship"
                        ? "border-blue-600 bg-blue-50/90 text-blue-950 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-medium"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base ${
                      profile.internshipStatus !== "internship" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      🎓
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <span>Regular On-Campus Track</span>
                        {profile.internshipStatus !== "internship" && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">Standard project on campus (No corporate company required)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfile((prev) => ({ ...prev, internshipStatus: "internship" }))}
                    className={`p-3.5 rounded-xl border-2 text-left transition flex items-center gap-3 cursor-pointer ${
                      profile.internshipStatus === "internship"
                        ? "border-amber-500 bg-amber-50/90 text-amber-950 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-medium"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base ${
                      profile.internshipStatus === "internship" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      💼
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <span>Corporate Internship Track</span>
                        {profile.internshipStatus === "internship" && <CheckCircle className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">Semester/6-month company internship (Requires company &amp; duration)</div>
                    </div>
                  </button>
                </div>

                {profile.internshipStatus === "internship" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-4 bg-white rounded-xl border border-amber-200 animate-in fade-in duration-200">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Company / Organization Name <span className="text-red-500 font-bold">*</span>
                        </label>
                        {isCompanyValid && companyRaw ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Filled
                          </span>
                        ) : companyRaw ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Min 2 characters
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Required
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        name="internshipCompany"
                        value={profile.internshipCompany || ""}
                        placeholder="e.g. Qualcomm, Amazon AWS, Bosch, ISRO"
                        onChange={handleChange}
                        className="w-full mt-1.5 px-4 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition font-semibold text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Internship Duration / Term <span className="text-red-500 font-bold">*</span>
                        </label>
                        {isDurationValid && durationRaw ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Filled
                          </span>
                        ) : durationRaw ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Min 2 characters
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Required
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        name="internshipDuration"
                        value={profile.internshipDuration || ""}
                        placeholder="e.g. 6 Months (Jan - Jun 2026), 3 Months"
                        onChange={handleChange}
                        className="w-full mt-1.5 px-4 py-2.5 text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition font-semibold text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Picture URL */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Profile Picture URL <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {isPicValid ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Filled
                      </span>
                    ) : !isPicEmpty ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Invalid URL (https://...)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Required
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || "Student")}&background=0284c7&color=fff&bold=true`;
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
                  placeholder="https://ui-avatars.com/api/?name=User... or click 'Use SRM Avatar'"
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                />
              </div>

              {/* LinkedIn & GitHub */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-[#0A66C2]">💼</span> LinkedIn Profile URL <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {isLinkedinValid ? (
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
                      ) : !isLinkedinEmpty ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          Must be https://www.linkedin.com/in/username
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Required
                        </span>
                      )}
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
                    className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-slate-900">🐙</span> GitHub Profile URL <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {isGithubValid ? (
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
                      ) : !isGithubEmpty ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          Must be https://github.com/username
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Required
                        </span>
                      )}
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
                    className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                  />
                </div>
              </div>

              {/* Resume URL */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>📄</span> Resume / Portfolio URL <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {isResumeValid ? (
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
                    ) : !isResumeEmpty ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Invalid URL (must start with https://)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Required
                      </span>
                    )}
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
                  placeholder="https://drive.google.com/... or portfolio / PDF link"
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                />
              </div>
            </div>

            {/* ── Missing / Invalid Fields Checklist Banner ────────────────── */}
            <div className="pt-2">
              {!isAllFieldsFilled ? (
                <div className="p-4 rounded-xl bg-amber-50/95 border-2 border-amber-300 text-amber-950 text-xs shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>Cannot proceed to dashboard: All fields must match their proper formats ({formatIssues.length} remaining):</span>
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
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs shadow-sm flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>All profile fields are completed and properly formatted! Click below to save to database and proceed to your dashboard.</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Submit Button ────────────────────────────────────────────── */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!isAllFieldsFilled || saving}
                title={!isAllFieldsFilled ? `Please correct formatting:\n• ${formatIssues.join("\n• ")}` : "Save and proceed to dashboard"}
                className={`w-full md:w-auto flex items-center justify-center gap-2.5 py-3.5 px-8 font-extrabold rounded-xl text-sm transition-all duration-200 ${
                  !isAllFieldsFilled || saving
                    ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/30 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" />
                    <span>Saving in database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {!isStudentProfileComplete(profile) ? (
                      <>
                        <span>Save &amp; Proceed to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        </section>


      </div>
    </div>
  );
}