import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getPendingInvitations,
  respondToInvitation,
  getNotifications,
  deleteNotification,
  markAllNotificationsRead,
  getCurrentUser,
  logoutUser,
  getFacultyTickets,
  getAllQuotaTokens,
} from "../api";
import showToast from "../utils/toastUtils";
import {
  Bell,
  Check,
  X,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Trash2,
  Phone,
  ShieldCheck,
  ArrowRight,
  Ticket,
} from "lucide-react";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

import { isAdminEmail } from "../utils/adminUtils";
const TYPE_STYLES = {
  success: { Icon: CheckCircle2, ring: "border-emerald-300", tint: "bg-emerald-50", ink: "text-emerald-700" },
  warning: { Icon: AlertTriangle, ring: "border-amber-300", tint: "bg-amber-50", ink: "text-amber-700" },
  error: { Icon: XCircle, ring: "border-red-300", tint: "bg-red-50", ink: "text-red-700" },
  info: { Icon: Info, ring: "border-cyan-300", tint: "bg-cyan-50", ink: "text-cyan-700" },
};

const timeAgo = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);
  const navigate = useNavigate();

  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    const email = user.email.toLowerCase().trim();
    return isAdminEmail(email);
  }, [user]);

  const fetchData = useCallback((role, currentUser) => {
    setLoading(true);
    const promises = [getNotifications()];
    if (role === "student") {
      promises.push(getPendingInvitations());
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    if (role === "teacher") {
      const email = (currentUser?.email || "").toLowerCase().trim();
      const userIsAdmin = isAdminEmail(email);

      Promise.all([
        getFacultyTickets().catch(() => ({ data: [] })),
        userIsAdmin ? getAllQuotaTokens().catch(() => ({ data: { tokens: [] } })) : Promise.resolve({ data: { tokens: [] } }),
      ]).then(([ticketsRes, quotaRes]) => {
        const tList = Array.isArray(ticketsRes?.data) ? ticketsRes.data : [];
        const openTickets = tList.filter((t) => t.status === "pending" || t.status === "in_review").length;
        const qList = Array.isArray(quotaRes?.data?.tokens) ? quotaRes.data.tokens : [];
        const pendingQuota = qList.filter((t) => t.status === "pending").length;
        setPendingTicketsCount(openTickets + pendingQuota);
      }).catch((err) => console.error("Error loading tickets count:", err));
    }

    Promise.all(promises)
      .then(([noteRes, invRes]) => {
        setInvitations(invRes?.data || []);
        // Backend returns { success, notifications }; tolerate a bare array too.
        const list = Array.isArray(noteRes.data)
          ? noteRes.data
          : noteRes.data?.notifications || [];
        setNotifications(list);
        if (list.some((n) => !n.isRead)) {
          // Opening the page counts as reading; keep the items, drop the badge.
          markAllNotificationsRead().catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
        showToast.error("Could not load notifications. Please check your connection.", {
          id: "notifications-load-error",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (!res.data) {
          navigate("/login");
        } else {
          setUser(res.data);
          fetchData(res.data.role, res.data);
        }
      })
      .catch(() => navigate("/login"));
  }, [navigate, fetchData]);

  const handleInvitationResponse = (applicationId, memberId, response) => {
    setInvitations((prev) =>
      prev.filter((invite) => invite.applicationId !== applicationId)
    );

    showToast.promise(respondToInvitation({ applicationId, memberId, response }), {
      loading: "Submitting your response...",
      success: (res) => res.data?.message || "Response recorded!",
      error: (err) => {
        fetchData(user?.role, user); // refresh if error
        return err.response?.data?.message || "Action failed.";
      },
    });
  };

  const handleDismiss = async (id) => {
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      setNotifications(previous); // put it back if the server refused
      showToast.error(err, { fallback: "Could not dismiss notification." });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  if (loading || !user) {
    return <LoadingSpinner fullScreen text="Loading Notifications..." />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
      <div className="relative max-w-6xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar
          user={user}
          handleLogout={handleLogout}
          notificationCount={invitations.length}
          pendingTicketsCount={pendingTicketsCount}
        />

        {user?.role === "student" && (
          <section>
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-700">
            <Bell className="w-8 h-8 text-cyan-600" />
            Your Invitations
          </h2>
          {invitations.length === 0 ? (
            <div className="text-center text-gray-500 bg-white p-12 rounded-xl border border-slate-200 flex flex-col items-center gap-4">
              <Inbox className="w-16 h-16 text-slate-400" />
              <h3 className="text-2xl font-bold">No Pending Invitations</h3>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invite) => (
                <div
                  key={invite.applicationId}
                  className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition hover:shadow-cyan-100 hover:border-cyan-400"
                >
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 text-[10px] font-black uppercase tracking-wider">
                        👑 Team Leader Request
                      </span>
                      {invite.leaderDept && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {invite.leaderDept}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-slate-800 text-sm font-medium">
                        <strong className="font-extrabold text-slate-950 text-base">{invite.leaderName}</strong>{" "}
                        {invite.leaderRegNo && (
                          <span className="font-mono text-xs text-slate-500 font-semibold">
                            ({invite.leaderRegNo})
                          </span>
                        )}{" "}
                        has invited you to join their project team:
                      </p>
                      <h4 className="text-base sm:text-lg font-black text-cyan-800 mt-0.5">
                        {invite.projectTitle}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {invite.leaderPhone ? (
                        <a
                          href={`tel:${invite.leaderPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-extrabold hover:bg-emerald-100 transition shadow-sm"
                          title="Call or message team leader"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Leader Phone: {invite.leaderPhone}</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>Leader Phone: Not provided</span>
                        </span>
                      )}

                      <span className="text-xs text-slate-500 font-medium">
                        • Faculty Guide: <strong className="text-slate-800">{invite.facultyName}</strong>
                      </span>
                      {invite.leaderEmail && (
                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                          • {invite.leaderEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-row md:flex-col gap-2.5 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      onClick={() =>
                        handleInvitationResponse(
                          invite.applicationId,
                          invite.memberId,
                          "approved"
                        )
                      }
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-sm transition"
                    >
                      <Check size={16} /> Accept Invitation
                    </button>
                    <button
                      onClick={() =>
                        handleInvitationResponse(
                          invite.applicationId,
                          invite.memberId,
                          "rejected"
                        )
                      }
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-5 py-2.5 rounded-xl font-bold text-xs transition"
                    >
                      <X size={16} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        <section className="mt-12">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-700">
            <Inbox className="w-8 h-8 text-cyan-600" />
            Updates
            {notifications.length > 0 && (
              <span className="text-sm font-extrabold px-2.5 py-1 rounded-full bg-cyan-600 text-white">
                {notifications.length}
              </span>
            )}
          </h2>

          {notifications.length === 0 ? (
            <div className="text-center text-gray-500 bg-white p-12 rounded-xl border border-slate-200 flex flex-col items-center gap-4">
              <Bell className="w-16 h-16 text-slate-400" />
              <h3 className="text-2xl font-bold">Nothing New</h3>
              <p>
                Approvals, project quota token updates, and departmental alerts
                will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((note, index) => {
                const id = note._id || note.id || `note-${index}`;
                const { Icon, ring, tint, ink } =
                  TYPE_STYLES[note.type] || TYPE_STYLES.info;
                const isQuotaRequest =
                  note.title?.toLowerCase().includes("quota request") ||
                  note.message?.includes("Token #PQT-") ||
                  note.message?.toLowerCase().includes("quota");

                const isChangeTicket =
                  note.title?.toLowerCase().includes("ticket") ||
                  note.message?.includes("Token #CT-") ||
                  note.message?.includes("Ticket #");

                const tokenMatch = (note.message || "").match(/Token #(PQT-[A-Za-z0-9-]+)/i);
                const tokenNumber = tokenMatch ? tokenMatch[1] : "";

                return (
                  <div
                    key={id}
                    className={`bg-white border ${ring} rounded-xl shadow-lg p-4 flex items-start gap-4 transition hover:shadow-cyan-100`}
                  >
                    <div className={`p-2 rounded-full ${tint} flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${ink}`} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{note.title}</p>
                        <span className="text-xs text-gray-400">
                          {timeAgo(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 break-words">
                        {note.message}
                      </p>

                      {/* Action for Faculty Quota Tokens (Admins / Coordinators) */}
                      {isQuotaRequest && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                            Faculty Project Quota Request
                          </span>
                          <Link
                            to={`/teacher/tickets?tab=admin_quota${tokenNumber ? `&token=${encodeURIComponent(tokenNumber)}` : ""}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm border-2 border-black transition active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Review & Approve Request</span>
                            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                          </Link>
                        </div>
                      )}

                      {/* Action for Student Change Tickets */}
                      {isChangeTicket && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-900 border border-cyan-200 text-xs font-bold">
                            <Ticket className="w-3.5 h-3.5 text-cyan-700" />
                            Student Change Ticket
                          </span>
                          <Link
                            to="/teacher/tickets?tab=tickets"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm border-2 border-black transition active:scale-95"
                          >
                            <span>Review Ticket</span>
                            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                          </Link>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDismiss(id)}
                      title="Dismiss"
                      className="p-2 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 transition flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
