import React, { useEffect, useState, useCallback } from "react";
import {
  createProject,
  deleteProject,
  getCurrentUser,
  logoutUser,
  getTeacherProjects,
  getGlobalDeadline,
  getFacultyTickets,
  getNotifications,
} from "../api";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Users,
  Trash2,
  Loader,
  AlertCircle,
  CheckCircle,
  Edit,
  ChevronDown,
  Calendar,
  FolderOpen,
  SlidersHorizontal,
  Ticket,
  ArrowRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import SpecializationDropdown from "../components/SpecializationDropdown";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { parseStreams } from "../utils/streamUtils";

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-slate-900 max-w-sm w-full text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-red-100 border-2 border-red-300 flex items-center justify-center mx-auto text-red-600">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-950">Confirm Deletion</h3>
        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
          {message}
        </p>
      </div>
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-full text-slate-800 font-bold text-xs transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 border-2 border-red-900 rounded-full text-white font-bold text-xs shadow-md transition active:scale-95"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [globalDeadline, setGlobalDeadline] = useState("");
  const [newProject, setNewProject] = useState({
    projectTitle: "",
    description: "",
    stream: "",
    domain: "",
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isUploadFormVisible, setIsUploadFormVisible] = useState(false);

  const [notification, setNotification] = useState({ message: "", type: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 4000);
  };

  const loadProjectsForCurrentUser = useCallback(() => {
    getTeacherProjects()
      .then((res) => {
        setProjects(Array.isArray(res.data) ? res.data : (res.data?.projects || []));
      })
      .catch((err) => {
        console.error("Error loading projects:", err);
        showNotification("Could not load your projects.");
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const loadTicketsAndNotifications = useCallback(() => {
    getFacultyTickets()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const pending = list.filter((t) => t.status === "pending" || t.status === "in_review").length;
        setPendingTicketsCount(pending);
      })
      .catch((err) => console.error("Error loading tickets:", err));

    getNotifications()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.notifications || [];
        setNotificationCount(list.length);
      })
      .catch((err) => console.error("Error loading notifications:", err));
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        const currentUser = res.data;
        if (!currentUser || currentUser.role !== "teacher") {
          navigate(currentUser ? "/student-dashboard" : "/login");
          return;
        }
        setUser(currentUser);
        loadProjectsForCurrentUser();
        loadTicketsAndNotifications();
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate("/login");
        } else {
          showNotification("Session verification delayed. Connecting to server...", "error");
        }
      });

    getGlobalDeadline()
      .then((res) => {
        if (res.data?.deadline) {
          setGlobalDeadline(
            new Date(res.data.deadline).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          );
        }
      })
      .catch((err) => console.error("Error fetching deadline:", err));
  }, [navigate, loadProjectsForCurrentUser, loadTicketsAndNotifications]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (projects.length >= 2) {
      showNotification("You cannot upload more than 2 projects.");
      return;
    }

    setLoading(true);
    try {
      await createProject({
        ...newProject,
        facultyName: user?.fullName || "Faculty Member",
      });
      setNewProject({
        projectTitle: "",
        description: "",
        stream: "",
        domain: "",
      });
      setIsUploadFormVisible(false);
      showNotification("Project uploaded successfully!", "success");
      loadProjectsForCurrentUser();
    } catch (error) {
      console.error("Upload error:", error);
      showNotification(error.response?.data?.message || "Failed to upload project.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (projectId) => {
    setConfirmDelete(projectId);
  };

  const confirmDeletion = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProject(confirmDelete);
      showNotification("Project deleted successfully!", "success");
      loadProjectsForCurrentUser();
    } catch (error) {
      console.error("Delete error:", error);
      showNotification(error.response?.data?.message || "Failed to delete project.");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleViewApplications = (projectId) => {
    navigate(`/teacher/project-applications/${projectId}`);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  const allowedEmails = [
    "sangeetm@srmist.edu.in",
    "vadivukk@srmist.edu.in",
    "elavelvg@srmist.edu.in",
  ];

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader className="w-10 h-10 text-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {notification.message && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border-2 ${
            notification.type === "success"
              ? "bg-emerald-600 text-white border-emerald-800"
              : "bg-red-600 text-white border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white" />
          )}
          <span className="text-xs sm:text-sm font-extrabold">{notification.message}</span>
        </div>
      )}

      {confirmDelete && (
        <ConfirmationModal
          message="Are you sure you want to delete this project? This will remove all associated applications and cannot be undone."
          onConfirm={confirmDeletion}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="relative max-w-7xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar
          user={user}
          handleLogout={handleLogout}
          notificationCount={notificationCount}
          pendingTicketsCount={pendingTicketsCount}
        />

        {/* Action Required: Pending Change Tickets Alert Banner */}
        {pendingTicketsCount > 0 && (
          <div className="mb-8 p-5 rounded-3xl bg-amber-50 border-2 border-amber-400 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-sm flex-shrink-0">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                    Action Required
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950">
                    {pendingTicketsCount} Pending Student Change Ticket{pendingTicketsCount > 1 ? "s" : ""}
                  </h3>
                </div>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  Students have submitted member modification or project cancellation requests requiring your review.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/teacher/tickets")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md border-2 border-black transition active:scale-95 flex-shrink-0"
            >
              <span>Review Tickets ({pendingTicketsCount})</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        )}

        {/* Global Deadline Banner */}
        {globalDeadline && (
          <div className="mb-8 p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-md flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-950 text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                  Central Major Project Deadline
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Final date for student team formation and application submissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-black">
              <span>🗓️ {globalDeadline}</span>
            </div>
          </div>
        )}

        {/* Coordinator Controls */}
        {user && allowedEmails.includes(user.email) && (
          <div className="mb-6 flex justify-end gap-3 flex-wrap">
            <button
              onClick={() => navigate("/teacher/set-global-deadline")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 rounded-full font-bold text-xs border-2 border-slate-900 shadow-sm transition"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              <span>Set Global Deadline</span>
            </button>
            <button
              onClick={() => navigate("/teacher/statistics-report")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-full font-bold text-xs border-2 border-slate-900 shadow-sm transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Statistics Report</span>
            </button>
          </div>
        )}

        {/* Upload Project Trigger Banner */}
        <div className="mb-8">
          <button
            onClick={() => setIsUploadFormVisible(!isUploadFormVisible)}
            className="w-full flex justify-between items-center p-5 bg-white rounded-3xl shadow-md border-2 border-slate-900 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-slate-950 text-cyan-400 border border-slate-800">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  Upload a New Major Project
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Propose major project topics with eligible streams for prospective student teams
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-extrabold text-slate-800">
                {projects.length}/2 Projects Created
              </span>
              <motion.div
                animate={{ rotate: isUploadFormVisible ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-900"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </div>
          </button>
        </div>

        {/* Collapsible Upload Form */}
        <AnimatePresence>
          {isUploadFormVisible && (
            <motion.section
              key="upload-form"
              initial={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0, overflow: "hidden" }}
              animate={{
                height: "auto",
                opacity: 1,
                marginTop: "-1rem",
                marginBottom: "2.5rem",
                transitionEnd: { overflow: "visible" },
              }}
              exit={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0, overflow: "hidden" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-2 border-slate-900">
                <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">New Project Submission</h3>
                    <p className="text-xs text-slate-500 font-medium">Specify topic details, research domains, and eligible streams</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-cyan-50 text-cyan-900 border border-cyan-300 rounded-full">
                    Faculty: {user?.fullName || "You"}
                  </span>
                </div>

                <form onSubmit={handleUpload} className="space-y-5">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                      Project Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Real-time EMG Signal Analysis with Edge AI"
                      value={newProject.projectTitle}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          projectTitle: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black focus:bg-white transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                      Description & Scope
                    </label>
                    <textarea
                      placeholder="Provide a detailed description of the project problem statement, methodology, and requirements..."
                      value={newProject.description}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black focus:bg-white transition"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="relative z-20">
                      <SpecializationDropdown
                        value={newProject.stream}
                        onChange={(val) =>
                          setNewProject({
                            ...newProject,
                            stream: val,
                          })
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                        Research & Technical Domain
                      </label>
                      <select
                        value={newProject.domain}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            domain: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black transition"
                        required
                      >
                        <option value="">Select Domain</option>
                        <option>Antenna design and RF systems</option>
                        <option>AI/ML/DL based applications</option>
                        <option>Automation and Robotics</option>
                        <option>Audio, Speech signal Processing</option>
                        <option>Biomedical Electronics</option>
                        <option>Embedded Systems and IoT</option>
                        <option>Image and Video Processing</option>
                        <option>Multi disciplinary</option>
                        <option>Optical Communication</option>
                        <option>Semiconductor material & Devices</option>
                        <option>VLSI Design</option>
                        <option>Wireless Communication</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || projects.length >= 2}
                      className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-full border-2 border-black shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader className="animate-spin w-4 h-4" />
                          <span>Uploading Project...</span>
                        </>
                      ) : projects.length >= 2 ? (
                        "Max Limit Reached (2 Projects Maximum)"
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-cyan-400" />
                          <span>Upload Major Project</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Your Uploaded Projects Section */}
        <section className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
                <SlidersHorizontal className="w-6 h-6 text-slate-950" />
                <span>Your Uploaded Projects</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage your proposed major projects and review submitted team applications
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-slate-950 text-white font-extrabold text-xs">
                {projects.length} {projects.length === 1 ? "Project" : "Projects"} Active
              </span>
            </div>
          </div>

          {projects.length === 0 && !initialLoading ? (
            <div className="p-12 sm:p-16 bg-white rounded-3xl border-2 border-slate-900 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center mx-auto text-slate-600">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-950">No Projects Uploaded Yet</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                  Start by adding your first project above. You can propose up to 2 major projects for this semester.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadFormVisible(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Project Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => (
                <div
                  key={p._id}
                  className="bg-white rounded-3xl shadow-lg border-2 border-slate-900 p-6 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-2xl space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-300 truncate">
                        {p.domain}
                      </span>
                      <button
                        onClick={() => navigate(`/teacher/update-project/${p._id}`)}
                        className="flex-shrink-0 flex items-center gap-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold transition"
                      >
                        <Edit size={11} /> Edit
                      </button>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-950 leading-snug">
                      {p.projectTitle}
                    </h3>

                    {/* Eligible Streams Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Streams:
                      </span>
                      {parseStreams(p.stream).length > 0 ? (
                        parseStreams(p.stream).map((str, idx) => (
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

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed font-medium">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => handleViewApplications(p._id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full font-bold text-xs border-2 transition shadow-sm ${
                        (p.applicationsCount || 0) > 0
                          ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-800 ring-2 ring-cyan-400/50"
                          : "bg-slate-950 hover:bg-slate-800 text-white border-black"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-cyan-300" />
                      <span>
                        Applications
                        {(p.applicationsCount || 0) > 0 && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white text-cyan-950 font-black text-[10px]">
                            {p.applicationsCount}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(p._id)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-full font-bold text-xs border-2 border-red-300 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
