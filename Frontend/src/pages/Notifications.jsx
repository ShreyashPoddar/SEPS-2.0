import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPendingInvitations,
  respondToInvitation,
  getNotifications,
  deleteNotification,
  getCurrentUser,
  logoutUser,
} from "../api";
import { toast, Toaster } from "react-hot-toast";
import {
  Loader,
  Bell,
  Check,
  X,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Trash2,
} from "lucide-react";
import Navbar from "../components/Navbar";

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
  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([getPendingInvitations(), getNotifications()])
      .then(([invRes, noteRes]) => {
        setInvitations(invRes.data || []);
        // Backend returns { success, notifications }; tolerate a bare array too.
        const list = Array.isArray(noteRes.data)
          ? noteRes.data
          : noteRes.data?.notifications || [];
        setNotifications(list);
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
        toast.error("Could not load notifications.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data.role !== "student") {
          navigate("/teacher-dashboard");
        } else {
          setUser(res.data);
          fetchData();
        }
      })
      .catch(() => navigate("/login"));
  }, [navigate, fetchData]);

  const handleInvitationResponse = (applicationId, memberId, response) => {
    setInvitations((prev) =>
      prev.filter((invite) => invite.applicationId !== applicationId)
    );

    toast.promise(respondToInvitation({ applicationId, memberId, response }), {
      loading: "Submitting your response...",
      success: (res) => res.data.message,
      error: (err) => {
        fetchData(); // refresh if error
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
      toast.error(err.response?.data?.message || "Could not dismiss notification.");
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
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader className="w-10 h-10 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
      <Toaster position="top-right" />
      <div className="relative max-w-4xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar
          user={user}
          handleLogout={handleLogout}
          notificationCount={invitations.length + notifications.length}
        />

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
                  className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex flex-wrap items-center justify-between gap-4 transition hover:shadow-cyan-100 hover:border-cyan-300"
                >
                  <div className="flex-grow">
                    <p className="text-gray-700">
                      <span className="font-bold">{invite.leaderName}</span> has
                      invited you to join a group for the project:
                    </p>
                    <p className="text-cyan-700 font-semibold">
                      {invite.projectTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      Faculty: {invite.facultyName}
                    </p>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      onClick={() =>
                        handleInvitationResponse(
                          invite.applicationId,
                          invite.memberId,
                          "approved"
                        )
                      }
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition"
                    >
                      <Check size={16} /> Accept
                    </button>
                    <button
                      onClick={() =>
                        handleInvitationResponse(
                          invite.applicationId,
                          invite.memberId,
                          "rejected"
                        )
                      }
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-semibold transition"
                    >
                      <X size={16} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
                Approvals, rejections and roster changes from your faculty guide
                will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((note) => {
                const { Icon, ring, tint, ink } =
                  TYPE_STYLES[note.type] || TYPE_STYLES.info;
                const id = note._id || note.id;

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
