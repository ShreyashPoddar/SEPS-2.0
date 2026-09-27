import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  createProject,
  deleteProject,
  getCurrentUser,
  logoutUser,
  getTeacherProjects,
  getAllProjects,
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
  AlertCircle,
  CheckCircle,
  Edit,
  ChevronDown,
  Calendar,
  FolderOpen,
  SlidersHorizontal,
  Ticket,
  ArrowRight,
  Search,
  X,
  Layers,
  RotateCcw,
  Sparkles,
  Globe,
  UserCheck,
} from "lucide-react";
import Navbar from "../components/Navbar";
import SpecializationDropdown from "../components/SpecializationDropdown";
import LoadingSpinner from "../components/LoadingSpinner";
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

const DOMAIN_OPTIONS = [
  "Antenna design and RF systems",
  "AI/ML/DL based applications",
  "Automation and Robotics",
  "Audio, Speech signal Processing",
  "Biomedical Electronics",
  "Embedded Systems and IoT",
  "Image and Video Processing",
  "Multi disciplinary",
  "Optical Communication",
  "Semiconductor material & Devices",
  "VLSI Design",
  "Wireless Communication",
];

const ALLOWED_ADMIN_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
  "hodece@srmist.edu.in",
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [allDepartmentProjects, setAllDepartmentProjects] = useState([]);
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

  // Tab & Domain-wise Filtering States for Teachers & Admins
  const [activeTab, setActiveTab] = useState("my_projects"); // 'my_projects' | 'all_topics'
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all"); // 'all' | 'approved' | 'pending'

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
        setProjects(Array.isArray(res.data) ? res.data : res.data?.projects || []);
      })
      .catch((err) => {
        console.error("Error loading projects:", err);
        showNotification("Could not load your projects.");
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const loadAllProjects = useCallback(() => {
    getAllProjects()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.projects || [];
        setAllDepartmentProjects(list);
      })
      .catch((err) => {
        console.error("Error loading department topics:", err);
      });
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
        loadAllProjects();
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
  }, [navigate, loadProjectsForCurrentUser, loadAllProjects, loadTicketsAndNotifications]);

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
      loadAllProjects();
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
      loadAllProjects();
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

  // Active dataset depending on selected tab
  const currentList = activeTab === "my_projects" ? projects : allDepartmentProjects;

  // Dynamic domain options combining predefined domains with any project domains
  const allAvailableDomains = useMemo(() => {
    const list = [...DOMAIN_OPTIONS];
    currentList.forEach((p) => {
      if (p.domain && !list.includes(p.domain)) {
        list.push(p.domain);
      }
    });
    return list;
  }, [currentList]);

  // Domain project count computation
  const domainCounts = useMemo(() => {
    const counts = {};
    allAvailableDomains.forEach((d) => (counts[d] = 0));
    currentList.forEach((p) => {
      if (p.domain) {
        counts[p.domain] = (counts[p.domain] || 0) + 1;
      }
    });
    return counts;
  }, [currentList, allAvailableDomains]);

  // Domain & Search Filtering Logic
  const filteredTopics = useMemo(() => {
    return currentList.filter((p) => {
      // 1. Domain Filter
      if (selectedDomain !== "all" && p.domain !== selectedDomain) {
        return false;
      }

      // 2. Approval Status Filter
      if (approvalFilter === "approved" && !p.isApproved) {
        return false;
      }
      if (approvalFilter === "pending" && p.isApproved) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (p.projectTitle || "").toLowerCase().includes(q);
        const matchesFaculty = (p.facultyName || "").toLowerCase().includes(q);
        const matchesDomain = (p.domain || "").toLowerCase().includes(q);
        const matchesDesc = (p.description || "").toLowerCase().includes(q);
        const matchesStream = (p.stream || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesFaculty && !matchesDomain && !matchesDesc && !matchesStream) {
          return false;
        }
      }
      return true;
    });
  }, [currentList, selectedDomain, approvalFilter, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDomain("all");
    setApprovalFilter("all");
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedDomain !== "all" || approvalFilter !== "all"
  );

  if (initialLoading) {
    return (
      <LoadingSpinner fullScreen text="Loading Teacher Portal & Project Directory..." />
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

        {/* Coordinator Controls for Allowed Teachers / Admins */}
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
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="-mt-4 mb-10 overflow-visible relative z-30"
              style={{ overflow: "visible" }}
            >
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-2 border-slate-900 overflow-visible">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-30">
                    <div className="relative z-40">
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
                        {domainOptions.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
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
                          <LoadingSpinner size="xs" color="#ffffff" />
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

        {/* 🏛️ MAJOR PROJECT TOPICS & DOMAIN FILTER SECTION (TEACHER & ADMIN) */}
        <section className="mt-8 bg-white rounded-3xl border-2 border-slate-900 shadow-xl p-5 sm:p-7 space-y-6">
          {/* Header with Navigation Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
                  <SlidersHorizontal className="w-6 h-6 text-slate-950" />
                  <span>Major Project Topics Directory</span>
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-100 text-cyan-950 border border-cyan-400">
                  {filteredTopics.length} {filteredTopics.length === 1 ? "Topic" : "Topics"} Found
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Filter and review topics domain-wise across your submissions and departmental proposals.
              </p>
            </div>

            {/* View Switcher: My Topics vs All Department Topics */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-300 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("my_projects");
                  setSelectedDomain("all");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition ${
                  activeTab === "my_projects"
                    ? "bg-slate-950 text-white shadow-md"
                    : "text-slate-700 hover:text-slate-950 hover:bg-white/60"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>My Topics ({projects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("all_topics");
                  setSelectedDomain("all");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition ${
                  activeTab === "all_topics"
                    ? "bg-slate-950 text-white shadow-md"
                    : "text-slate-700 hover:text-slate-950 hover:bg-white/60"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>All Department Topics ({allDepartmentProjects.length})</span>
              </button>
            </div>
          </div>

          {/* Primary Controls Row: Search + Domain Selector + Approval Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3.5">
            {/* Search Bar */}
            <div className="md:col-span-6 relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search topics by title, faculty advisor, domain, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Domain Dropdown Selector */}
            <div className="md:col-span-4">
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black transition"
              >
                <option value="all">🌐 All Research Domains</option>
                {allAvailableDomains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain} ({domainCounts[domain] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Approval Filter */}
            <div className="md:col-span-2">
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black transition"
              >
                <option value="all">⚡ All Statuses</option>
                <option value="approved">✅ Approved Only</option>
                <option value="pending">⏳ Pending Allocation</option>
              </select>
            </div>
          </div>

          {/* Interactive Domain Pills Filter Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-900" />
                <span>Filter Topics by Domain</span>
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600 hover:text-red-800 transition hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedDomain("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition border-2 ${
                  selectedDomain === "all"
                    ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
              >
                All Domains ({currentList.length})
              </button>

              {allAvailableDomains.map((domain) => {
                const isSelected = selectedDomain === domain;
                const count = domainCounts[domain] || 0;

                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setSelectedDomain(isSelected ? "all" : domain)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border-2 ${
                      isSelected
                        ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span>{domain}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                          isSelected ? "bg-cyan-400 text-slate-950" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Badges Strip */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-800">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedDomain !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-100 border border-cyan-300 text-xs font-semibold text-cyan-950">
                  Domain: {selectedDomain}
                  <button onClick={() => setSelectedDomain("all")} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {approvalFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-800">
                  Status: {approvalFilter === "approved" ? "Approved Only" : "Pending Allocation"}
                  <button onClick={() => setApprovalFilter("all")} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Topics Grid / Empty States */}
          {currentList.length === 0 ? (
            <div className="p-12 sm:p-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-white border-2 border-slate-300 flex items-center justify-center mx-auto text-slate-600 shadow-sm">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-950">
                  {activeTab === "my_projects"
                    ? "No Projects Uploaded Yet"
                    : "No Department Topics Available Yet"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                  {activeTab === "my_projects"
                    ? "Start by adding your first project above. You can propose up to 2 major projects for this semester."
                    : "Department faculty members have not submitted topics yet or directory is syncing."}
                </p>
              </div>
              {activeTab === "my_projects" && (
                <button
                  type="button"
                  onClick={() => setIsUploadFormVisible(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Upload Project Now</span>
                </button>
              )}
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-12 sm:p-16 bg-amber-50/60 rounded-3xl border-2 border-amber-300 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto text-amber-700">
                <Search className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-950">No Matching Topics Found</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                  We couldn't find any topics matching your active domain or keyword filter in this view.
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters & Show All Topics</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {filteredTopics.map((p) => {
                const isOwner = Boolean(
                  user &&
                    (p.teacherId === user._id ||
                      p.teacherId === user.id ||
                      (p.facultyName && user.fullName && p.facultyName.trim().toLowerCase() === user.fullName.trim().toLowerCase()) ||
                      (p.facultyEmail && user.email && p.facultyEmail.trim().toLowerCase() === user.email.trim().toLowerCase()))
                );
                const userEmail = (user?.email || "").trim().toLowerCase();
                const isCoordinator = Boolean(user && ALLOWED_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail));

                return (
                  <div
                    key={p._id || p.id}
                    className="bg-white rounded-3xl shadow-lg border-2 border-slate-900 p-6 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-2xl space-y-4"
                  >
                    <div>
                      {/* Top Row: Domain Pill + APPROVED LABEL */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-300 truncate max-w-[180px]">
                            {p.domain}
                          </span>

                          {/* 🎯 APPROVED LABEL FOR PROJECTS */}
                          {p.isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border-2 border-emerald-500 shadow-sm">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                              <span>Pending Allocation</span>
                            </span>
                          )}
                        </div>

                        {isOwner && (
                          <button
                            onClick={() => navigate(`/teacher/update-project/${p._id || p.id}`)}
                            className="flex-shrink-0 flex items-center gap-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold transition"
                          >
                            <Edit size={11} /> Edit
                          </button>
                        )}
                      </div>

                      {/* Project Title */}
                      <h3 className="text-base font-extrabold text-slate-950 leading-snug">
                        {p.projectTitle}
                      </h3>

                      {/* Faculty Guide Tag (Especially prominent when viewing All Department Topics) */}
                      {p.facultyName && (
                        <p className="text-[11px] font-extrabold text-cyan-800 mt-1 flex items-center gap-1">
                          <span>👨‍🏫 Faculty:</span>
                          <span className="text-slate-900">{p.facultyName}</span>
                          {isOwner && (
                            <span className="ml-1 text-[10px] bg-cyan-100 text-cyan-950 px-1.5 py-0.2 rounded-full font-black">
                              (You)
                            </span>
                          )}
                        </p>
                      )}

                      {/* Eligible Streams Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
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

                      {/* Project Description */}
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed font-medium">
                        {p.description}
                      </p>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
                      {isOwner || isCoordinator ? (
                        <>
                          <button
                            onClick={() => handleViewApplications(p._id || p.id)}
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
                          {isOwner && (
                            <button
                              onClick={() => handleDeleteClick(p._id || p.id)}
                              className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-full font-bold text-xs border-2 border-red-300 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between gap-2 py-1 px-1">
                          <span className="text-[11px] font-extrabold text-slate-500">
                            Applications: {p.applicationsCount || 0}
                          </span>
                          {p.isApproved ? (
                            <span className="text-[11px] font-black text-emerald-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Allocated to Team
                            </span>
                          ) : (
                            <span className="text-[11px] font-extrabold text-amber-700">
                              Open for Selection
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
