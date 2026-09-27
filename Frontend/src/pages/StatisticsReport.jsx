import React, { useEffect, useState, useRef, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getCurrentUser, getStatistics } from "../api";
import { Navigate, useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { ArrowLeft, Filter, Layers, Download, BookOpen } from "lucide-react";

const ALLOWED_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
  "hodece@srmist.edu.in",
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
              setError("Failed to fetch statistics.");
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

  const filteredGroups = useMemo(() => {
    if (!stats?.groupDetails) return [];
    if (selectedDomain === "all") return stats.groupDetails;
    return stats.groupDetails.filter(
      (g) => (g.domain || "").toLowerCase() === selectedDomain.toLowerCase()
    );
  }, [stats, selectedDomain]);

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

  const handleDownloadPDF = () => {
    if (!stats) return;
    const pdf = new jsPDF("p", "mm", "a4");
    let y = 15;
    pdf.setFontSize(18);
    pdf.text("SEPS 2.0 - Central Statistics & Allocation Report", 15, y);
    y += 10;
    pdf.setFontSize(11);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 15, y);
    y += 8;

    // Summary Table
    pdf.autoTable({
      startY: y,
      head: [["Metric", "Count"]],
      body: [
        ["Total Faculty Guides", stats.teacherCount],
        ["Total Registered Students", stats.studentCount],
        ["Total Project Topics Uploaded", stats.projectCount],
        ["Total Team Applications", stats.applicationCount],
        ["Approved Student Groups", stats.groupCount],
        ["Approved Individuals", stats.individualCount],
      ],
      theme: "grid",
      headStyles: { fillColor: [8, 145, 178] },
    });
    y = pdf.lastAutoTable.finalY + 10;

    // Domain Breakdown if available
    if (stats.domainCounts) {
      pdf.setFontSize(13);
      pdf.text("Project Topics Distribution by Research Domain", 15, y);
      y += 4;
      pdf.autoTable({
        startY: y,
        head: [["Domain", "Topics Proposed"]],
        body: Object.entries(stats.domainCounts).map(([dom, count]) => [dom, count]),
        theme: "grid",
        headStyles: { fillColor: [8, 145, 178] },
      });
      y = pdf.lastAutoTable.finalY + 10;
    }

    // Teachers Who Uploaded Projects
    pdf.setFontSize(13);
    pdf.text("Teachers Who Uploaded Projects", 15, y);
    y += 4;
    pdf.autoTable({
      startY: y,
      head: [["Name", "Email", "Projects"]],
      body:
        stats.teachersWithProjects.length === 0
          ? [["None", "", ""]]
          : stats.teachersWithProjects.map((t) => [t.name, t.email, t.projects.join(", ")]),
      theme: "grid",
      headStyles: { fillColor: [8, 145, 178] },
    });
    y = pdf.lastAutoTable.finalY + 10;

    // Groups and Their Project Applications
    pdf.setFontSize(13);
    pdf.text("Approved Student Groups & Allocated Topics", 15, y);
    y += 4;
    pdf.autoTable({
      startY: y,
      head: [["Project Title", "Domain", "Teacher", "Team Members"]],
      body:
        stats.groupDetails.length === 0
          ? [["None", "", "", ""]]
          : stats.groupDetails.map((g) => [
              g.projectTitle,
              g.domain || "General",
              g.teacherName,
              g.students.map((st) => `${st.name} (${st.regNo})`).join(", "),
            ]),
      theme: "grid",
      headStyles: { fillColor: [8, 145, 178] },
      styles: { cellWidth: "wrap" },
    });

    pdf.save("seps-statistics-report.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teacher-dashboard")}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 transition"
              title="Back to Teacher Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-slate-900" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 text-[10px] font-black uppercase tracking-wider">
                  Admin Coordinator Portal
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 mt-0.5">
                Central Allocation & Statistics Report
              </h1>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-full font-bold text-xs shadow-md border-2 border-black transition active:scale-95 flex-shrink-0"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download Official PDF</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-2xl font-bold text-xs">
            {error}
          </div>
        )}

        {/* Domain Filter Bar for Admin */}
        <div className="bg-white p-5 rounded-3xl border-2 border-slate-900 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-950" />
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
                <h2 className="text-lg font-black text-slate-950 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-600" />
                  <span>Cycle Metrics Overview</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Faculty Guides", value: stats.teacherCount, color: "bg-blue-50 border-blue-200 text-blue-950" },
                    { label: "Students", value: stats.studentCount, color: "bg-indigo-50 border-indigo-200 text-indigo-950" },
                    { label: "Project Topics", value: stats.projectCount, color: "bg-emerald-50 border-emerald-200 text-emerald-950" },
                    { label: "Applications", value: stats.applicationCount, color: "bg-amber-50 border-amber-200 text-amber-950" },
                    { label: "Approved Groups", value: stats.groupCount, color: "bg-cyan-50 border-cyan-200 text-cyan-950" },
                    { label: "Approved Indiv.", value: stats.individualCount, color: "bg-purple-50 border-purple-200 text-purple-950" },
                  ].map((card, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border ${card.color} text-center`}>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{card.label}</p>
                      <p className="text-2xl font-black mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Research Domain Topic Distribution */}
              {stats.domainCounts && (
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg">
                  <h2 className="text-lg font-black text-slate-950 mb-4">
                    Topics Distribution by Technical Domain
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(stats.domainCounts).map(([domain, count]) => (
                      <div
                        key={domain}
                        onClick={() => setSelectedDomain(domain)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                          selectedDomain === domain
                            ? "bg-slate-950 text-white border-black"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                        }`}
                      >
                        <span className="text-xs font-extrabold truncate pr-2">{domain}</span>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-full ${
                            selectedDomain === domain
                              ? "bg-cyan-400 text-slate-950"
                              : "bg-slate-200 text-slate-900"
                          }`}
                        >
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups & Allocated Project Topics Table */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-slate-950">
                    Allocated Student Teams & Topics ({filteredGroups.length})
                  </h2>
                  {selectedDomain !== "all" && (
                    <span className="text-xs font-extrabold px-3 py-1 bg-cyan-100 text-cyan-900 rounded-full border border-cyan-300">
                      Domain: {selectedDomain}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-black border-b border-slate-200">
                        <th className="p-3">Project Title</th>
                        <th className="p-3">Domain</th>
                        <th className="p-3">Faculty Guide</th>
                        <th className="p-3">Allocated Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {filteredGroups.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">
                            No allocated groups found matching this domain filter.
                          </td>
                        </tr>
                      ) : (
                        filteredGroups.map((g, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-extrabold text-slate-950">{g.projectTitle}</td>
                            <td className="p-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-black text-slate-800">
                                {g.domain || "General"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-800 font-bold">{g.teacherName}</td>
                            <td className="p-3 text-slate-700">
                              {g.students.map((st) => `${st.name} (${st.regNo})`).join(", ")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Teachers Who Uploaded Projects */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-lg overflow-hidden">
                <h2 className="text-lg font-black text-slate-950 mb-4">
                  Teachers Who Uploaded Projects ({stats.teachersWithProjects.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-black border-b border-slate-200">
                        <th className="p-3">Faculty Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Proposed Projects</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {stats.teachersWithProjects.map((t) => (
                        <tr key={t.email} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-extrabold text-slate-950">{t.name}</td>
                          <td className="p-3 text-slate-600">{t.email}</td>
                          <td className="p-3 text-slate-800 font-bold">{t.projects.join(", ")}</td>
                        </tr>
                      ))}
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
    </div>
  );
}
