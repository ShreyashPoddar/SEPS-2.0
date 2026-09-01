import React, { useEffect, useState } from "react";
import { getCurrentUser, updateProfile, logoutUser } from "../api";
import { useNavigate } from "react-router-dom";
import { Loader, Save, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import Navbar from "../components/Navbar";

export default function StudentProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data.role !== "student") {
          navigate("/teacher-dashboard");
        } else {
          setProfile(res.data);
        }
      })
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const showNotification = (message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    // eslint-disable-next-line no-unused-vars
    const { role, ...profileData } = profile;
    updateProfile(profileData)
      .then(() => {
        showNotification("Profile updated successfully!", "success");
      })
      .catch((err) => {
        showNotification(err.response?.data?.message || "Failed to update profile.");
      })
      .finally(() => setSaving(false));
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      navigate('/login');
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader className="w-10 h-10 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
       {notification.message && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          <span>{notification.message}</span>
        </div>
      )}
      <div className="relative max-w-4xl mx-auto z-10 p-4 sm:p-6 lg:p-8">
        <Navbar user={profile} handleLogout={handleLogout} />
        
        <section className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <img
                src={profile.profilePic || `https://placehold.co/120x120/E0E7FF/4F46E5?text=${profile.fullName.charAt(0)}`}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
              />
              <div className="flex-grow text-center sm:text-left">
                <h2 className="text-3xl font-bold text-gray-800">{profile.fullName}</h2>
                <p className="text-gray-500">{profile.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
               <div>
                <label className="text-sm font-medium text-gray-600">Registration Number</label>
                <input type="text" name="regNo" value={profile.regNo || "Not set"} disabled className="w-full mt-1 px-4 py-2 bg-slate-200 border border-slate-300 rounded-lg text-gray-500 cursor-not-allowed" />
              </div>
               <div>
                <label className="text-sm font-medium text-gray-600">CGPA</label>
                <input type="number" name="cgpa" value={profile.cgpa ?? ""} min={0} max={10} step={0.01} onChange={handleChange} className="w-full mt-1 px-4 py-2 text-gray-700 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition" />
              </div>
               <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Department / Branch</label>
                <select
                  name="department"
                  value={profile.department || "Dept of ECE"}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition font-semibold text-sm"
                >
                  <option value="Dept of ECE">Dept of ECE (Electronics & Communication)</option>
                  <option value="Dept of CSE">Dept of CSE (Computer Science)</option>
                  <option value="Dept of IT">Dept of IT (Information Technology)</option>
                  <option value="Dept of Mechanical">Dept of Mechanical Engineering</option>
                  <option value="Dept of Biomedical">Dept of Biomedical Engineering</option>
                  <option value="Dept of EEE">Dept of EEE (Electrical & Electronics)</option>
                </select>
              </div>

              <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/40 border-2 border-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <span>🏢</span> Internship Experience & Corporate Host
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Enter the company/organization and duration for internships you are doing or have done.
                    </p>
                  </div>
                  <div className="self-start sm:self-auto">
                    {(profile.internshipCompany || profile.internshipDuration) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-black uppercase tracking-wider">
                        💼 Corporate Internship Track
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 border border-blue-300 text-blue-900 rounded-full text-xs font-black uppercase tracking-wider">
                        🎓 Regular On-Campus Track
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Company / Organization Name
                    </label>
                    <input
                      type="text"
                      name="internshipCompany"
                      value={profile.internshipCompany || ""}
                      placeholder="e.g. Qualcomm, Amazon AWS, Bosch, ISRO"
                      onChange={handleChange}
                      className="w-full mt-1.5 px-4 py-2.5 text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Internship Duration / Term
                    </label>
                    <input
                      type="text"
                      name="internshipDuration"
                      value={profile.internshipDuration || ""}
                      placeholder="e.g. 6 Months (Jan - Jun 2026), 3 Months"
                      onChange={handleChange}
                      className="w-full mt-1.5 px-4 py-2.5 text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition font-semibold text-sm"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-3 italic">
                  💡 Note: Students with an active company & duration are automatically matched in the Corporate Internship cohort. Leave blank if you are doing a standard on-campus capstone.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Profile Picture URL</label>
                <input type="text" name="profilePic" value={profile.profilePic || ""} onChange={handleChange} className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-[#0A66C2]">💼</span> LinkedIn Profile URL
                    </label>
                    {profile.linkedinUrl && (
                      <a
                        href={profile.linkedinUrl.startsWith("http") ? profile.linkedinUrl : `https://${profile.linkedinUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0A66C2] hover:underline font-bold flex items-center gap-1"
                      >
                        Preview <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    name="linkedinUrl"
                    value={profile.linkedinUrl || ""}
                    placeholder="https://linkedin.com/in/username"
                    onChange={handleChange}
                    className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-slate-900">🐙</span> GitHub Profile URL
                    </label>
                    {profile.githubUrl && (
                      <a
                        href={profile.githubUrl.startsWith("http") ? profile.githubUrl : `https://${profile.githubUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-900 hover:underline font-bold flex items-center gap-1"
                      >
                        Preview <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    name="githubUrl"
                    value={profile.githubUrl || ""}
                    placeholder="https://github.com/username"
                    onChange={handleChange}
                    className="w-full mt-1.5 px-4 py-2.5 text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-black transition text-sm font-medium"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Resume URL</label>
                <input type="text" name="resumeUrl" value={profile.resumeUrl || ""} onChange={handleChange} className="w-full mt-1 px-4 py-2 text-gray-700 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition" />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className="w-full md:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <><Loader className="animate-spin w-5 h-5" /> Saving...</> : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}