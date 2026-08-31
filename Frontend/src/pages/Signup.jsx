import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { signupUser } from "../api.js";
import { toast, Toaster } from "react-hot-toast";
import { UserPlus, ArrowLeft } from "lucide-react";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    regNo: "",
    password: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSend = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === "student") {
      dataToSend.regNo = formData.regNo.trim().toUpperCase();
      dataToSend.department = formData.department || "Dept of ECE";
      dataToSend.internshipStatus = formData.internshipStatus || "regular";
    }

    toast.promise(
      signupUser(dataToSend),
      {
        loading: "Creating your account...",
        success: (res) => {
          setTimeout(() => navigate("/login"), 2000);
          return res.data.message || "Signup successful! Please verify your email.";
        },
        error: (err) => err.response?.data?.message || "Signup failed. Please try again.",
      }
    ).finally(() => setLoading(false));
  };

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 flex items-center justify-center p-4 overflow-hidden selection:bg-blue-600 selection:text-white">
      <Toaster position="top-right" />

      {/* SlicedWaves Background */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-auto">
        <SlicedWaves
          color1="#ffea43"
          color2="#007dff"
          color3="#0f001e"
          columns={14}
          rows={8}
          barThickness={0.1}
          speed={0.35}
          travel={0.7}
          waveSpread={0.9}
          rowOffset={1}
          softness={0.05}
          glow={0}
          brightness={1}
          contrast={1}
          opacity={0.4}
          orientation="horizontal"
          alternate={false}
          grain
          grainIntensity={0.05}
          mouseInteraction
          mouseStrength={1}
          mouseRadius={0.3}
        />
      </div>

      {/* Back to Home Button */}
      <div className="fixed top-6 left-6 z-20">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border-2 border-black text-xs sm:text-sm font-bold text-slate-900 shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </motion.div>
      </div>

      {/* Glassmorphic Signup Card */}
      <motion.div
        className="relative z-10 w-full max-w-md p-8 space-y-5 bg-white/85 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl border-2 border-black shadow-[0_12px_40px_rgba(0,0,0,0.1)] my-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-3 group">
            <img
              src={srmLogo}
              alt="SRM IST Logo"
              className="h-9 w-auto object-contain transition group-hover:scale-105"
            />
            <span className="text-slate-400 font-light text-xl select-none">|</span>
            <span className="font-extrabold text-2xl text-slate-950 tracking-tight">
              SEPS 2.0
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Join the SRM Project Connect Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Account Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
            >
              <option value="student">Student</option>
              <option value="teacher">Faculty / Teacher</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
              required
            />
          </div>

          {formData.role === "student" && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  SRM Registration Number
                </label>
                <input
                  type="text"
                  name="regNo"
                  placeholder="e.g. RA2111003010123"
                  value={formData.regNo}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department || "Dept of ECE"}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                >
                  <option value="Dept of ECE">Dept of Electronics & Communication Engg (ECE)</option>
                  <option value="Dept of CSE">Dept of Computer Science & Engg (CSE)</option>
                  <option value="Dept of IT">Dept of Information Technology (IT)</option>
                  <option value="Dept of Mechanical">Dept of Mechanical Engineering</option>
                  <option value="Dept of Mechatronics">Dept of Mechatronics Engineering</option>
                  <option value="Dept of Electrical & Electronics">Dept of Electrical & Electronics Engg (EEE)</option>
                  <option value="Dept of Civil">Dept of Civil Engineering</option>
                  <option value="Dept of Biotech">Dept of Biotechnology</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Capstone Internship Track
                </label>
                <select
                  name="internshipStatus"
                  value={formData.internshipStatus || "regular"}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                >
                  <option value="regular">🎓 Regular On-Campus Capstone Project</option>
                  <option value="internship">💼 6-Month Corporate Internship Track</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter your university email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Create a secure password (min. 6 chars)"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
              required
              minLength={6}
            />
          </div>

          {/* Framer Motion Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 text-sm mt-2"
          >
            {loading ? "Creating Account..." : "Create Account"}
            {!loading && <UserPlus size={16} />}
          </motion.button>
        </form>

        <p className="text-xs text-center text-slate-600 font-semibold pt-2 border-t border-slate-200/80">
          Already have an account?{" "}
          <Link to="/login" className="text-black font-extrabold hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}