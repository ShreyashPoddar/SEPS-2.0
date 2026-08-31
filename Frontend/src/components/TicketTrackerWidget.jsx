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
  ExternalLink
} from "lucide-react";
import { getMyApplications, getStudentTickets, cancelTicket } from "../api";
import ChangeTicketModal from "./ChangeTicketModal";

export default function TicketTrackerWidget({ currentUser, onOpenApplyModal }) {
  const [activeTab, setActiveTab] = useState("applications"); // 'applications' | 'tickets'
  const [applications, setApplications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal for raising a change ticket on an application
  const [selectedAppForTicket, setSelectedAppForTicket] = useState(null);

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
                    Browse available faculty projects below and assemble a 3-member team to submit your capstone proposal.
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
                                    : "bg-amber-100 text-amber-900 border border-amber-300"
                                }`}
                              >
                                {isApproved ? "Approved & Allocated" : "Pending Faculty Approval"}
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

                          {/* 🎫 RAISE TICKET ACTION BUTTON */}
                          <button
                            type="button"
                            onClick={() => setSelectedAppForTicket(app)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold border-2 border-black shadow transition self-start sm:self-auto hover:scale-105 active:scale-95"
                          >
                            <Ticket className="w-4 h-4 text-amber-400" />
                            <span>🎫 Raise Member Change Ticket</span>
                          </button>
                        </div>

                        {/* Current Team Roster */}
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Current Registered Roster (3 Members)</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {members.map((m, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-500">
                                      {idx === 0 ? "Leader" : `Teammate ${idx + 1}`}
                                    </span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                                      {m.department || "Dept of ECE"}
                                    </span>
                                  </div>
                                  <p className="font-bold text-xs text-slate-950">{m.name}</p>
                                  <p className="text-[11px] font-mono font-medium text-slate-500">
                                    {m.regNo}
                                  </p>
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
                                  ? "Approved & Updated"
                                  : isRejected
                                  ? "Rejected"
                                  : "Under Coordinator Review"}
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

                        {/* 4-Stage Visual Progress Timeline */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                            Verification Workflow Timeline
                          </h4>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { s: 1, title: "1. Ticket Submitted", desc: "Logged in system" },
                              { s: 2, title: "2. Faculty Review", desc: "Guide evaluation" },
                              { s: 3, title: "3. HoD Approval", desc: "Department sign-off" },
                              { s: 4, title: "4. Roster Updated", desc: "Locked into ERP" },
                            ].map((stage) => {
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
        />
      )}
    </div>
  );
}
