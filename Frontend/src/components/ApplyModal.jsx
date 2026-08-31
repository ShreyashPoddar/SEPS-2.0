import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  X,
  Users,
  Search,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Briefcase,
  GraduationCap,
  Sparkles,
  Info,
  UserCheck,
  Trash2,
  Filter
} from "lucide-react";
import { searchStudents, applyToProject } from "../api";

// Debounce helper
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function ApplyModal({ project, currentUser, onClose, onApplySuccess }) {
  // Leader info
  const leader = currentUser || {
    fullName: "You (Team Leader)",
    regNo: "RA2111003010123",
    department: "Dept of ECE",
    internshipStatus: "regular",
    skills: ["Embedded Systems", "IoT"],
  };

  const leaderDept = leader.department || "Dept of ECE";
  const leaderCohort = leader.internshipStatus || "regular"; // 'regular' | 'internship'

  // Teammates state (2 slots for a 3-member team)
  const [teammates, setTeammates] = useState([
    { slot: 1, student: null, query: "" },
    { slot: 2, student: null, query: "" },
  ]);

  // Search states for each slot
  const [activeSlot, setActiveSlot] = useState(null);
  const [searchResults, setSearchResults] = useState({ 1: [], 2: [] });
  const [isSearching, setIsSearching] = useState({ 1: false, 2: false });
  const [filterMatchingCohortOnly, setFilterMatchingCohortOnly] = useState(true);
  const [acknowledgedCrossBranch, setAcknowledgedCrossBranch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced queries
  const debouncedQuery1 = useDebounce(teammates[0].query, 250);
  const debouncedQuery2 = useDebounce(teammates[1].query, 250);

  // Perform search for slot 1
  useEffect(() => {
    if (!debouncedQuery1 || debouncedQuery1.trim().length < 2) {
      setSearchResults((prev) => ({ ...prev, 1: [] }));
      return;
    }
    setIsSearching((prev) => ({ ...prev, 1: true }));
    searchStudents(debouncedQuery1.trim())
      .then((res) => {
        let list = res.data || [];
        // Filter out leader
        list = list.filter((s) => s.regNo?.toLowerCase() !== leader.regNo?.toLowerCase());
        // Filter out slot 2 if selected
        if (teammates[1].student) {
          list = list.filter((s) => s.regNo !== teammates[1].student.regNo);
        }
        // Cohort filter if checked
        if (filterMatchingCohortOnly) {
          list = list.filter((s) => (s.internshipStatus || "regular") === leaderCohort);
        }
        setSearchResults((prev) => ({ ...prev, 1: list }));
      })
      .catch(() => toast.error("Student search failed"))
      .finally(() => setIsSearching((prev) => ({ ...prev, 1: false })));
  }, [debouncedQuery1, filterMatchingCohortOnly, leader.regNo, leaderCohort, teammates]);

  // Perform search for slot 2
  useEffect(() => {
    if (!debouncedQuery2 || debouncedQuery2.trim().length < 2) {
      setSearchResults((prev) => ({ ...prev, 2: [] }));
      return;
    }
    setIsSearching((prev) => ({ ...prev, 2: true }));
    searchStudents(debouncedQuery2.trim())
      .then((res) => {
        let list = res.data || [];
        // Filter out leader
        list = list.filter((s) => s.regNo?.toLowerCase() !== leader.regNo?.toLowerCase());
        // Filter out slot 1 if selected
        if (teammates[0].student) {
          list = list.filter((s) => s.regNo !== teammates[0].student.regNo);
        }
        // Cohort filter if checked
        if (filterMatchingCohortOnly) {
          list = list.filter((s) => (s.internshipStatus || "regular") === leaderCohort);
        }
        setSearchResults((prev) => ({ ...prev, 2: list }));
      })
      .catch(() => toast.error("Student search failed"))
      .finally(() => setIsSearching((prev) => ({ ...prev, 2: false })));
  }, [debouncedQuery2, filterMatchingCohortOnly, leader.regNo, leaderCohort, teammates]);

  const handleSelectStudent = (slotNumber, student) => {
    setTeammates((prev) =>
      prev.map((t) =>
        t.slot === slotNumber
          ? { ...t, student, query: student.fullName }
          : t
      )
    );
    setActiveSlot(null);
  };

  const handleRemoveStudent = (slotNumber) => {
    setTeammates((prev) =>
      prev.map((t) =>
        t.slot === slotNumber ? { ...t, student: null, query: "" } : t
      )
    );
  };

  // Cross-branch analysis
  const crossBranchInfo = useMemo(() => {
    const differingMembers = [];
    teammates.forEach((t) => {
      if (t.student && t.student.department && t.student.department !== leaderDept) {
        differingMembers.push({
          slot: t.slot,
          name: t.student.fullName,
          regNo: t.student.regNo,
          dept: t.student.department,
        });
      }
    });
    return {
      hasCrossBranch: differingMembers.length > 0,
      differingMembers,
    };
  }, [teammates, leaderDept]);

  // Internship cohort analysis
  const cohortConflictInfo = useMemo(() => {
    const conflictingMembers = [];
    teammates.forEach((t) => {
      if (t.student) {
        const memberTrack = t.student.internshipStatus || "regular";
        if (memberTrack !== leaderCohort) {
          conflictingMembers.push({
            slot: t.slot,
            name: t.student.fullName,
            regNo: t.student.regNo,
            track: memberTrack,
            company: t.student.internshipCompany,
          });
        }
      }
    });
    return {
      hasConflict: conflictingMembers.length > 0,
      conflictingMembers,
    };
  }, [teammates, leaderCohort]);

  // Form validity
  const isFormComplete = Boolean(teammates[0].student && teammates[1].student);
  const canSubmit =
    isFormComplete &&
    !cohortConflictInfo.hasConflict &&
    (!crossBranchInfo.hasCrossBranch || acknowledgedCrossBranch) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!isFormComplete) {
      toast.error("Please add both teammates to form a 3-member team.");
      return;
    }

    if (cohortConflictInfo.hasConflict) {
      toast.error(
        "Cannot submit! All team members must belong to the exact same internship cohort track."
      );
      return;
    }

    if (crossBranchInfo.hasCrossBranch && !acknowledgedCrossBranch) {
      toast.error(
        "Please acknowledge the cross-branch capstone registration warning."
      );
      return;
    }

    setIsSubmitting(true);

    const applicationPayload = {
      projectId: project._id,
      applicationType: "group",
      cohortTrack: leaderCohort,
      hasCrossBranch: crossBranchInfo.hasCrossBranch,
      members: [
        {
          studentId: leader._id || "leader_id",
          name: leader.fullName,
          regNo: leader.regNo,
          department: leaderDept,
          internshipStatus: leaderCohort,
          status: "approved",
        },
        ...teammates.map((t) => ({
          studentId: t.student._id,
          name: t.student.fullName,
          regNo: t.student.regNo,
          department: t.student.department || "Dept of ECE",
          internshipStatus: t.student.internshipStatus || "regular",
          status: "pending",
        })),
      ],
    };

    try {
      const res = await applyToProject(applicationPayload);
      toast.success(res.data?.message || "Application submitted successfully!");
      if (onApplySuccess) onApplySuccess(project._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit project application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl border-2 border-slate-900 shadow-2xl overflow-hidden my-8"
      >
        {/* Top Header Banner */}
        <div className="bg-slate-950 text-white p-6 sm:p-7 border-b-2 border-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-400 text-slate-950">
                  Team Capstone Application
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  3-Member Registered Cohort
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                {project.projectTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-3">
                <span>Faculty Guide: <strong>{project.facultyName}</strong></span>
                <span>•</span>
                <span>Domain: <strong>{project.domain}</strong></span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-slate-900">
          {/* 1. Host Leader Card & Cohort Track Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {leader.fullName?.charAt(0) || "L"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-950 text-base">
                      {leader.fullName}
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-900 text-white rounded-full uppercase">
                      Group Leader
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Reg No: <span className="font-mono font-bold text-slate-900">{leader.regNo}</span> • {leaderDept}
                  </p>
                </div>
              </div>

              {/* Host Cohort Track Pill */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {leaderCohort === "internship" ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-sm">
                    <Briefcase className="w-4 h-4 text-amber-700" />
                    <span>💼 Corporate Internship Track</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold shadow-sm">
                    <GraduationCap className="w-4 h-4 text-blue-700" />
                    <span>🎓 Regular On-Campus Track</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ⚡ FEATURE 2: STRICT INTERNSHIP COHORT RESTRICTION BANNER */}
          <AnimatePresence>
            {cohortConflictInfo.hasConflict && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="p-4 rounded-2xl bg-red-50 border-2 border-red-500 shadow-md flex items-start gap-3.5"
              >
                <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1 text-xs sm:text-sm text-red-950">
                  <h4 className="font-black text-red-700 uppercase tracking-wide flex items-center gap-2">
                    <span>Cohort Conflict Restriction</span>
                    <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-[10px] font-extrabold">
                      Submission Blocked
                    </span>
                  </h4>
                  <p className="mt-1 font-medium leading-relaxed">
                    Students doing a <strong>Corporate Internship</strong> and <strong>Regular On-Campus</strong> students must form completely separate project teams.
                  </p>
                  <ul className="mt-2 space-y-1 list-disc list-inside font-semibold text-red-800">
                    {cohortConflictInfo.conflictingMembers.map((m, idx) => (
                      <li key={idx}>
                        <strong>{m.name} ({m.regNo})</strong> is on the{" "}
                        <span className="underline uppercase">{m.track === "internship" ? "Corporate Internship Track" : "Regular On-Campus Track"}</span>
                        {m.company ? ` at ${m.company}` : ""}, which conflicts with your{" "}
                        <strong>{leaderCohort === "internship" ? "Internship" : "Regular"}</strong> cohort.
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-red-600 italic">
                    Please replace the highlighted teammate with a peer registered under the <strong>{leaderCohort === "internship" ? "Corporate Internship Track" : "Regular On-Campus Track"}</strong>.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ⚡ FEATURE 1: CROSS-BRANCH REGISTRATION WARNING WIDGET */}
          <AnimatePresence>
            {crossBranchInfo.hasCrossBranch && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-md space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-black" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm text-slate-900">
                    <h4 className="font-black text-amber-900 uppercase tracking-wide flex items-center gap-2">
                      <span>Inter-Disciplinary Team Notice</span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-extrabold">
                        Cross-Branch Detected
                      </span>
                    </h4>
                    <p className="mt-1 text-slate-700 font-medium leading-relaxed">
                      You are adding a teammate from a different academic department. Cross-branch collaborations require mutual departmental guide validation.
                    </p>

                    {/* Branch comparison pills */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Host: {leaderDept}
                      </span>
                      <span className="text-slate-400 font-bold">↔</span>
                      {crossBranchInfo.differingMembers.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-amber-200 border border-amber-400 text-amber-950 font-bold text-xs flex items-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-700" /> {m.name}: {m.dept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mandatory Acknowledgment Checkbox */}
                <label className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 cursor-pointer select-none hover:bg-amber-100 transition">
                  <input
                    type="checkbox"
                    checked={acknowledgedCrossBranch}
                    onChange={(e) => setAcknowledgedCrossBranch(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-slate-950 focus:ring-slate-900 border-slate-400 accent-black cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    I acknowledge that my team consists of students across different branches ({crossBranchInfo.differingMembers.map(m => m.dept).join(", ")}) and satisfies inter-disciplinary capstone requisites.
                  </span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. Teammate Selection Slots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-900" />
                  <span>Select 2 Teammates</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Search by student register number or full name.
                </p>
              </div>

              {/* Cohort Filter Toggle */}
              <button
                type="button"
                onClick={() => setFilterMatchingCohortOnly(!filterMatchingCohortOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                  filterMatchingCohortOnly
                    ? "bg-slate-900 text-white border-black"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>
                  {filterMatchingCohortOnly ? "Matching Cohort Only" : "Showing All Tracks"}
                </span>
              </button>
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teammates.map((item, index) => {
                const slotNum = item.slot;
                const student = item.student;
                const isConflicting = student && (student.internshipStatus || "regular") !== leaderCohort;
                const isCrossBranch = student && student.department && student.department !== leaderDept;

                return (
                  <div
                    key={slotNum}
                    className={`relative p-5 rounded-2xl border-2 transition-all ${
                      isConflicting
                        ? "bg-red-50/50 border-red-400 shadow-sm"
                        : student
                        ? isCrossBranch
                          ? "bg-amber-50/40 border-amber-400 shadow-sm"
                          : "bg-emerald-50/40 border-emerald-400 shadow-sm"
                        : "bg-white border-slate-300 shadow-sm hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Teammate Slot {slotNum}
                      </span>
                      {student && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(slotNum)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remove teammate"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {student ? (
                      /* Selected Student Card */
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                            {student.fullName?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-950 text-sm">
                              {student.fullName}
                            </h4>
                            <p className="text-xs font-mono font-semibold text-slate-600">
                              {student.regNo}
                            </p>
                          </div>
                        </div>

                        {/* Badges for Branch & Cohort */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                              isCrossBranch
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-slate-100 text-slate-800 border-slate-300"
                            }`}
                          >
                            {student.department || "Dept of ECE"}
                            {isCrossBranch && " • Cross-Branch"}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                              isConflicting
                                ? "bg-red-100 text-red-900 border-red-400 animate-pulse"
                                : student.internshipStatus === "internship"
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-blue-100 text-blue-900 border-blue-300"
                            }`}
                          >
                            {student.internshipStatus === "internship" ? "💼 Internship Track" : "🎓 Regular Campus"}
                          </span>

                          {student.cgpa && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              CGPA: {student.cgpa}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Live Search Input & Dropdown */
                      <div className="relative">
                        <div className="relative flex items-center">
                          <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Type Reg. No (e.g. RA21110030...)"
                            value={item.query}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTeammates((prev) =>
                                prev.map((t) =>
                                  t.slot === slotNum ? { ...t, query: val } : t
                                )
                              );
                              setActiveSlot(slotNum);
                            }}
                            onFocus={() => setActiveSlot(slotNum)}
                            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-950 focus:bg-white transition"
                          />
                          {isSearching[slotNum] && (
                            <Loader2 className="absolute right-3 w-4 h-4 animate-spin text-slate-500" />
                          )}
                        </div>

                        {/* Search Dropdown */}
                        {activeSlot === slotNum && item.query.length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-900 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto p-1.5 space-y-1">
                            {searchResults[slotNum].length === 0 && !isSearching[slotNum] && (
                              <div className="p-3 text-center text-xs text-slate-500 font-medium">
                                No eligible students found.
                              </div>
                            )}

                            {searchResults[slotNum].map((cand) => {
                              const candTrack = cand.internshipStatus || "regular";
                              const candConflict = candTrack !== leaderCohort;
                              const candCross = cand.department && cand.department !== leaderDept;

                              return (
                                <div
                                  key={cand._id}
                                  onClick={() => handleSelectStudent(slotNum, cand)}
                                  className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between text-left ${
                                    candConflict
                                      ? "hover:bg-red-50 bg-red-50/30"
                                      : "hover:bg-slate-100"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-xs text-slate-950">
                                        {cand.fullName}
                                      </p>
                                      {candCross && (
                                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                          {cand.department}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] font-mono text-slate-500">
                                      {cand.regNo}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                        candConflict
                                          ? "bg-red-100 text-red-800 border border-red-300"
                                          : candTrack === "internship"
                                          ? "bg-amber-100 text-amber-900"
                                          : "bg-blue-100 text-blue-900"
                                      }`}
                                    >
                                      {candTrack === "internship" ? "💼 Internship" : "🎓 Regular"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission Info Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-800 shrink-0" />
              <span>
                Team size: <strong>3 members total</strong> (1 Leader + 2 Teammates). Application invites will be dispatched to all teammates upon submission.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-100 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border-2 border-slate-900 text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-200 transition"
          >
            Cancel
          </button>

          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.03 } : {}}
            whileTap={canSubmit ? { scale: 0.97 } : {}}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm border-2 border-slate-900 shadow-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Application...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Confirm & Submit Team Proposal</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
