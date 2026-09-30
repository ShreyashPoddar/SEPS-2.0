import React, { useEffect, useState, useRef, useMemo } from "react";
import { getCurrentUser, getStatistics } from "../api";
import { Navigate, useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import showToast from "../utils/toastUtils";
import {
  ArrowLeft,
  Filter,
  Layers,
  Download,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Search,
  Users,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { exportReportToExcel, exportReportToPDF } from "../utils/reportExportUtils";
import FlushDatabaseModal from "../components/FlushDatabaseModal";

const ALLOWED_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
];

const DOMAINS_LIST = [
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

export default function StatisticsReport() {
  const navigate = useNavigate();
  const reportRef = useRef();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [exportScope, setExportScope] = useState("all"); // "all" | "filtered"
  const [exportingType, setExportingType] = useState(null); // null | "pdf" | "excel"
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyTab, setFacultyTab] = useState("withProjects"); // "withProjects" | "withoutProjects"
  const [studentTab, setStudentTab] = useState("withoutApplications"); // "withApplications" | "withoutApplications"
  const [isFlushModalOpen, setIsFlushModalOpen] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        setUser(res.data);
        const userEmail = (res.data?.email || "").trim().toLowerCase();
        const isAllowed = ALLOWED_EMAILS.some((e) => e.toLowerCase() === userEmail);
        if (res.data && isAllowed) {
          getStatistics()
            .then((statRes) => {
              setStats(statRes.data);
              setLoading(false);
            })
            .catch(() => {
              setError("Failed to fetch institutional statistics.");
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  // Update exportScope default if selectedDomain changes
  useEffect(() => {
    if (selectedDomain === "all") {
      setExportScope("all");
    }
  }, [selectedDomain]);

  // Filtered groups by domain and search query
  const filteredGroups = useMemo(() => {
    if (!stats?.groupDetails) return [];
    let list = stats.groupDetails;
    if (selectedDomain !== "all") {
      list = list.filter(
        (g) => (g.domain || "").toLowerCase() === selectedDomain.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) => {
        const titleMatch = (g.projectTitle || "").toLowerCase().includes(q);
        const domainMatch = (g.domain || "").toLowerCase().includes(q);
        const teacherMatch = (g.teacherName || "").toLowerCase().includes(q);
        const studentMatch = (g.students || []).some(
          (s) =>
            (s.name || "").toLowerCase().includes(q) ||
            (s.regNo || "").toLowerCase().includes(q)
        );
        return titleMatch || domainMatch || teacherMatch || studentMatch;
      });
    }
    return list;
  }, [stats, selectedDomain, searchQuery]);

  if (loading) {
    return <LoadingSpinner fullScreen text="Compiling Institutional Analytics & Reports..." />;
  }

  if (!user) return <Navigate to="/login" />;
  const currentUserEmail = (user?.email || "").trim().toLowerCase();
  const isAuthorizedAdmin = ALLOWED_EMAILS.some((e) => e.toLowerCase() === currentUserEmail);
  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border-2 border-red-300 text-center space-y-3 max-w-md shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto font-black text-xl">
            !
          </div>
          <h2 className="text-xl font-black text-slate-900">Access Denied</h2>
          <p className="text-xs text-slate-600 font-semibold">
            Administrative privileges required. Only authorized major project coordinators can view this report.
          </p>
        </div>
      </div>
    );
  }

  // Handle Export to PDF
  const handleExportPDF = () => {
    if (!stats) return;
    setExportingType("pdf");
    try {
      const effectiveScope = selectedDomain === "all" ? "all" : exportScope;
      const res = exportReportToPDF({
        stats,
        user,
        selectedDomain,
        scope: effectiveScope,
      });
      showToast.success(
        `Official PDF exported (${res.teamCount} teams across ${res.totalPages} pages)!`,
        { id: "pdf-export-toast" }
      );
    } catch (err) {
      console.error("PDF Export error:", err);
      showToast.error("Failed to generate PDF report. Please verify report data and try again.", {
        id: "pdf-export-error",
      });
    } finally {
      setExportingType(null);
    }
  };

  // Handle Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!stats) return;
    setExportingType("excel");
    try {
      const effectiveScope = selectedDomain === "all" ? "all" : exportScope;
      const res = exportReportToExcel({
        stats,
        user,
        selectedDomain,
        scope: effectiveScope,
      });
      showToast.success(
        `Excel Workbook (${res.fileName}) with 5 sheets exported successfully!`,
        { id: "excel-export-toast" }
      );
    } catch (err) {
      console.error("Excel Export error:", err);
      showToast.error("Failed to generate Excel report. Please verify report data and try again.", {
        id: "excel-export-error",
      });
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8 text-slate-900">

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-xl">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate("/teacher-dashboard")}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 transition active:scale-95 flex-shrink-0"
              title="Back to Teacher Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-slate-900" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 text-[10px] font-black uppercase tracking-wider border border-cyan-200">
                  Admin Coordinator Portal
                </span>
                <span className="hidden sm:inline text-[11px] font-extrabold text-slate-400">
                  • Department of ECE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 mt-0.5 tracking-tight">
                Central Allocation & Statistics Report
              </h1>
            </div>
          </div>

          {/* Export Action Center */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
            {/* Scope Selector (Only visible if domain filter active) */}
            {selectedDomain !== "all" && (
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-300 text-[11px] font-bold">
                <span className="px-2 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                  Scope:
                </span>
                <button
                  onClick={() => setExportScope("filtered")}
                  className={`px-2.5 py-1 rounded-xl transition ${
                    exportScope === "filtered"
                      ? "bg-slate-900 text-white shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  title={`Export only ${selectedDomain}`}
                >
                  Filtered
                </button>
                <button
                  onClick={() => setExportScope("all")}
                  className={`px-2.5 py-1 rounded-xl transition ${
                    exportScope === "all"
                      ? "bg-slate-900 text-white shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  title="Export entire department data"
                >
                  All Domains
                </button>
              </div>
            )}

            {/* Export PDF Button */}
            <button
              onClick={handleExportPDF}
              disabled={exportingType !== null || !stats}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white rounded-full font-bold text-xs shadow-md border-2 border-slate-900 transition active:scale-95 flex-shrink-0"
              title="Generate high-resolution printable PDF with complete KPIs, domain metrics and allocation sheets"
            >
              {exportingType === "pdf" ? (
                <LoadingSpinner size="xs" />
              ) : (
                <FileText className="w-4 h-4 text-rose-400" />
              )}
              <span>Export PDF</span>
              {selectedDomain !== "all" && exportScope === "filtered" && (
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded-full font-bold">
                  Filter
                </span>
              )}
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={exportingType !== null || !stats}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-full font-bold text-xs shadow-md border-2 border-emerald-950 transition active:scale-95 flex-shrink-0"
              title="Download structured multi-sheet Excel spreadsheet (.xlsx) with formulas and formatted columns"
            >
              {exportingType === "excel" ? (
                <LoadingSpinner size="xs" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              )}
              <span>Export Excel (.xlsx)</span>
              {selectedDomain !== "all" && exportScope === "filtered" && (
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-900 text-emerald-100 rounded-full font-bold">
                  Filter
                </span>
              )}
            </button>

            {/* Flush Semester Database Button */}
            <button
              onClick={() => setIsFlushModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-full font-bold text-xs shadow-md border-2 border-red-300 transition active:scale-95 flex-shrink-0"
              title="Reset and purge all semester records to start fresh for a new semester round"
            >
              <RotateCcw className="w-4 h-4 text-red-600" />
              <span>Flush Whole Data</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-2xl font-bold text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Domain Filter Bar for Admin */}
        <div className="bg-white p-5 rounded-3xl border-2 border-slate-900 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Filter Statistics by Research Domain:
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="py-2 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-black transition"
            >
              <option value="all">🌐 All Domains (Entire Department)</option>
              {DOMAINS_LIST.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>

            {selectedDomain !== "all" && (
              <button
                onClick={() => setSelectedDomain("all")}
                className="text-xs font-bold text-red-600 hover:text-red-800 transition underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div ref={reportRef} className="space-y-6">
          {stats ? (
            <>
              {/* Summary KPIs */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-600" />
                    <span>Cycle Metrics Overview</span>
                  </h2>
                  <span className="text-[11px] font-bold text-slate-500">
                    Live Database Snapshot
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Faculty Guides", value: stats.teacherCount, color: "bg-blue-50 border-blue-200 text-blue-950" },
                    { label: "Students", value: stats.studentCount, color: "bg-indigo-50 border-indigo-200 text-indigo-950" },
                    { label: "Project Topics", value: stats.projectCount, color: "bg-emerald-50 border-emerald-200 text-emerald-950" },
                    { label: "Applications", value: stats.applicationCount, color: "bg-amber-50 border-amber-200 text-amber-950" },
                    { label: "Approved Groups", value: stats.groupCount, color: "bg-cyan-50 border-cyan-200 text-cyan-950" },
                    { label: "Approved Indiv.", value: stats.individualCount, color: "bg-purple-50 border-purple-200 text-purple-950" },
                  ].map((card, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border ${card.color} text-center shadow-sm`}>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{card.label}</p>
                      <p className="text-2xl font-black mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Research Domain Topic Distribution */}
              {stats.domainCounts && (
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-cyan-600" />
                      <span>Topics Distribution by Technical Domain</span>
                    </h2>
                    <span className="text-[11px] font-bold text-slate-500">
                      Click domain to filter tables below
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(stats.domainCounts).map(([domain, count]) => {
                      const isSelected = selectedDomain === domain;
                      return (
                        <div
                          key={domain}
                          onClick={() => setSelectedDomain(isSelected ? "all" : domain)}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? "bg-slate-950 text-white border-black shadow-md"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                          }`}
                        >
                          <span className="text-xs font-extrabold truncate pr-2">{domain}</span>
                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-cyan-400 text-slate-950"
                                : "bg-slate-200 text-slate-900"
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Groups & Allocated Project Topics Table */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg overflow-hidden space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-600" />
                      <span>Allocated Student Teams & Topics</span>
                    </h2>
                    <span className="text-xs font-black px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-full border border-slate-300">
                      {filteredGroups.length} teams
                    </span>
                    {selectedDomain !== "all" && (
                      <span className="text-xs font-extrabold px-3 py-0.5 bg-cyan-100 text-cyan-900 rounded-full border border-cyan-300">
                        {selectedDomain}
                      </span>
                    )}
                  </div>

                  {/* Search within teams */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search title, student, guide..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900 transition"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase tracking-wider font-black text-[11px]">
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Project Title</th>
                        <th className="p-3">Domain</th>
                        <th className="p-3">Faculty Guide</th>
                        <th className="p-3">Allocated Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold bg-white">
                      {filteredGroups.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                            No allocated teams found matching the search / filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredGroups.map((g, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-extrabold text-slate-950 max-w-xs">{g.projectTitle}</td>
                            <td className="p-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-black text-slate-800 inline-block">
                                {g.domain || "General"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-800 font-bold">{g.teacherName}</td>
                            <td className="p-3 text-slate-700">
                              <div className="space-y-1">
                                {(g.students || []).map((st, sIdx) => (
                                  <div key={sIdx} className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                                    <span>
                                      <strong className="text-slate-900 font-bold">{st.name}</strong>{" "}
                                      <span className="text-[11px] text-slate-500 font-mono">({st.regNo})</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Faculty Status Section (With Tabs) */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg overflow-hidden space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-cyan-600" />
                    <span>Faculty Guides Participation</span>
                  </h2>

                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      onClick={() => setFacultyTab("withProjects")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                        facultyTab === "withProjects"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Active Guides ({stats.teachersWithProjects?.length || 0})
                    </button>
                    <button
                      onClick={() => setFacultyTab("withoutProjects")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                        facultyTab === "withoutProjects"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Pending Guides ({stats.teachersWithoutProjects?.length || 0})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-black border-b border-slate-200">
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Faculty Name</th>
                        <th className="p-3">Official Email</th>
                        <th className="p-3">
                          {facultyTab === "withProjects" ? "Proposed Project Topics" : "Status"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold bg-white">
                      {facultyTab === "withProjects" ? (
                        (stats.teachersWithProjects || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">
                              No faculty have uploaded project topics yet.
                            </td>
                          </tr>
                        ) : (
                          stats.teachersWithProjects.map((t, idx) => (
                            <tr key={t.email} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-extrabold text-slate-950">{t.name}</td>
                              <td className="p-3 text-slate-600 font-mono">{t.email}</td>
                              <td className="p-3 text-slate-800">
                                <div className="flex flex-wrap gap-1.5">
                                  {(t.projects || []).map((p, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        (stats.teachersWithoutProjects || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-emerald-600 font-bold">
                              ✓ All faculty members have successfully submitted their project topics!
                            </td>
                          </tr>
                        ) : (
                          stats.teachersWithoutProjects.map((t, idx) => (
                            <tr key={t.email} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-extrabold text-slate-950">{t.name}</td>
                              <td className="p-3 text-slate-600 font-mono">{t.email}</td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black uppercase">
                                  Pending Topic Submission
                                </span>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Cohort Overview (Pending vs Allocated) */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg overflow-hidden space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-600" />
                    <span>Student Cohort Tracking</span>
                  </h2>

                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      onClick={() => setStudentTab("withoutApplications")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                        studentTab === "withoutApplications"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Unallocated Students ({stats.studentsWithoutApplications?.length || 0})
                    </button>
                    <button
                      onClick={() => setStudentTab("withApplications")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                        studentTab === "withApplications"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Applied / Allocated ({stats.studentsWithApplications?.length || 0})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 z-10">
                      <tr className="text-slate-700 uppercase tracking-wider font-black border-b border-slate-200">
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Registration Number</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold bg-white">
                      {studentTab === "withoutApplications" ? (
                        (stats.studentsWithoutApplications || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-emerald-600 font-bold">
                              ✓ All registered students have submitted applications or been allocated!
                            </td>
                          </tr>
                        ) : (
                          stats.studentsWithoutApplications.map((s, idx) => (
                            <tr key={s.regNo || idx} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-extrabold text-slate-950">{s.name}</td>
                              <td className="p-3 font-mono text-slate-700 font-bold">{s.regNo}</td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[10px] font-black uppercase">
                                  Action Required: Unallocated
                                </span>
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        (stats.studentsWithApplications || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">
                              No student applications recorded yet.
                            </td>
                          </tr>
                        ) : (
                          stats.studentsWithApplications.map((s, idx) => (
                            <tr key={s.regNo || idx} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-extrabold text-slate-950">{s.name}</td>
                              <td className="p-3 font-mono text-slate-700 font-bold">{s.regNo}</td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black uppercase">
                                  Applied / Allocated
                                </span>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 bg-white rounded-3xl border-2 border-slate-900 text-center font-bold text-slate-500">
              No statistics data available.
            </div>
          )}
        </div>
      </div>

      {/* Flush Database Confirmation Modal */}
      <FlushDatabaseModal
        isOpen={isFlushModalOpen}
        onClose={() => setIsFlushModalOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
