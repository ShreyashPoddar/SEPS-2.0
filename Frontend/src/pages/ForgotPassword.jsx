import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api";
import { ArrowLeft, Send, KeyRound, GraduationCap, Briefcase, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Student email: exactly 2 letters + 4 digits + @srmist.edu.in (e.g. ab1234@srmist.edu.in)
  const STUDENT_EMAIL_REGEX = /^[a-zA-Z]{2}[0-9]{4}@srmist\.edu\.in$/;
  // Faculty email: anything@srmist.edu.in or testing email
  const TEACHER_EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(srmist\.edu\.in|gmail\.com)$/i;

  const isEmailValid = (e) => {
    const clean = (e || "").trim();
    return role === "student" ? STUDENT_EMAIL_REGEX.test(clean) : TEACHER_EMAIL_REGEX.test(clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your SRM institutional email address.");
      return;
    }

    if (role === "student" && !STUDENT_EMAIL_REGEX.test(cleanEmail)) {
      setError("Invalid student email format. Must be 2 letters followed by 4 digits, e.g. ab1234@srmist.edu.in");
      return;
    }

    if (role === "teacher" && !TEACHER_EMAIL_REGEX.test(cleanEmail)) {
      setError("Invalid faculty email format. Must be an official @srmist.edu.in address (e.g. anything@srmist.edu.in).");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword({ email: cleanEmail, identifier: cleanEmail });
      setMessage(res.data?.message || "A 6-digit OTP has been sent to your registered email address.");
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(cleanEmail)}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset OTP");
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
            Reset Password
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Enter your official SRM email address to receive a 6-digit recovery OTP
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Select Account Type
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setRole("student"); setError(""); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                role === "student"
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole("teacher"); setError(""); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                role === "teacher"
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Faculty</span>
            </button>
          </div>
        </div>

        {message && (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
            {message}
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
              {role === "student" ? "Student SRM Email" : "Faculty SRM Email"}
            </label>
            <div className="relative mt-1">
              <input
                type="email"
                placeholder={role === "student" ? "ab1234@srmist.edu.in" : "anything@srmist.edu.in"}
                className="w-full pl-10 pr-4 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Format helper */}
            <div className="mt-2 text-[11px] leading-relaxed">
              {role === "student" ? (
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2 text-blue-900">
                  Format: <span className="font-mono font-bold text-blue-700">ab1234@srmist.edu.in</span> (2 letters + 4 digits)
                </div>
              ) : (
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-800">
                  Format: <span className="font-mono font-bold text-slate-900">anything@srmist.edu.in</span> (Official SRM faculty email)
                </div>
              )}
            </div>

            {/* Live validation feedback */}
            {email && email.includes("@") && (
              <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold ${
                isEmailValid(email) ? "text-emerald-700" : "text-red-600"
              }`}>
                {isEmailValid(email) ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Valid {role === "student" ? "student" : "faculty"} email format ✓</>
                ) : (
                  <><AlertCircle className="w-3.5 h-3.5" /> {role === "student" ? "Must be 2 letters + 4 digits (e.g. ab1234@srmist.edu.in)" : "Must end with @srmist.edu.in"}</>
                )}
              </div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading || !email.trim() || !isEmailValid(email)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 text-sm"
          >
            {loading ? "Sending OTP..." : "Send 6-Digit OTP"}
            {!loading && <Send size={16} />}
          </motion.button>
        </form>

        <div className="pt-2 text-center border-t border-slate-200/80 flex flex-col gap-2">
          <Link
            to={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Already have an OTP? Verify & Set Password</span>
          </Link>
          <Link to="/login" className="text-xs font-medium text-slate-600 hover:text-black">
            Remember your password? Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
