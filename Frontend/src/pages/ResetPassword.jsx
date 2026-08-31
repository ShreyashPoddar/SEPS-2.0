import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { resetPassword } from "../api";
import { ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const token = query.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, password });
      setMessage(res.data?.message || "Password reset successfully!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. Link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 flex items-center justify-center p-4 overflow-hidden selection:bg-blue-600 selection:text-white">
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

      {/* Back Button */}
      <div className="fixed top-6 left-6 z-20">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border-2 border-black text-xs sm:text-sm font-bold text-slate-900 shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </motion.div>
      </div>

      {/* Glassmorphic Card */}
      <motion.div
        className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/85 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl border-2 border-black shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
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
            Create New Password
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Choose a secure password for your account
          </p>
        </div>

        {!token ? (
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="font-bold text-sm text-red-950">Invalid or Missing Token</h3>
            <p className="text-xs text-red-800">
              Please click the password reset link sent to your registered email address.
            </p>
            <div className="pt-2">
              <Link
                to="/forgot-password"
                className="inline-block px-4 py-2 bg-slate-950 text-white rounded-full text-xs font-bold"
              >
                Request New Link
              </Link>
            </div>
          </div>
        ) : (
          <>
            {message && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{message}</span>
              </p>
            )}

            {error && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl text-center">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 mt-1 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 text-sm"
              >
                {loading ? "Updating Password..." : "Set New Password"}
                {!loading && <KeyRound size={16} />}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
