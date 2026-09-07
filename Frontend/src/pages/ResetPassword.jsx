import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { resetPassword } from "../api";
import { ArrowLeft, KeyRound, CheckCircle2, Eye, EyeOff, ShieldCheck, Mail } from "lucide-react";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const initialEmail = query.get("email") || "";
  const initialOtp = query.get("otp") || query.get("token") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(initialOtp);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }
    if (cleanOtp.length < 6) {
      setError("OTP must be 6 digits.");
      return;
    }
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
      const res = await resetPassword({
        email: email.trim(),
        otp: cleanOtp,
        token: cleanOtp,
        password,
      });
      setMessage(res.data?.message || "Password set successfully!");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to verify OTP or reset password. Code may be expired or incorrect."
      );
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
              SEPS SRM
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
            Verify OTP & Set Password
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Enter the 6-digit OTP sent to your registered email
          </p>
        </div>

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
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Email / Institutional ID</span>
              {email && <span className="text-[11px] text-blue-600 font-medium lowercase">pre-filled</span>}
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="Enter your registered email or Reg. No."
                className="w-full pl-10 pr-4 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>6-Digit Verification OTP</span>
              <span className="text-[11px] text-emerald-600 font-medium">Valid for 10 min</span>
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                maxLength={6}
                placeholder="• • • • • •"
                className="w-full pl-10 pr-4 py-3 text-slate-950 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-center font-mono text-xl font-extrabold tracking-[0.4em] selection:bg-blue-200"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                required
              />
              <ShieldCheck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (min. 6 chars)"
                className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors p-1 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors p-1 focus:outline-none"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 text-sm"
          >
            {loading ? "Verifying OTP & Setting..." : "Verify & Set Password"}
            {!loading && <KeyRound size={16} />}
          </motion.button>
        </form>

        <div className="pt-1 text-center border-t border-slate-200/80">
          <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:underline">
            Didn't receive an OTP? Resend
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
