import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getApplicationsForProject,
  approveApplication,
  rejectApplication,
  getCurrentUser,
  logoutUser,
} from "../api";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  User,
  Users,
  Calendar,
  Loader2,
  Check,
  X,
  Inbox,
  Clock,
  Info,
  ShieldCheck,
  AlertTriangle,
  Award,
  Phone,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { parseStreams } from "../utils/streamUtils";

export default function TeacherApplications() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const fetchApplications = useCallback(() => {
    setLoading(true);
    getApplicationsForProject(id)
      .then((res) => {
        const rawApps = Array.isArray(res.data) ? res.data : (res.data?.applications || []);
        setData({
          ...(typeof res.data === "object" && !Array.isArray(res.data) ? res.data : {}),
          project: res.data?.project || { projectTitle: "Project Applications" },
          applications: rawApps,
        });
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load applications.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleAccept = (applicationId) => {
    toast.promise(approveApplication(applicationId), {
      loading: "Approving application...",
      success: () => {
        fetchApplications(); // Refresh the list of applications
        return "Application approved successfully!";
      },
      error: (err) =>
        err.response?.data?.message || "Failed to approve application.",
    });
  };

  const handleReject = (applicationId) => {
    toast.promise(rejectApplication(applicationId), {
      loading: "Rejecting application...",
      success: () => {
        fetchApplications(); // Refresh the list of applications
        return "Application rejected.";
      },
      error: (err) =>
        err.response?.data?.message || "Failed to reject application.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center text-white">
        No data found for this project.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
      <Toaster
        position="top-right"
        toastOptions={{ className: "bg-slate-700 text-white" }}
      />
      <div className="relative max-w-7xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar
          user={user}
          handleLogout={() => {
            logoutUser();
            navigate("/login"); // redirect after logout
          }}
        />

        <div className="mb-8">
          <button
            onClick={() => navigate("/teacher-dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 rounded-full border-2 border-slate-900 font-bold text-xs shadow-sm transition mb-4"
          >
            <ArrowLeft className="w-4 h-4 text-slate-900" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3 text-slate-950 mb-1">
            <FileText className="w-7 h-7 text-slate-950" />
            <span>Review Project Applications</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">Review submitted student teams and allocate projects for this cycle</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-2 border-slate-900 mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 mb-3">
            {data.project.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            <p>
              <strong className="text-slate-900">Faculty Guide:</strong> {data.project.facultyName}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <strong className="text-slate-900">Eligible Streams:</strong>
              {parseStreams(data.project.stream).length > 0 ? (
                parseStreams(data.project.stream).map((str, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200"
                  >
                    {str}
                  </span>
                ))
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Open to All
                </span>
              )}
            </div>
          </div>
        </div>

        {data.applications.length === 0 ? (
          <div className="p-12 sm:p-16 bg-white rounded-3xl border-2 border-slate-900 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center mx-auto text-slate-600">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-black text-slate-950">No Applications Received Yet</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                Eligible students have not submitted an application for this project yet. Check back once students form teams.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {data.applications.map((app) => {
              const isPendingMembers = app.status === "pending_member_approval";
              const isReadyForReview =
                app.status === "pending_faculty_approval" || app.status === "pending";
              const isApproved = app.status === "approved";
              const confirmedMembers = (app.members || []).filter(
                (m) => m.status === "approved"
              ).length;
              const totalMembers = app.members?.length || 0;
              const hasP1Block = Boolean(app.blockingPriority1?.hasActiveP1);

              return (
                <div
                  key={app._id}
                  className={`bg-white rounded-3xl shadow-lg border-2 p-6 flex flex-col justify-between transition hover:shadow-2xl space-y-4 ${
                    app.isFirstComePriority ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-900"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-950 text-cyan-400 rounded-xl">
                        {app.applicationType === "group" ? (
                          <Users className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold capitalize text-slate-950">
                            {app.applicationType} Team Application
                          </h3>

                          {/* First-Come Queue Priority Badge */}
                          {app.isFirstComePriority ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                              <Award className="w-3 h-3 text-amber-300" />
                              <span>#1 First-Come Priority</span>
                            </span>
                          ) : app.queueRank ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                              Queue Position #{app.queueRank}
                            </span>
                          ) : null}

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                            Priority {app.priority || 1}
                          </span>

                          {isPendingMembers ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Teammate Confirmations Pending ({confirmedMembers}/{totalMembers})</span>
                            </span>
                          ) : isReadyForReview ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Ready for Faculty Review</span>
                            </span>
                          ) : isApproved ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
                              Approved & Allocated
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                              {app.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 justify-end">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(app.appliedAt || app.createdAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 py-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Applicant Team Members:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {app.members.map((member, idx) => (
                        <div
                          key={member._id || idx}
                          className={`p-3.5 rounded-2xl flex flex-col justify-between border ${
                            idx === 0
                              ? "bg-slate-50 border-cyan-300 shadow-sm"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-extrabold text-xs text-slate-900">{member.name}</p>
                                {idx === 0 && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-cyan-900 text-cyan-100 rounded">
                                    👑 Leader
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  member.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {member.status === "approved" ? "Confirmed" : "Pending"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium font-mono">
                              {member.regNo}
                            </p>
                            <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                              {member.department || "Dept of ECE"}
                            </p>

                            {/* Phone number display */}
                            {idx === 0 ? (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                {member.phoneNumber ? (
                                  <a
                                    href={`tel:${member.phoneNumber}`}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition shadow-xs"
                                    title="Call Team Leader"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-700 shrink-0" />
                                    <span>Leader Phone: {member.phoneNumber}</span>
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                    <Phone className="w-2.5 h-2.5 text-slate-400" />
                                    <span>No phone provided</span>
                                  </span>
                                )}
                              </div>
                            ) : member.phoneNumber ? (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <a
                                  href={`tel:${member.phoneNumber}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded transition"
                                  title="Call Member"
                                >
                                  <Phone className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                  <span>{member.phoneNumber}</span>
                                </a>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority 2 Gating Alert Banner */}
                  {hasP1Block && (
                    <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 font-medium flex items-start gap-3 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                          <span>Action Required: Student Priority 1 Application Active</span>
                        </p>
                        <p className="text-slate-800">
                          Student <strong>{app.blockingPriority1.memberName} ({app.blockingPriority1.memberRegNo})</strong> currently has an active Priority 1 application for <strong>"{app.blockingPriority1.p1ProjectTitle}"</strong>.
                        </p>
                        <p className="text-amber-900 font-semibold">
                          ⚠️ Under institutional policy, the student must manually close/cancel their Priority 1 application before you can approve this Priority 2 team.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-200">
                    {isPendingMembers ? (
                      <div className="w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 font-medium flex items-center gap-2.5">
                        <Info className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          <strong>Team Confirmation Pending:</strong> {confirmedMembers} of {totalMembers} members have accepted. The proposal will unlock for your official review as soon as all invited students confirm.
                        </span>
                      </div>
                    ) : isReadyForReview ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleAccept(app._id)}
                          disabled={hasP1Block}
                          title={
                            hasP1Block
                              ? `Approval locked: Student ${app.blockingPriority1.memberName} must cancel their Priority 1 project first.`
                              : "Approve this team"
                          }
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-full border-2 transition shadow-sm ${
                            hasP1Block
                              ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed"
                              : "bg-slate-950 hover:bg-slate-800 text-white border-black hover:scale-101 active:scale-99"
                          }`}
                        >
                          <Check className={`w-4 h-4 ${hasP1Block ? "text-slate-400" : "text-emerald-400"}`} />
                          <span>
                            {hasP1Block
                              ? "Approval Locked (Awaiting Student P1 Manual Closure)"
                              : "Approve Team"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleReject(app._id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 rounded-full border-2 border-red-300 transition"
                        >
                          <X className="w-4 h-4" />
                          <span>Decline Application</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-semibold text-center py-1">
                        Application status: <span className="font-bold text-slate-900 capitalize">{app.status.replace(/_/g, " ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
