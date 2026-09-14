import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getAllProjects,
  getCurrentUser,
  logoutUser,
  getPendingInvitations,
  getGlobalDeadline,
  isStudentProfileComplete,
  getMyApplications,
} from "../api";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import {
  BookOpen,
  Send,
  CheckCircle,
  Search,
  Users,
  Briefcase,
  GraduationCap,
  Sparkles,
  Calendar,
  Building2,
  Filter,
  X,
  SlidersHorizontal,
  RotateCcw,
  Layers,
  UserCheck,
  FolderOpen,
  FolderGit2,
  Lock
} from "lucide-react";
import Navbar from "../components/Navbar";
import ApplyModal from "../components/ApplyModal";
import TicketTrackerWidget from "../components/TicketTrackerWidget";
import { parseStreams } from "../utils/streamUtils";
import { getStudentDisplayDepartment } from "../utils/departmentUtils";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [globalDeadline, setGlobalDeadline] = useState("");
  const [user, setUser] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Advanced Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedStream, setSelectedStream] = useState("all");
  const [vacancyFilter, setVacancyFilter] = useState("all"); // 'all' | 'available_only'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'title_asc' | 'title_desc' | 'faculty' | 'vacancies'

  const domainOptions = [
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

  const fetchInvitations = useCallback(() => {
    getPendingInvitations()
      .then((res) => setInvitations(res.data || []))
      .catch((err) => console.error("Failed to fetch invitations:", err));
  }, []);

  const fetchMyApplications = useCallback(() => {
    getMyApplications()
      .then((res) => setMyApplications(res.data || []))
      .catch((err) => console.error("Failed to fetch my applications:", err));
  }, []);

  const loadProjects = useCallback(() => {
    setLoading(true);
    getAllProjects()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
        setProjects(list);
      })
      .catch(() => toast.error("Could not load available projects."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data?.role !== "student") {
          navigate("/teacher-dashboard");
        } else if (!isStudentProfileComplete(res.data)) {
          toast.error("Please complete and save your profile before accessing the dashboard.", {
            id: "profile-required-toast",
            duration: 5000,
          });
          navigate("/student-profile", { replace: true, state: { profileRequired: true } });
        } else {
          setUser(res.data);
          fetchInvitations();
          fetchMyApplications();
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate("/login");
        } else {
          toast.error("Session verification delayed. Connecting to server...");
        }
      });

    loadProjects();

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
      .catch(() => setGlobalDeadline(""));
  }, [navigate, fetchInvitations, loadProjects]);

  // Extract distinct faculties from current projects for dynamic filter dropdown
  const facultyOptions = useMemo(() => {
    const names = new Set();
    projects.forEach((p) => {
      if (p.facultyName) names.add(p.facultyName);
    });
    return Array.from(names).sort();
  }, [projects]);


  // Extract distinct streams from current projects (individualized)
  const streamOptions = useMemo(() => {
    const streams = new Set();
    projects.forEach((p) => {
      parseStreams(p.stream).forEach((s) => streams.add(s));
    });
    return Array.from(streams).sort();
  }, [projects]);

  // Count projects per domain for domain pills
  const domainCounts = useMemo(() => {
    const counts = {};
    domainOptions.forEach((d) => (counts[d] = 0));
    projects.forEach((p) => {
      if (p.domain && counts[p.domain] !== undefined) {
        counts[p.domain] += 1;
      }
    });
    return counts;
  }, [projects, domainOptions]);

  // Filter & Sort Logic
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // 1. Search Query (Title, Faculty, Domain, Prerequisites, Description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.projectTitle || "").toLowerCase().includes(q) ||
          (p.facultyName || "").toLowerCase().includes(q) ||
          (p.domain || "").toLowerCase().includes(q) ||
          (p.prerequisites || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.stream || "").toLowerCase().includes(q)
      );
    }

    // 2. Domain Filter
    if (selectedDomains.length > 0) {
      result = result.filter((p) => selectedDomains.includes(p.domain));
    }

    // 3. Faculty Filter
    if (selectedFaculty !== "all") {
      result = result.filter((p) => p.facultyName === selectedFaculty);
    }

    // 4. Stream Filter (matches if any individual stream matches)
    if (selectedStream !== "all") {
      result = result.filter((p) =>
        parseStreams(p.stream).some(
          (s) => s.toLowerCase() === selectedStream.toLowerCase()
        )
      );
    }

    // 5. Vacancy Filter
    if (vacancyFilter === "available_only") {
      result = result.filter((p) => (p.vacancies || 0) > 0);
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "title_asc") {
        return (a.projectTitle || "").localeCompare(b.projectTitle || "");
      }
      if (sortBy === "title_desc") {
        return (b.projectTitle || "").localeCompare(a.projectTitle || "");
      }
      if (sortBy === "faculty") {
        return (a.facultyName || "").localeCompare(b.facultyName || "");
      }
      if (sortBy === "vacancies") {
        return (b.vacancies || 0) - (a.vacancies || 0);
      }
      return 0;
    });

    return result;
  }, [
    projects,
    searchQuery,
    selectedDomains,
    selectedFaculty,
    selectedStream,
    vacancyFilter,
    sortBy,
  ]);

  const appliedProjectsMap = useMemo(() => {
    const map = new Map();
    myApplications.forEach((app) => {
      if (app.projectId) {
        map.set(app.projectId, app);
      }
    });
    return map;
  }, [myApplications]);

  const applicationCount = myApplications.length;
  const hasReachedMaxLimit = applicationCount >= 2;
  const isAllocated = myApplications.some((app) => app.status === "approved" || app.teamId);
  const nextPriority = applicationCount === 0 ? 1 : applicationCount === 1 ? 2 : null;

  const handleApplySuccess = (projectId) => {
    fetchMyApplications();
    loadProjects();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const toggleDomain = (domain) => {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedDomains([]);
    setSelectedFaculty("all");
    setSelectedStream("all");
    setVacancyFilter("all");
    setSortBy("newest");
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedDomains.length > 0 ||
      selectedFaculty !== "all" ||
      selectedStream !== "all" ||
      vacancyFilter !== "all"
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      <Toaster position="top-right" />

      {/* Apply Modal */}
      {selectedProject && (
        <ApplyModal
          project={selectedProject}
          currentUser={user}
          nextPriority={nextPriority}
          onClose={() => setSelectedProject(null)}
          onApplySuccess={handleApplySuccess}
        />
      )}

      <div className="relative max-w-7xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar
          user={user}
          handleLogout={handleLogout}
          notificationCount={invitations.length}
        />

        {/* Global Deadline Banner */}
        {globalDeadline && (
          <div className="mb-8 p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-md flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-950 text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Centralized Major Project Allocation Window
                </p>
                <h4 className="text-sm font-extrabold text-slate-950">
                  Global Registration Deadline:{" "}
                  <span className="text-cyan-700">{globalDeadline}</span>
                </h4>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300">
                <span>{getStudentDisplayDepartment(user)}</span>
                <span>•</span>
                <span>
                  {user.internshipCompany ? (
                    `💼 ${user.internshipCompany}${user.internshipDuration ? ` (${user.internshipDuration})` : ""}`
                  ) : user.internshipStatus === "internship" ? (
                    "💼 Corporate Internship"
                  ) : (
                    "🎓 Regular On-Campus"
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 🏛️ INSTITUTIONAL MENTORSHIP & SECTION ALLOCATION CARD */}
        {user && (
          <div className="mb-8 p-5 bg-white rounded-3xl border-2 border-slate-900 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Left: Section & Student Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-cyan-600/20">
                  {user.section?.name || user.sectionName || "A"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Official Allocation</span>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                      Section {user.section?.name || user.sectionName || "A"}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-950 mt-0.5">
                    {getStudentDisplayDepartment(user)}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Academic Year 2026-2027 • IV Year Major Project Cohort
                  </p>
                </div>
              </div>

              {/* Right: Faculty Advisor & HOD Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:border-l lg:border-slate-200 lg:pl-6">
                {/* Faculty Advisor */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 transition shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center text-lg font-bold flex-shrink-0">
                    👨‍🏫
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black text-blue-800 tracking-wider">Faculty Advisor</p>
                    <p className="text-xs font-black text-slate-900 truncate">
                      {user.facultyAdvisor?.fullName || "Dr. M. K. Srilekha"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {user.facultyAdvisor?.email || "srilekhm@srmist.edu.in"}
                    </p>
                  </div>
                </div>

                {/* HOD */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-400 transition shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center text-lg font-bold flex-shrink-0">
                    🏛️
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black text-indigo-800 tracking-wider">Head of Department (HOD)</p>
                    <p className="text-xs font-black text-slate-900 truncate">
                      {user.departmentRel?.hod?.fullName || "Dr. S. Ramesh Kumar"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {user.departmentRel?.hod?.email || "hodece@srmist.edu.in"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎫 LIVE ROSTER & TICKET TRACKER PORTAL WIDGET */}
        <TicketTrackerWidget currentUser={user} />

        {/* 🔍 TOP-TIER FILTERING & DISCOVERY CONTROL PANEL */}
        <div className="mt-8 bg-white rounded-3xl border-2 border-slate-900 shadow-xl p-5 sm:p-7 space-y-6">
          {/* Header & Result Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
                  <SlidersHorizontal className="w-6 h-6 text-slate-950" />
                  <span>Major Project Directory</span>
                </h2>

                {/* 🎯 APPLICATION QUOTA BADGE (MAX 2) */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border-2 flex items-center gap-1.5 shadow-sm ${
                    hasReachedMaxLimit || isAllocated
                      ? "bg-slate-900 text-white border-slate-950"
                      : applicationCount === 1
                      ? "bg-amber-100 text-amber-950 border-amber-400"
                      : "bg-cyan-100 text-cyan-950 border-cyan-400"
                  }`}
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>
                    Applications: {applicationCount} / 2 Max
                    {hasReachedMaxLimit
                      ? " (Limit Reached)"
                      : isAllocated
                      ? " (Allocated)"
                      : applicationCount === 1
                      ? " (Priority 2 Available)"
                      : " (Priority 1 Available)"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Students can apply for up to 2 projects (Priority 1 & 2). Explore and assemble your 3-member team.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-slate-950 text-white font-extrabold text-xs">
                {filteredProjects.length} {filteredProjects.length === 1 ? "Project" : "Projects"} Found
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold text-xs transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All</span>
                </button>
              )}
            </div>
          </div>

          {/* Primary Controls Row: Search + Faculty + Stream + Availability + Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3.5">
            {/* Search Bar */}
            <div className="md:col-span-4 relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, faculty advisor, domain, prerequisites..."
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

            {/* Faculty Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black transition"
              >
                <option value="all">👨‍🏫 All Faculty</option>
                {facultyOptions.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            {/* Stream Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black transition"
              >
                <option value="all">🎓 All Streams</option>
                {streamOptions.map((str) => (
                  <option key={str} value={str}>
                    {str}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability / Vacancies Filter */}
            <div className="md:col-span-2">
              <select
                value={vacancyFilter}
                onChange={(e) => setVacancyFilter(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black transition"
              >
                <option value="all">👥 All Slots</option>
                <option value="available_only">🟢 Open Slots Only</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black transition"
              >
                <option value="newest">🕒 Newest First</option>
                <option value="title_asc">🔤 Title (A - Z)</option>
                <option value="title_desc">🔤 Title (Z - A)</option>
                <option value="faculty">👨‍🏫 Faculty (A - Z)</option>
                <option value="vacancies">⚡ Most Vacancies</option>
              </select>
            </div>
          </div>

          {/* Domain Pills Filter Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-900" />
                <span>Filter by Research & Technical Domains</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDomains(selectedDomains.length === domainOptions.length ? [] : [...domainOptions])}
                  className="text-[11px] font-bold text-slate-600 hover:text-black transition hover:underline"
                >
                  {selectedDomains.length === domainOptions.length ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedDomains([])}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition border-2 ${
                  selectedDomains.length === 0
                    ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
              >
                All Domains ({projects.length})
              </button>

              {domainOptions.map((domain) => {
                const isSelected = selectedDomains.includes(domain);
                const count = domainCounts[domain] || 0;

                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => toggleDomain(domain)}
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

          {/* Active Filter Chips Strip */}
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

              {selectedDomains.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-100 border border-cyan-300 text-xs font-semibold text-cyan-950"
                >
                  {d}
                  <button onClick={() => toggleDomain(d)} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {selectedFaculty !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-800">
                  Faculty: {selectedFaculty}
                  <button onClick={() => setSelectedFaculty("all")} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedStream !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-300 text-xs font-semibold text-blue-950">
                  Stream: {selectedStream}
                  <button onClick={() => setSelectedStream("all")} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {vacancyFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-semibold text-emerald-950">
                  Open Vacancies
                  <button onClick={() => setVacancyFilter("all")} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 📚 PROJECT CARDS GRID / EMPTY STATES */}
        <div className="mt-8">
          {loading ? (
            <div className="p-16 bg-white rounded-3xl border-2 border-slate-900 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-slate-900 border-t-cyan-500 rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">Loading major project directory...</p>
            </div>
          ) : projects.length === 0 ? (
            /* Empty state when NO projects exist in the portal */
            <div className="p-12 sm:p-16 bg-white rounded-3xl border-2 border-slate-900 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center mx-auto text-slate-600">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-950">No Major Projects Uploaded Yet</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                  Faculty guides are currently uploading approved project listings for this semester's allocation cycle. Check back shortly to submit your team application!
                </p>
              </div>
              <button
                onClick={loadProjects}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh Directory</span>
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            /* Empty state when filter yields 0 matches */
            <div className="p-12 sm:p-16 bg-white rounded-3xl border-2 border-slate-900 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center mx-auto text-amber-700">
                <Search className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-950">No Matching Projects Found</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                  We couldn't find any major projects matching your search query or active filter tags.
                </p>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters & Show All Projects</span>
              </button>
            </div>
          ) : (
            /* Active Project Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((p) => {
                const appliedApp = appliedProjectsMap.get(p._id);
                const isApplied = Boolean(appliedApp);

                return (
                  <div
                    key={p._id}
                    className="bg-white rounded-3xl shadow-lg border-2 border-slate-900 p-6 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-2xl space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-300 truncate">
                          {p.domain}
                        </span>
                        {p.vacancies !== undefined && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              p.vacancies > 0
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-red-50 text-red-800 border-red-300"
                            }`}
                          >
                            {p.vacancies} Vacanc{p.vacancies === 1 ? "y" : "ies"}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-slate-950 leading-snug">
                        {p.projectTitle}
                      </h3>

                      {/* Eligible Streams Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Streams:</span>
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
                            All Branches
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed font-medium">
                        {p.description}
                      </p>

                      <div className="text-xs text-slate-700 space-y-1.5 border-t border-slate-200 pt-3 mt-4">
                        <p className="flex items-center gap-1.5">
                          <strong>Faculty Guide:</strong> <span>{p.facultyName}</span>
                        </p>
                        {p.prerequisites && (
                          <p className="text-slate-500 line-clamp-1">
                            <strong>Prerequisites:</strong> {p.prerequisites}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProject(p)}
                      disabled={isApplied || hasReachedMaxLimit || isAllocated}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-extrabold text-xs sm:text-sm border-2 border-black transition shadow-md ${
                        isApplied
                          ? "bg-emerald-50 text-emerald-900 border-emerald-500 cursor-not-allowed"
                          : hasReachedMaxLimit || isAllocated
                          ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed"
                          : "bg-slate-950 hover:bg-slate-800 text-white hover:scale-102 active:scale-98"
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Applied ({appliedApp.priority ? `Priority ${appliedApp.priority}` : "Submitted"})</span>
                        </>
                      ) : hasReachedMaxLimit ? (
                        <>
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>Application Limit Reached (Max 2)</span>
                        </>
                      ) : isAllocated ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Allocated to Project</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Apply as Team Leader {nextPriority ? `(Priority ${nextPriority})` : ""}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
