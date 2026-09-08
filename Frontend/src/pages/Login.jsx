import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  identifyUser,
  loginUser,
  getCurrentUser,
  isStudentProfileComplete,
} from "../api";
import {
  LogIn,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function Login() {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  // step 1 = identifier, step 2 = password (student/teacher)

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [identifiedUser, setIdentifiedUser] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ─── Already logged in? Redirect ──────────────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res?.data?.role === "teacher") navigate("/teacher-dashboard", { replace: true });
        else if (res?.data?.role === "student") {
          if (!isStudentProfileComplete(res.data)) {
            navigate("/student-profile", { replace: true, state: { profileRequired: true } });
          } else {
            navigate("/student-dashboard", { replace: true });
          }
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleBackToStep1 = () => {
    setStep(1);
    setPassword("");
    setError("");
    setIdentifiedUser(null);
  };

  // ─── Step 1: Identifier Submission ─────────────────────────────────────────
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) return;

    setError("");
    setLoading(true);

    try {
      const res = await identifyUser({ identifier: cleanId });
      const data = res.data || res;
      setIdentifiedUser(data);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not identify account. Please check your Register Number or Email."
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Password Submission ───────────────────────────────────────────
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const loginPayload = {
        identifier: identifiedUser?.regNo || identifiedUser?.email || identifier.trim(),
        password,
      };

      const res = await loginUser(loginPayload);
      const data = res.data || res;
      const user = data.user || data;

      if (user.role === "teacher") {
        navigate("/teacher-dashboard", { replace: true });
      } else if (user.role === "student") {
        if (!isStudentProfileComplete(user)) {
          navigate("/student-profile", { replace: true, state: { profileRequired: true } });
        } else {
          navigate("/student-dashboard", { replace: true });
        }
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 flex items-center justify-center p-4 overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Animated Background */}
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

      {/* Back to Home */}
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

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md p-7 sm:p-8 space-y-6 bg-white/85 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl border-2 border-black shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-3 group">
            <img src={srmLogo} alt="SRM IST Logo" className="h-9 w-auto object-contain transition group-hover:scale-105" />
            <span className="text-slate-400 font-light text-xl select-none">|</span>
            <span className="font-extrabold text-2xl text-slate-950 tracking-tight">SEPS SRM</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
            Sign In to Portal
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            {step === 1
              ? "SRM Institute of Science and Technology Portal Login"
              : identifiedUser?.role === "student"
              ? "Enter your student password to continue"
              : "Enter your faculty password to continue"}
          </p>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s ? "w-10 bg-blue-600" : step > s ? "w-4 bg-blue-300" : "w-4 bg-slate-300"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ──────────────── STEP 1: Identifier ──────────────── */}
          {step === 1 && (
            <motion.form
              key="step1"
              onSubmit={handleStep1Submit}
              className="space-y-4"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
            >
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Register Number / Email Address
                </label>
                <input
                  type="text"
                  name="identifier"
                  placeholder="e.g. RA23xxxxxxxxxxx or name@srmist.edu.in"
                  className="w-full px-4 py-3 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium shadow-sm placeholder:text-slate-400"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  autoFocus
                  required
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-bold text-red-600 text-center bg-red-50 py-2.5 px-3 rounded-xl border border-red-200"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={loading || !identifier.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
              >
                {loading ? "Checking ID..." : "Continue"}
                {!loading && <ArrowRight size={16} />}
              </motion.button>
            </motion.form>
          )}

          {/* ──────────────── STEP 2: Password ──────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              className="space-y-4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* Identity chip */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/80 border-2 border-blue-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                    {identifiedUser?.role === "student" ? <GraduationCap className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 leading-tight">
                      {identifiedUser?.fullName || "SRM Member"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        {identifiedUser?.role === "student" ? "Student" : "Faculty"}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {identifiedUser?.regNo || identifiedUser?.email}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline px-2 py-1 cursor-pointer"
                >
                  Change
                </button>
              </div>

              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      className="w-full pl-4 pr-11 py-3 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium shadow-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors p-1 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Helpful hint on password format */}
                  {identifiedUser?.role === "student" && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-snug">
                      Hint: First 4 letters of your first name (or first name + surname if under 4 letters) + last 6 digits of your registration number.
                    </p>
                  )}
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-bold text-red-600 text-center bg-red-50 py-2.5 px-3 rounded-xl border border-red-200 flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading || !password}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                >
                  {loading ? "Signing in..." : "Sign In to Portal"}
                  {!loading && <LogIn size={16} />}
                </motion.button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleBackToStep1}
                    className="text-xs font-bold text-slate-600 hover:text-black transition cursor-pointer"
                  >
                    ← Back to identifier step
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-xs text-center text-slate-500 font-medium pt-3 border-t border-slate-200/80">
          <p className="text-[11px] text-slate-500">SRM Institute of Science and Technology • Single Sign-On</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Accounts are officially provisioned by the Department of ECE.</p>
        </div>
      </motion.div>
    </div>
  );
}