import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  X,
  Ticket,
  UserCog,
  RefreshCw,
  UserMinus,
  Edit3,
  Search,
  Loader2,
  Building2,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  Send,
  FileCheck
} from "lucide-react";
import { searchStudents, raiseChangeTicket } from "../api";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function ChangeTicketModal({
  application,
  currentUser,
  onClose,
  onTicketSubmitted,
}) {
  const members = application?.members || [];
  const cohortTrack = application?.cohortTrack || currentUser?.internshipStatus || "regular";
  const leaderDept = currentUser?.department || "Dept of ECE";

  // Form states
  const [selectedMember, setSelectedMember] = useState(members[1] || members[0] || null);
  const [ticketType, setTicketType] = useState("name_correction"); // 'name_correction' | 'replacement' | 'withdrawal'
  
  // Correction fields
  const [correctedName, setCorrectedName] = useState(selectedMember?.name || "");
  const [correctedRegNo, setCorrectedRegNo] = useState(selectedMember?.regNo || "");

  // Replacement search fields
  const [replacementQuery, setReplacementQuery] = useState("");
  const [replacementStudent, setReplacementStudent] = useState(null);
  const [replacementResults, setReplacementResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reason / Justification
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedReplacementQuery = useDebounce(replacementQuery, 250);

  // Sync correction fields when selected member changes
  useEffect(() => {
    if (selectedMember) {
      setCorrectedName(selectedMember.name || "");
      setCorrectedRegNo(selectedMember.regNo || "");
    }
  }, [selectedMember]);

  // Search replacement students
  useEffect(() => {
    if (!debouncedReplacementQuery || debouncedReplacementQuery.trim().length < 2) {
      setReplacementResults([]);
      return;
    }
    setIsSearching(true);
    searchStudents(debouncedReplacementQuery.trim())
      .then((res) => {
        let list = res.data || [];
        // Filter out current members
        const currentRegNos = new Set(members.map((m) => m.regNo?.toLowerCase()));
        list = list.filter((s) => !currentRegNos.has(s.regNo?.toLowerCase()));
        setReplacementResults(list);
      })
      .catch(() => toast.error("Failed to search replacement students"))
      .finally(() => setIsSearching(false));
  }, [debouncedReplacementQuery, members]);

  // Validation
  const replacementCohortConflict =
    replacementStudent &&
    (replacementStudent.internshipStatus || "regular") !== cohortTrack;

  const replacementIsCrossBranch =
    replacementStudent &&
    replacementStudent.department &&
    replacementStudent.department !== leaderDept;

  const quickReasons = [
    "Spelling error in register number / name",
    "Student shifted to 6-Month Corporate Internship",
    "Branch transfer / Academic department realignment",
    "Medical exemption & team restructuring",
    "Mutual withdrawal agreed upon by team members",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMember) {
      toast.error("Please select a target team member to modify.");
      return;
    }

    if (ticketType === "name_correction") {
      if (!correctedName.trim() || !correctedRegNo.trim()) {
        toast.error("Please provide the corrected student name and registration number.");
        return;
      }
    } else if (ticketType === "replacement") {
      if (!replacementStudent) {
        toast.error("Please select a valid replacement student from the search list.");
        return;
      }
      if (replacementCohortConflict) {
        toast.error("Cohort mismatch! The replacement student must belong to the same internship track.");
        return;
      }
    }

    if (!reason.trim()) {
      toast.error("Please provide a brief justification for the department coordinator.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      // Entries carrying `teamId` are approved teams — the underlying
      // application is deleted on approval, so the ticket attaches to the team.
      ...(application.teamId
        ? { teamId: application.teamId }
        : { applicationId: application._id }),
      projectTitle: application.projectTitle || "Selected Project",
      facultyName: application.facultyName,
      targetMember: {
        studentId: selectedMember.studentId,
        name: selectedMember.name,
        regNo: selectedMember.regNo,
        department: selectedMember.department || "Dept of ECE",
      },
      changeType: ticketType,
      requestedChanges: {
        correctedName: ticketType === "name_correction" ? correctedName : undefined,
        correctedRegNo: ticketType === "name_correction" ? correctedRegNo : undefined,
        replacementStudent: ticketType === "replacement" ? replacementStudent : undefined,
      },
      reason: reason.trim(),
    };

    try {
      const res = await raiseChangeTicket(payload);
      toast.success(res.data?.message || "Change ticket filed successfully!");
      if (onTicketSubmitted) onTicketSubmitted(res.data?.ticket);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit ticket.");
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
        className="relative w-full max-w-2xl bg-white rounded-3xl border-2 border-slate-900 shadow-2xl overflow-hidden my-8"
      >
        {/* Top Header */}
        <div className="bg-slate-950 text-white p-6 border-b-2 border-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" /> Official Change Request
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Faculty & Coordinator Review
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Raise Team Modification Ticket
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Project: <strong>{application?.projectTitle || "Capstone Project"}</strong>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto text-slate-900">
          {/* 1. Target Member Selection */}
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-2">
              1. Select Team Member to Modify
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {members.map((m, idx) => {
                const isSelected = selectedMember?.regNo === m.regNo;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedMember(m)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-slate-950 text-white border-black shadow-md"
                        : "bg-slate-50 text-slate-900 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] font-extrabold uppercase ${isSelected ? "text-cyan-300" : "text-slate-500"}`}>
                        {idx === 0 ? "Leader" : `Member ${idx + 1}`}
                      </span>
                      <h4 className="font-bold text-xs truncate mt-0.5">
                        {m.name}
                      </h4>
                      <p className={`text-[11px] font-mono ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        {m.regNo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Change Category Tabs */}
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-2">
              2. Select Request Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTicketType("name_correction")}
                className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                  ticketType === "name_correction"
                    ? "bg-slate-900 text-white border-black shadow"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Name / Reg No. Fix</span>
              </button>

              <button
                type="button"
                onClick={() => setTicketType("replacement")}
                className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                  ticketType === "replacement"
                    ? "bg-slate-900 text-white border-black shadow"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Member Swap</span>
              </button>

              <button
                type="button"
                onClick={() => setTicketType("withdrawal")}
                className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                  ticketType === "withdrawal"
                    ? "bg-slate-900 text-white border-black shadow"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <UserMinus className="w-4 h-4" />
                <span>Drop / Withdrawal</span>
              </button>
            </div>
          </div>

          {/* 3. Conditional Change Configuration Panel */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-4">
            {ticketType === "name_correction" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-slate-900" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-950">
                    Enter Official Rectified Details
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Correct Full Name
                    </label>
                    <input
                      type="text"
                      value={correctedName}
                      onChange={(e) => setCorrectedName(e.target.value)}
                      placeholder="Student Full Name"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Correct Official Reg. No.
                    </label>
                    <input
                      type="text"
                      value={correctedRegNo}
                      onChange={(e) => setCorrectedRegNo(e.target.value)}
                      placeholder="RA211100301..."
                      className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {ticketType === "replacement" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-slate-900" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-950">
                      Search New Replacement Teammate
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                    Required Track: {cohortTrack === "internship" ? "💼 Internship" : "🎓 Regular"}
                  </span>
                </div>

                {replacementStudent ? (
                  /* Selected Replacement Card */
                  <div className="p-3.5 bg-white rounded-2xl border-2 border-slate-900 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-950">
                          {replacementStudent.fullName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                          {replacementStudent.regNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                          {replacementStudent.department || "Dept of ECE"}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          replacementCohortConflict ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-900"
                        }`}>
                          {replacementStudent.internshipStatus === "internship" ? "💼 Internship" : "🎓 Regular"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReplacementStudent(null);
                        setReplacementQuery("");
                      }}
                      className="text-xs font-bold text-red-600 hover:underline px-2 py-1"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  /* Search Input */
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search replacement by name or Reg No..."
                        value={replacementQuery}
                        onChange={(e) => setReplacementQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-black"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 w-4 h-4 animate-spin text-slate-500" />
                      )}
                    </div>

                    {/* Results dropdown */}
                    {replacementQuery.length >= 2 && (
                      <div className="mt-2 bg-white border-2 border-slate-900 rounded-2xl shadow-xl p-1.5 max-h-48 overflow-y-auto space-y-1">
                        {replacementResults.length === 0 && !isSearching && (
                          <div className="p-3 text-center text-xs text-slate-500 font-medium">
                            No available students found.
                          </div>
                        )}
                        {replacementResults.map((s) => {
                          const isConflict = (s.internshipStatus || "regular") !== cohortTrack;
                          return (
                            <div
                              key={s._id}
                              onClick={() => {
                                setReplacementStudent(s);
                                setReplacementResults([]);
                              }}
                              className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between text-left ${
                                isConflict ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-100"
                              }`}
                            >
                              <div>
                                <p className="font-bold text-xs text-slate-950">{s.fullName}</p>
                                <p className="text-[11px] font-mono text-slate-500">{s.regNo} • {s.department}</p>
                              </div>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                isConflict ? "bg-red-200 text-red-900" : "bg-blue-100 text-blue-900"
                              }`}>
                                {s.internshipStatus === "internship" ? "💼 Internship" : "🎓 Regular"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Conflict or cross-branch warning for replacement */}
                {replacementCohortConflict && (
                  <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                    <span>Cohort Conflict: This student is on a different internship track than your team cohort.</span>
                  </div>
                )}

                {replacementIsCrossBranch && !replacementCohortConflict && (
                  <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>Cross-Branch Notice: This replacement student is from {replacementStudent.department}.</span>
                  </div>
                )}
              </div>
            )}

            {ticketType === "withdrawal" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950 font-medium leading-relaxed">
                <p className="font-bold text-red-700 mb-1">
                  ⚠️ Member Withdrawal Notice
                </p>
                Requesting member removal will decrease your team size. The departmental coordinator may require you to replace this member before final project lock-in.
              </div>
            )}
          </div>

          {/* 4. Justification / Remarks */}
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">
              3. Justification & Coordinator Remarks
            </label>
            <p className="text-xs text-slate-500 mb-2 font-medium">
              Select a standard reason or provide custom explanation.
            </p>

            {/* Quick Reason Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {quickReasons.map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(qr)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    reason === qr
                      ? "bg-slate-900 text-white border-black"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the detailed reason for this modification request..."
              className="w-full p-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-black transition"
              required
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full border-2 border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
            >
              Cancel
            </button>

            <motion.button
              type="submit"
              disabled={isSubmitting || (ticketType === "replacement" && replacementCohortConflict)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm border-2 border-black shadow-lg transition disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket to Coordinator</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
