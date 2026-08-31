import React, { useEffect, useState, useCallback } from "react";
import {
  getAllProjects,
  getCurrentUser,
  logoutUser,
  getPendingInvitations,
  getGlobalDeadline
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
  Filter
} from "lucide-react";
import Navbar from "../components/Navbar";
import ApplyModal from "../components/ApplyModal";
import TicketTrackerWidget from "../components/TicketTrackerWidget";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [globalDeadline, setGlobalDeadline] = useState("");
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [appliedProjectIds, setAppliedProjectIds] = useState(new Set());
  const [selectedProject, setSelectedProject] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomains, setSelectedDomains] = useState([]);

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

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data?.role !== "student") {
          navigate("/teacher-dashboard");
        } else {
          setUser(res.data);
          fetchInvitations();
        }
      })
      .catch(() => navigate("/login"));

    getAllProjects()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
        setProjects(list);
        setFilteredProjects(list);
      })
      .catch(() => toast.error("Could not load available projects."));

    getGlobalDeadline()
      .then((res) => {
        if (res.data?.deadline) {
          setGlobalDeadline(new Date(res.data.deadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }));
        }
      })
      .catch(() => setGlobalDeadline(""));
  }, [navigate, fetchInvitations]);

  useEffect(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.projectTitle || "").toLowerCase().includes(q) ||
        (p.facultyName || "").toLowerCase().includes(q) ||
        (p.domain || "").toLowerCase().includes(q)
      );
    }

    if (selectedDomains.length > 0) {
      filtered = filtered.filter((p) => selectedDomains.includes(p.domain));
    }

    setFilteredProjects(filtered);
  }, [searchQuery, selectedDomains, projects]);

  const handleApplySuccess = (projectId) => {
    setAppliedProjectIds((prev) => new Set(prev).add(projectId));
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      <Toaster position="top-right" />

      {/* Apply Modal */}
      {selectedProject && (
        <ApplyModal
          project={selectedProject}
          currentUser={user}
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
                  Centralized Capstone Submission Window
                </p>
                <h4 className="text-sm font-extrabold text-slate-950">
                  Global Project Allocation Deadline: <span className="text-cyan-700">{globalDeadline}</span>
                </h4>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300">
                <span>{user.department || "Dept of ECE"}</span>
                <span>•</span>
                <span>
                  {user.internshipStatus === "internship" ? "💼 Corporate Internship" : "🎓 Regular On-Campus"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 🎫 LIVE ROSTER & TICKET TRACKER PORTAL WIDGET */}
        <TicketTrackerWidget currentUser={user} />

        {/* Available Projects Section with Sidebar Filter */}
        <div className="lg:flex lg:gap-8 mt-8">
          {/* Domain Filter Sidebar */}
          <aside className="w-full lg:w-72 mb-8 lg:mb-0 bg-white p-5 rounded-3xl shadow-lg border-2 border-slate-900 h-fit lg:sticky top-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-900" />
                <span>Filter by Domain</span>
              </h3>
              {selectedDomains.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDomains([])}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[40vh] lg:max-h-[60vh] overflow-y-auto pr-1">
              {domainOptions.map((domain) => {
                const isSelected = selectedDomains.includes(domain);
                return (
                  <label
                    key={domain}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold cursor-pointer transition select-none ${
                      isSelected
                        ? "bg-slate-950 text-white font-bold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDomain(domain)}
                      className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="truncate">{domain}</span>
                  </label>
                );
              })}
            </div>
          </aside>

          {/* Project List */}
          <main className="flex-1 space-y-6">
            {/* Search Bar */}
            <div className="flex items-center bg-white border-2 border-slate-900 rounded-2xl px-4 py-3 shadow-md focus-within:ring-2 focus-within:ring-black transition">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                placeholder="Search projects by title, faculty advisor, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm font-medium"
              />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-slate-900" />
                <span>Available Capstone Projects ({filteredProjects.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProjects.map((p) => {
                const isApplied = appliedProjectIds.has(p._id);

                return (
                  <div
                    key={p._id}
                    className="bg-white rounded-3xl shadow-lg border-2 border-slate-900 p-6 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-xl space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-300 truncate">
                          {p.domain}
                        </span>
                        {p.vacancies && (
                          <span className="text-[10px] font-bold text-slate-500">
                            {p.vacancies} Vacanc{p.vacancies === 1 ? "y" : "ies"}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-extrabold text-slate-950 leading-snug">
                        {p.projectTitle}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed font-medium">
                        {p.description}
                      </p>

                      <div className="text-xs text-slate-700 space-y-1.5 border-t border-slate-200 pt-3 mt-4">
                        <p>
                          <strong>Faculty Guide:</strong> {p.facultyName}
                        </p>
                        {p.prerequisites && (
                          <p className="text-slate-500">
                            <strong>Prerequisites:</strong> {p.prerequisites}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProject(p)}
                      disabled={isApplied}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-extrabold text-xs sm:text-sm border-2 border-black transition shadow-md ${
                        isApplied
                          ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed"
                          : "bg-slate-950 hover:bg-slate-800 text-white hover:scale-102 active:scale-98"
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Apply as Team Leader</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
