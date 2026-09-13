import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  FolderGit2,
  Users,
  Edit3,
  RefreshCw,
  UserMinus,
  Trash2,
  Building2,
  Briefcase,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Phone,
} from "lucide-react";
import { getMyApplications, getStudentTickets, cancelTicket, cancelPendingApplication } from "../api";
import ChangeTicketModal from "./ChangeTicketModal";

export default function TicketTrackerWidget({ currentUser, onOpenApplyModal }) {
  const [activeTab, setActiveTab] = useState("applications"); // 'applications' | 'tickets'
  const [applications, setApplications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal for raising a change ticket on an application
  const [selectedAppForTicket, setSelectedAppForTicket] = useState(null);
  const [ticketInitialType, setTicketInitialType] = useState("name_correction");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, ticketsRes] = await Promise.all([
        getMyApplications(),
        getStudentTickets(),
      ]);
      setApplications(appsRes.data || []);
      setTickets(ticketsRes.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelApplication = async (app) => {
    if (app.status === "approved") {
      setTicketInitialType("cancellation");
      setSelectedAppForTicket(app);
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to cancel/close your Priority ${app.priority || 1} application for "${app.projectTitle}"? This will free your quota immediately.`
      )
    ) {
      return;
    }

    try {
      await cancelPendingApplication(app._id);
      toast.success(`Priority ${app.priority || 1} application closed successfully.`);
      setApplications((prev) => prev.filter((a) => a._id !== app._id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel application.");
    }
  };

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to cancel this ticket request?")) return;
    try {
      await cancelTicket(ticketId);
      toast.success("Ticket request cancelled");
      setTickets((prev) => prev.filter((t) => t._id !== ticketId && t.ticketId !== ticketId));
    } catch {
      toast.error("Failed to cancel ticket");
    }
  };

  const handleTicketSubmitted = (newTicket) => {
    if (newTicket) {
      setTickets((prev) => [newTicket, ...prev]);
      setActiveTab("tickets");
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border-2 border-slate-900 shadow-xl overflow-hidden mb-10">
      {/* Top Banner & Tab Navigation */}
      <div className="p-6 sm:p-7 bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-400 text-slate-950">
              Student Project Portal
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Live Roster & Ticket Tracker
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            My Applications & Member Change Tickets
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-800 rounded-2xl border border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("applications")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "applications"
                ? "bg-white text-slate-950 shadow-md font-extrabold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>My Applications ({applications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              activeTab === "tickets"
                ? "bg-white text-slate-950 shadow-md font-extrabold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Change Tickets ({tickets.length})</span>
            {tickets.some((t) => t.status === "pending" || t.status === "in_review") && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 sm:p-8 bg-slate-50/60">
        <AnimatePresence mode="wait">
          {activeTab === "applications" ? (
            /* TAB 1: APPLICATIONS LIST */
            <motion.div
              key="apps-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {applications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-3">
                  <FolderGit2 className="w-12 h-12 text-slate-400 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900">
                    No Project Applications Submitted Yet
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Browse available faculty projects below and assemble a 3-member team to submit your major project proposal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {applications.map((app) => {
                    const members = app.members || [];
                    const isApproved = app.status === "approved";
                    const isPending = app.status?.includes("pending");

                    return (
                      <div
                        key={app._id}
                        className="bg-white rounded-2xl border-2 border-slate-900 shadow-md overflow-hidden p-6 space-y-5"
                      >
                        {/* Header info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                                Priority {app.priority || 1}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  isApproved
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : app.status === "pending_member_approval"
                                    ? "bg-purple-100 text-purple-900 border border-purple-300"
                                    : app.status === "rejected"
                                    ? "bg-red-100 text-red-800 border border-red-300"
                                    : "bg-amber-100 text-amber-900 border border-amber-300"
                                }`}
                              >
                                {isApproved
                                  ? "Approved & Allocated"
                                  : app.status === "pending_member_approval"
                                  ? "⏳ Teammate Confirmations Pending"
                                  : app.status === "rejected"
                                  ? "Declined"
                                  : "Pending Faculty Approval"}
                              </span>
                              {app.hasCrossBranch && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                  ⚡ Cross-Branch
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-950">
                              {app.projectTitle}
                            </h3>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              Faculty Guide: <strong>{app.facultyName}</strong> • Track:{" "}
                              <strong>{app.cohortTrack === "internship" ? "💼 Corporate Internship" : "🎓 Regular On-Campus"}</strong>
                            </p>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setTicketInitialType("name_correction");
                                setSelectedAppForTicket(app);
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold border-2 border-black shadow transition active:scale-95"
                            >
                              <Ticket className="w-3.5 h-3.5 text-amber-400" />
                              <span>Request Team Change</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelApplication(app)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-extrabold border-2 border-red-300 transition active:scale-95"
                              title={
                                isApproved
                                  ? "Request official project cancellation ticket"
                                  : "Manually close and cancel this pending application"
                              }
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{isApproved ? "Request Cancellation" : "Close / Cancel Application"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Current Team Roster */}
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Current Registered Roster ({members.length} Members)</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {members.map((m, idx) => (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-xl flex flex-col justify-between border ${
                                  idx === 0
                                    ? "bg-slate-50 border-cyan-300 shadow-xs"
                                    : "bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                        idx === 0
                                          ? "bg-cyan-900 text-cyan-100"
                                          : "text-slate-500"
                                      }`}
                                    >
                                      {idx === 0 ? "👑 Leader" : `Teammate ${idx + 1}`}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                                        {m.department || "Dept of ECE"}
                                      </span>
                                      {m.status === "accepted" ? (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                                          ✓ Confirmed
                                        </span>
                                      ) : m.status === "pending" ? (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                          ⏳ Pending
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="font-bold text-xs text-slate-950">{m.name}</p>
                                  <p className="text-[11px] font-mono font-medium text-slate-500">
                                    {m.regNo}
                                  </p>

                                  {/* Phone number */}
                                  {m.phoneNumber && (
                                    <div className="mt-2 pt-1.5 border-t border-slate-200">
                                      <a
                                        href={`tel:${m.phoneNumber}`}
                                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded transition ${
                                          idx === 0
                                            ? "text-emerald-800 bg-emerald-100 hover:bg-emerald-200"
                                            : "text-slate-700 bg-slate-100 hover:bg-slate-200"
                                        }`}
                                      >
                                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>{idx === 0 ? `Leader: ${m.phoneNumber}` : m.phoneNumber}</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            /* TAB 2: TICKETS TRACKER LIST */
            <motion.div
              key="tickets-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {tickets.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-3">
                  <Ticket className="w-12 h-12 text-slate-400 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900">
                    No Modification Tickets Filed
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    If you need to fix a team member's name spelling, swap a teammate, or adjust your roster after submitting an application, use the <strong>Raise Member Change Ticket</strong> button on your application.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {tickets.map((tck) => {
                    const isPending = tck.status === "pending" || tck.status === "in_review";
                    const isApproved = tck.status === "approved";
                    const isRejected = tck.status === "rejected";
                    const step = tck.progressStep || 1;

                    return (
                      <div
                        key={tck._id}
                        className="bg-white rounded-2xl border-2 border-slate-900 shadow-md p-6 space-y-5"
                      >
                        {/* Ticket Top Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-slate-950 text-white">
                                {tck.ticketId || "#TCK-XXXX"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                {tck.changeType === "name_correction"
                                  ? "Name / RegNo Fix"
                                  : tck.changeType === "replacement"
                                  ? "Teammate Swap"
                                  : tck.changeType === "cancellation"
                                  ? "Project Cancellation"
                                  : "Withdrawal"}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  isApproved
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : isRejected
                                    ? "bg-red-100 text-red-800 border border-red-300"
                                    : "bg-blue-100 text-blue-900 border border-blue-300"
                                }`}
                              >
                                {isApproved
                                  ? tck.changeType === "cancellation" ? "Cancelled & Approved" : "Approved & Updated"
                                  : isRejected
                                  ? "Rejected"
                                  : "Under Review"}
                              </span>
                            </div>
                            <h3 className="text-base font-extrabold text-slate-950">
                              {tck.projectTitle}
                            </h3>
                            <p className="text-xs text-slate-600 font-medium">
                              Target Member: <strong>{tck.targetMember?.name} ({tck.targetMember?.regNo})</strong>
                            </p>
                          </div>

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleCancelTicket(tck._id || tck.ticketId)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold text-red-600 border border-red-300 hover:bg-red-50 transition self-start sm:self-auto"
                            >
                              Cancel Request
                            </button>
                          )}
                        </div>

                        {/* Visual Progress Timeline */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                            Verification Workflow Timeline
                          </h4>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(tck.changeType === "cancellation"
                              ? [
                                  { s: 1, title: "1. Ticket Submitted", desc: "Logged in system" },
                                  {
                                    s: 2,
                                    title: "2. Guide & Advisor",
                                    desc: "Dual review required",
                                  },
                                  {
                                    s: 3,
                                    title: tck.requiresHodApproval ? "3. HoD Approval" : "3. HoD Bypass",
                                    desc: tck.requiresHodApproval ? "Department sign-off" : "Not needed (no internship)",
                                  },
                                  { s: 4, title: "4. Project Cancelled", desc: "Exit finalized" },
                                ]
                              : [
                                  { s: 1, title: "1. Ticket Submitted", desc: "Logged in system" },
                                  { s: 2, title: "2. Faculty Review", desc: "Guide evaluation" },
                                  { s: 3, title: "3. HoD Approval", desc: "Department sign-off" },
                                  { s: 4, title: "4. Roster Updated", desc: "Locked into ERP" },
                                ]
                            ).map((stage) => {
                              const isCompleted = step >= stage.s;
                              const isCurrent = step === stage.s && isPending;

                              return (
                                <div
                                  key={stage.s}
                                  className={`p-3 rounded-xl border transition ${
                                    isCompleted
                                      ? "bg-white border-slate-900 shadow-sm"
                                      : "bg-slate-100/50 border-slate-200 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-slate-400" />
                                    )}
                                    <span className={`text-xs font-bold ${isCompleted ? "text-slate-950" : "text-slate-500"}`}>
                                      {stage.title}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    {stage.desc}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Stakeholder Approval Badges for Cancellation */}
                          {tck.changeType === "cancellation" && (
                            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2 text-[11px]">
                              <span className="font-bold text-slate-600 self-center">Approvals:</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold border ${
                                  tck.projectInchargeApproval === "approved"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : tck.projectInchargeApproval === "rejected"
                                    ? "bg-red-50 text-red-800 border-red-300"
                                    : "bg-amber-50 text-amber-800 border-amber-300"
                                }`}
                              >
                                Project Incharge: {tck.projectInchargeApproval || "pending"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold border ${
                                  tck.facultyAdvisorApproval === "approved"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : tck.facultyAdvisorApproval === "rejected"
                                    ? "bg-red-50 text-red-800 border-red-300"
                                    : "bg-amber-50 text-amber-800 border-amber-300"
                                }`}
                              >
                                Faculty Advisor: {tck.facultyAdvisorApproval || "pending"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold border ${
                                  !tck.requiresHodApproval
                                    ? "bg-slate-100 text-slate-600 border-slate-300"
                                    : tck.hodApproval === "approved"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : tck.hodApproval === "rejected"
                                    ? "bg-red-50 text-red-800 border-red-300"
                                    : tck.hodApproval === "pending"
                                    ? "bg-blue-50 text-blue-800 border-blue-300"
                                    : "bg-slate-100 text-slate-600 border-slate-300"
                                }`}
                              >
                                Department HOD:{" "}
                                {!tck.requiresHodApproval
                                  ? "Not Required (No Internship)"
                                  : tck.hodApproval === "pending_prior_approvals"
                                  ? "Pending Prior Approvals"
                                  : tck.hodApproval || "pending"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ticket details / remarks */}
                        <div className="text-xs text-slate-700 space-y-2">
                          <p>
                            <strong>Justification:</strong> {tck.reason}
                          </p>
                          {tck.coordinatorRemarks && (
                            <p className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 font-medium">
                              <strong>Coordinator Notes:</strong> {tck.coordinatorRemarks}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Render Modal for raising a change ticket */}
      {selectedAppForTicket && (
        <ChangeTicketModal
          application={selectedAppForTicket}
          currentUser={currentUser}
          onClose={() => setSelectedAppForTicket(null)}
          onTicketSubmitted={handleTicketSubmitted}
          initialTicketType={ticketInitialType}
        />
      )}
    </div>
  );
}
