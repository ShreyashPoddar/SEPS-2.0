import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import {
  Loader,
  Ticket,
  Inbox,
  CheckCircle2,
  XCircle,
  Eye,
  UserMinus,
  RefreshCw,
  Edit3,
  Search,
  Clock,
  CheckCircle,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getCurrentUser,
  logoutUser,
  getFacultyTickets,
  actOnTicket,
} from "../api";
import Navbar from "../components/Navbar";

const CHANGE_LABEL = {
  name_correction: { text: "Name / Reg. No. Correction", Icon: Edit3 },
  replacement: { text: "Teammate Replacement", Icon: RefreshCw },
  withdrawal: { text: "Member Withdrawal", Icon: UserMinus },
  cancellation: { text: "Project Cancellation", Icon: XCircle },
};

const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  in_review: "bg-blue-100 text-blue-900 border-blue-300",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_TEXT = {
  pending: "Awaiting Review",
  in_review: "Under Review",
  approved: "Approved & Resolved",
  rejected: "Rejected",
};

export default function TeacherTickets() {
  const [tickets, setTickets] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active" | "past" | "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTimelineId, setExpandedTimelineId] = useState(null);
  const navigate = useNavigate();

  const fetchTickets = useCallback(() => {
    setLoading(true);
    getFacultyTickets()
      .then((res) => setTickets(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to fetch tickets:", err);
        toast.error("Could not load change tickets.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data?.role !== "teacher") {
          navigate("/student-dashboard");
        } else {
          setUser(res.data);
          fetchTickets();
        }
      })
      .catch(() => navigate("/login"));
  }, [navigate, fetchTickets]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const act = async (ticket, action) => {
    const id = ticket._id || ticket.id;
    if (action === "approve" && ticket.changeType !== "name_correction") {
      const what =
        ticket.changeType === "cancellation"
          ? `approve cancellation of the project for ${ticket.targetMember?.name || "this student"}`
          : ticket.changeType === "withdrawal"
          ? `remove ${ticket.targetMember?.name} from the roster`
          : `replace ${ticket.targetMember?.name} on the roster`;
      if (!window.confirm(`Approving this will ${what}. Continue?`)) return;
    }

    setBusyId(id);
    try {
      const res = await actOnTicket(id, action, remarks[id] || "");
      toast.success(res.data?.message || "Ticket updated.");
      setRemarks((prev) => ({ ...prev, [id]: "" }));
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the ticket.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleTimeline = (id) => {
    setExpandedTimelineId((prev) => (prev === id ? null : id));
  };

  // Group tickets into active and resolved
  const openTickets = useMemo(
    () => tickets.filter((t) => t.status === "pending" || t.status === "in_review"),
    [tickets]
  );
  const closedTickets = useMemo(
    () => tickets.filter((t) => t.status === "approved" || t.status === "rejected"),
    [tickets]
  );

  // Filter based on active tab and search query
  const displayedTickets = useMemo(() => {
    let list = tickets;
    if (activeTab === "active") list = openTickets;
    else if (activeTab === "past") list = closedTickets;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((t) => {
      const tId = (t.ticketId || "").toLowerCase();
      const proj = (t.projectTitle || "").toLowerCase();
      const studentName = (t.student?.fullName || "").toLowerCase();
      const studentReg = (t.student?.regNo || "").toLowerCase();
      const targetName = (t.targetMember?.name || "").toLowerCase();
      const targetReg = (t.targetMember?.regNo || "").toLowerCase();
      return (
        tId.includes(q) ||
        proj.includes(q) ||
        studentName.includes(q) ||
        studentReg.includes(q) ||
        targetName.includes(q) ||
        targetReg.includes(q)
      );
    });
  }, [tickets, activeTab, openTickets, closedTickets, searchQuery]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader className="w-10 h-10 text-cyan-600 animate-spin" />
      </div>
    );
  }

  const renderTicket = (tck) => {
    const id = tck._id || tck.id;
    const { text, Icon } = CHANGE_LABEL[tck.changeType] || CHANGE_LABEL.name_correction;
    const isOpen = tck.status === "pending" || tck.status === "in_review";
    const busy = busyId === id;
    const changes = tck.requestedChanges || {};
    const timelineList = Array.isArray(tck.timeline) ? tck.timeline : [];
    const isTimelineExpanded = expandedTimelineId === id;

    return (
      <div
        key={id}
        className={`bg-white rounded-2xl border-2 transition shadow-md p-6 space-y-4 ${
          isOpen ? "border-slate-900" : "border-slate-300 opacity-95"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-slate-950 text-white">
                {tck.ticketId}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {text}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  STATUS_STYLE[tck.status] || STATUS_STYLE.pending
                }`}
              >
                {STATUS_TEXT[tck.status] || tck.status}
              </span>
              {tck.userRoles && tck.userRoles.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Your Role:{" "}
                  {tck.userRoles
                    .map((r) =>
                      r === "project_incharge"
                        ? "Project Incharge"
                        : r === "faculty_advisor"
                        ? "Faculty Advisor"
                        : "HOD"
                    )
                    .join(" & ")}
                </span>
              )}
              {tck.teamId && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Approved Team
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-slate-950">{tck.projectTitle}</h3>
            <p className="text-xs text-slate-600">
              Raised by <strong>{tck.student?.fullName || "a team member"}</strong>
              {tck.student?.regNo ? ` (${tck.student.regNo})` : ""} &bull;{" "}
              {new Date(tck.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Multi-Stage Pipeline Badges for Cancellation */}
        {tck.changeType === "cancellation" && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-2 text-[11px]">
            <span className="font-bold text-slate-600 self-center">Approval Pipeline:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold border ${
                tck.projectInchargeApproval === "approved"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : tck.projectInchargeApproval === "rejected"
                  ? "bg-red-50 text-red-800 border-red-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }`}
            >
              Incharge ({tck.projectIncharge?.fullName || "Faculty"}):{" "}
              {tck.projectInchargeApproval || "pending"}
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
              Advisor ({tck.facultyAdvisor?.fullName || "Faculty"}):{" "}
              {tck.facultyAdvisorApproval || "pending"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold border ${
                !tck.requiresHodApproval
                  ? "bg-slate-100 text-slate-500 border-slate-300"
                  : tck.hodApproval === "approved"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : tck.hodApproval === "rejected"
                  ? "bg-red-50 text-red-800 border-red-300"
                  : tck.hodApproval === "pending"
                  ? "bg-blue-50 text-blue-800 border-blue-300"
                  : "bg-slate-100 text-slate-500 border-slate-300"
              }`}
            >
              HOD ({tck.hod?.fullName || "HOD"}):{" "}
              {!tck.requiresHodApproval
                ? "Not Required (No Internship)"
                : tck.hodApproval === "pending_prior_approvals"
                ? "Pending Prior Approvals"
                : tck.hodApproval || "pending"}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">
              Target Member
            </p>
            <p className="font-bold text-sm text-slate-950">{tck.targetMember?.name}</p>
            <p className="font-mono text-slate-500">{tck.targetMember?.regNo}</p>
            <p className="text-slate-500">{tck.targetMember?.department}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">
              Requested Change
            </p>
            {tck.changeType === "name_correction" && (
              <>
                <p className="font-bold text-sm text-slate-950">
                  {changes.correctedName || "—"}
                </p>
                <p className="font-mono text-slate-500">{changes.correctedRegNo || "—"}</p>
              </>
            )}
            {tck.changeType === "replacement" && (
              <>
                <p className="font-bold text-sm text-slate-950">
                  {changes.replacementStudent?.fullName || "—"}
                </p>
                <p className="font-mono text-slate-500">
                  {changes.replacementStudent?.regNo || "—"}
                </p>
                <p className="text-slate-500">
                  {changes.replacementStudent?.department || ""}
                </p>
              </>
            )}
            {tck.changeType === "withdrawal" && (
              <p className="font-bold text-sm text-slate-950">
                Remove from the team roster
              </p>
            )}
            {tck.changeType === "cancellation" && (
              <div className="space-y-1">
                <p className="font-bold text-sm text-red-600">Full Project Cancellation</p>
                <p className="text-slate-600 text-[11px]">
                  Requires Incharge &amp; Advisor approval
                  {tck.requiresHodApproval
                    ? " + HOD approval (Internship track)"
                    : " (No HOD needed for regular track)"}
                  .
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-700">
          <strong>Justification:</strong> {tck.reason}
        </p>

        {tck.coordinatorRemarks && (
          <p className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs font-medium">
            <strong>Decision remarks:</strong> {tck.coordinatorRemarks}
          </p>
        )}

        {/* Audit Timeline Drawer Toggle */}
        {timelineList.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => toggleTimeline(id)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Timeline ({timelineList.length} events)</span>
              {isTimelineExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isTimelineExpanded && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                {timelineList.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2 border-l-2 border-cyan-500 pl-3 py-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{evt.step}</span>
                        <span className="text-[10px] text-slate-500">
                          {evt.date
                            ? new Date(evt.date).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{evt.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Controls for Open Tickets */}
        {isOpen && (
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <input
              type="text"
              value={remarks[id] || ""}
              onChange={(e) => setRemarks((prev) => ({ ...prev, [id]: e.target.value }))}
              placeholder="Optional remarks for the student..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <div className="flex flex-wrap gap-2">
              {tck.status === "pending" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(tck, "review")}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-sm"
                >
                  <Eye className="w-4 h-4" /> Mark Under Review
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => act(tck, "approve")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve &amp; Update Roster
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act(tck, "reject")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-sm"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
      <Toaster position="top-right" />
      <div className="relative max-w-5xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar user={user} handleLogout={handleLogout} />

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3 text-gray-900">
                <Ticket className="w-8 h-8 text-cyan-600" />
                Change Tickets Management
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Review and approve roster adjustments, team replacements, or project cancellation requests.
              </p>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={fetchTickets}
              className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-full text-xs font-bold text-slate-900 transition flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              Refresh Tickets
            </button>
          </div>

          {/* Tab Navigation & Search Bar */}
          <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-md p-4 sm:p-5 mb-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setActiveTab("active")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === "active"
                      ? "bg-slate-950 text-white shadow font-extrabold"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Active Tickets</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === "active"
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {openTickets.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("past")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === "past"
                      ? "bg-slate-950 text-white shadow font-extrabold"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Past / Resolved</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === "past"
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {closedTickets.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === "all"
                      ? "bg-slate-950 text-white shadow font-extrabold"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>All Tickets</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === "all"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tickets.length}
                  </span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ticket, name, reg no..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Ticket Listing */}
          {displayedTickets.length === 0 ? (
            <div className="text-center text-gray-500 bg-white p-12 rounded-3xl border-2 border-slate-900 shadow-md flex flex-col items-center gap-4">
              <Inbox className="w-16 h-16 text-slate-300" />
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeTab === "active"
                    ? "All Caught Up!"
                    : activeTab === "past"
                    ? "No Past Tickets Found"
                    : "No Change Tickets Found"}
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  {searchQuery.trim()
                    ? `No tickets match your search "${searchQuery}". Try clearing the search filter.`
                    : activeTab === "active"
                    ? "There are no pending tickets awaiting your action right now."
                    : activeTab === "past"
                    ? "Previously approved or rejected tickets will appear here with full audit trails."
                    : "Nothing has been raised against your projects yet."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">{displayedTickets.map(renderTicket)}</div>
          )}
        </section>
      </div>
    </div>
  );
}

