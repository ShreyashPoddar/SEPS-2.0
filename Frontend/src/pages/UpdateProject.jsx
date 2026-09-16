import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAllProjects, updateProject } from "../api";
import { parseStreams } from "../utils/streamUtils";
import SpecializationDropdown from "../components/SpecializationDropdown";

export default function UpdateProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState({
    facultyName: "",
    projectTitle: "",
    description: "",
    stream: "",
    domain: "",
  });
  const [loading, setLoading] = useState(false);

  // Load existing project
  useEffect(() => {
    getAllProjects()
      .then((res) => {
        const found = res.data.find((p) => p._id === projectId);
        if (found) {
          setProjectData({
            facultyName: found.facultyName || "",
            projectTitle: found.projectTitle,
            description: found.description,
            stream: found.stream,
            domain: found.domain || "",
          });
        }
      })
      .catch((err) => console.error("Failed to load project", err));
  }, [projectId]);

  const handleChange = (e) => {
    setProjectData({ ...projectData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    updateProject(projectId, projectData)
      .then(() => {
        navigate("/teacher-dashboard");
      })
      .catch((err) => console.error("Update failed", err))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6 lg:p-8 pb-16">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-2 border-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-950">Update Major Project</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Modify project details, domain tags, and eligible streams</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/teacher-dashboard")}
            className="px-4 py-2 rounded-full border-2 border-slate-900 text-xs font-extrabold text-slate-800 hover:bg-slate-50 transition"
          >
            ← Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Faculty Name */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Faculty Guide
            </label>
            <input
              type="text"
              name="facultyName"
              value={projectData.facultyName}
              onChange={handleChange}
              placeholder="Faculty Guide Name"
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black focus:bg-white transition"
              required
            />
          </div>

          {/* Project Title */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Project Title
            </label>
            <input
              type="text"
              name="projectTitle"
              value={projectData.projectTitle}
              onChange={handleChange}
              placeholder="Project Title"
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black focus:bg-white transition"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Description & Scope
            </label>
            <textarea
              name="description"
              value={projectData.description}
              onChange={handleChange}
              placeholder="Description"
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-black focus:bg-white transition"
              rows={4}
              required
            />
          </div>

          {/* Specialization / Stream */}
          <div className="relative z-40">
            <SpecializationDropdown
              value={projectData.stream}
              onChange={(val) =>
                setProjectData((prev) => ({ ...prev, stream: val }))
              }
              required
            />
          </div>

          {/* Domain */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Technical Domain
            </label>
            <select
              name="domain"
              value={projectData.domain}
              onChange={handleChange}
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-full border-2 border-black shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              {loading ? "Saving Changes..." : "Save Project Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
