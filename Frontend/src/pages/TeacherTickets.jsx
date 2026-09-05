import React, { useEffect, useState, useCallback } from "react";
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
  approved: "Approved & Roster Updated",
  rejected: "Rejected",
};

export default function TeacherTickets() {
  const [tickets, setTickets] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState({});
  const [busyId, setBusyId] = useState(null);
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
        ticket.changeType === "withdrawal"
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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader className="w-10 h-10 text-cyan-600 animate-spin" />
      </div>
    );
  }

  const open = tickets.filter((t) => t.status === "pending" || t.status === "in_review");
  const closed = tickets.filter((t) => t.status === "approved" || t.status === "rejected");

  const renderTicket = (tck) => {
    const id = tck._id || tck.id;
    const { text, Icon } = CHANGE_LABEL[tck.changeType] || CHANGE_LABEL.name_correction;
    const isOpen = tck.status === "pending" || tck.status === "in_review";
    const busy = busyId === id;
    const changes = tck.requestedChanges || {};

    return (
      <div
        key={id}
        className="bg-white rounded-2xl border-2 border-slate-900 shadow-md p-6 space-y-4"
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
              {tck.teamId && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Approved Team
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-slate-950">{tck.projectTitle}</h3>
            <p className="text-xs text-slate-600">
              Raised by <strong>{tck.student?.fullName || "a team member"}</strong>
              {tck.student?.regNo ? ` (${tck.student.regNo})` : ""}
            </p>
          </div>
        </div>

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
          </div>
        </div>

        <p className="text-xs text-slate-700">
          <strong>Justification:</strong> {tck.reason}
        </p>

        {tck.coordinatorRemarks && (
          <p className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs font-medium">
            <strong>Your notes:</strong> {tck.coordinatorRemarks}
          </p>
        )}

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
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold transition"
                >
                  <Eye className="w-4 h-4" /> Mark Under Review
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => act(tck, "approve")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve &amp; Update Roster
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act(tck, "reject")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold transition"
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
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3 text-gray-700">
            <Ticket className="w-8 h-8 text-cyan-600" />
            Member Change Tickets
          </h2>
          <p className="text-sm text-slate-600 mb-8">
            Requests raised by teams on your projects. Approving a ticket applies
            the change to the roster immediately.
          </p>

          {tickets.length === 0 ? (
            <div className="text-center text-gray-500 bg-white p-12 rounded-xl border border-slate-200 flex flex-col items-center gap-4">
              <Inbox className="w-16 h-16 text-slate-400" />
              <h3 className="text-2xl font-bold">No Change Tickets</h3>
              <p>Nothing has been raised against your projects yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 mb-4">
                  Awaiting Your Action ({open.length})
                </h3>
                {open.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white p-6 rounded-xl border border-slate-200">
                    Nothing pending — all tickets have been actioned.
                  </p>
                ) : (
                  <div className="space-y-6">{open.map(renderTicket)}</div>
                )}
              </div>

              {closed.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 mb-4">
                    Resolved ({closed.length})
                  </h3>
                  <div className="space-y-6">{closed.map(renderTicket)}</div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
