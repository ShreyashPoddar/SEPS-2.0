import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, getCurrentUser } from "../api";
import { LogIn, ArrowLeft } from "lucide-react";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function Login() {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loginPayload = {
        identifier: formData.identifier.trim(),
        email: formData.identifier.trim(),
        password: formData.password,
      };
      await loginUser(loginPayload);
      const { data } = await getCurrentUser();
      if (data.role === "teacher") {
        navigate("/teacher-dashboard");
      } else if (data.role === "student") {
        navigate("/student-dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 flex items-center justify-center p-4 overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* SlicedWaves Animated Background */}
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

      {/* Glassmorphic Login Card with Black Border */}
      <motion.div
        className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl border-2 border-black shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-4 group">
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
            Sign In to Portal
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Access your student or faculty dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Email Address / SRM Register No.
            </label>
            <input
              type="text"
              name="identifier"
              placeholder="e.g. yourname@srmist.edu.in or RA2111..."
              className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
              value={formData.identifier}
              onChange={handleChange}
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
              placeholder="Enter your password"
              className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 text-center bg-red-50 py-2 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          {/* Framer Motion Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Signing in..." : "Login"}
            {!loading && <LogIn size={16} />}
          </motion.button>
        </form>

        <div className="text-xs text-center text-slate-600 font-semibold space-y-2 pt-2 border-t border-slate-200/80">
          <Link to="/forgot-password" className="block text-slate-800 hover:text-black hover:underline font-bold">
            Forgot Password?
          </Link>
          <p>
            Don't have an account?{" "}
            <Link to="/signup" className="text-black font-extrabold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}