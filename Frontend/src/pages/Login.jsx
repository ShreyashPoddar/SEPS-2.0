import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  identifyUser,
  loginUser,
  getCurrentUser,
  resetPassword,
  verifyStudentEmail,
  forgotPassword,
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
  Mail,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  AtSign,
  AlertCircle,
} from "lucide-react";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function Login() {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  // step 1 = identifier, step 2 = password (student/teacher),
  // step 3 = student email verification (first login),
  // step 4 = OTP + new password (student first login)

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [studentEmail, setStudentEmail] = useState("");  // step 3

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [identifiedUser, setIdentifiedUser] = useState(null);
  // set when backend confirms requireEmailSetup (first-time student login)
  const [setupEmail, setSetupEmail] = useState(""); // confirmed email after step 3

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // ─── Forgot Password State (Inline Flow) ──────────────────────────────────
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotRole, setForgotRole] = useState("student"); // "student" | "teacher"
  const [forgotStep, setForgotStep] = useState(1); // 1 = Enter Email & send OTP, 2 = Enter OTP & new password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPasswordVal, setForgotPasswordVal] = useState("");
  const [forgotConfirmPasswordVal, setForgotConfirmPasswordVal] = useState("");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [showForgotConfirmPw, setShowForgotConfirmPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResendTimer, setForgotResendTimer] = useState(0);

  useEffect(() => {
    if (forgotResendTimer <= 0) return;
    const timer = setInterval(() => {
      setForgotResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotResendTimer]);

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

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const clearMessages = () => { setError(""); setSuccessMsg(""); };

  const handleBackToStep1 = () => {
    setStep(1);
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setStudentEmail("");
    setSetupEmail("");
    setError("");
    setSuccessMsg("");
    setIdentifiedUser(null);
  };

  // SRM institutional email: exactly 2 letters + 4 digits + @srmist.edu.in
  // e.g. sp7170@srmist.edu.in, ab1234@srmist.edu.in
  const STUDENT_EMAIL_REGEX = /^[a-zA-Z]{2}[0-9]{4}@srmist\.edu\.in$/;
  // Faculty email: anything@srmist.edu.in or testing email
  const TEACHER_EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(srmist\.edu\.in|gmail\.com)$/i;

  const isValidSrmEmail = (email) => STUDENT_EMAIL_REGEX.test((email || "").trim());

  const isEmailValidForRole = (email, role) => {
    const clean = (email || "").trim();
    if (role === "student") return STUDENT_EMAIL_REGEX.test(clean);
    return TEACHER_EMAIL_REGEX.test(clean);
  };

  const handleOpenForgotMode = (initialRole = null) => {
    setIsForgotMode(true);
    setForgotStep(1);
    setForgotOtp("");
    setForgotPasswordVal("");
    setForgotConfirmPasswordVal("");
    setError("");
    setSuccessMsg("");

    if (initialRole) {
      setForgotRole(initialRole);
    } else if (identifiedUser?.role) {
      setForgotRole(identifiedUser.role);
    }

    if (identifier.includes("@srmist.edu.in")) {
      setForgotEmail(identifier.trim().toLowerCase());
    }
  };

  const handleCloseForgotMode = () => {
    setIsForgotMode(false);
    setForgotStep(1);
    setForgotOtp("");
    setForgotPasswordVal("");
    setForgotConfirmPasswordVal("");
    setError("");
    setSuccessMsg("");
  };

  const handleForgotStep1Submit = async (e) => {
    e.preventDefault();
    clearMessages();
    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your SRM institutional email address.");
      return;
    }

    if (forgotRole === "student" && !STUDENT_EMAIL_REGEX.test(cleanEmail)) {
      setError("Invalid student email format. Must be 2 letters followed by 4 digits, e.g. ab1234@srmist.edu.in");
      return;
    }

    if (forgotRole === "teacher" && !TEACHER_EMAIL_REGEX.test(cleanEmail)) {
      setError("Invalid faculty email format. Must be an official @srmist.edu.in address (e.g. anything@srmist.edu.in).");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await forgotPassword({ email: cleanEmail, identifier: cleanEmail });
      const data = res?.data || res;
      setSuccessMsg(data?.message || `6-digit OTP sent to ${cleanEmail}`);
      setForgotStep(2);
      setForgotResendTimer(30);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset OTP. Please check your email address and try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotStep2Submit = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanOtp = forgotOtp.trim();
    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the complete 6-digit OTP sent to your email.");
      return;
    }
    if (!forgotPasswordVal) {
      setError("Please enter a new password.");
      return;
    }
    if (forgotPasswordVal.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (forgotPasswordVal !== forgotConfirmPasswordVal) {
      setError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      await resetPassword({
        email: cleanEmail,
        identifier: cleanEmail,
        otp: cleanOtp,
        password: forgotPasswordVal,
      });

      try {
        await loginUser({
          identifier: cleanEmail,
          email: cleanEmail,
          password: forgotPasswordVal,
        });
        const { data: me } = await getCurrentUser();
        if (me?.role === "student") {
          if (!isStudentProfileComplete(me)) {
            navigate("/student-profile", { state: { profileRequired: true } });
          } else {
            navigate("/student-dashboard");
          }
        } else if (me?.role === "teacher") {
          navigate("/teacher-dashboard");
        } else {
          navigate("/");
        }
      } catch (loginErr) {
        setIsForgotMode(false);
        setStep(1);
        setIdentifier(cleanEmail);
        setSuccessMsg("Password reset successfully! Please sign in with your new password.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to verify OTP or reset password. Please check your 6-digit code."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (forgotResendTimer > 0) return;
    clearMessages();
    setForgotLoading(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const res = await forgotPassword({ email: cleanEmail, identifier: cleanEmail });
      const data = res?.data || res;
      setSuccessMsg(data?.message || `A fresh 6-digit OTP has been sent to ${cleanEmail}.`);
      setForgotResendTimer(30);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ─── Step 1: Identify ─────────────────────────────────────────────────────
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) return;
    clearMessages();

    const isEmail = cleanId.includes("@");
    const isAdmin = ["admin", "admin123", "sepsadmin", "999999"].includes(cleanId.toLowerCase());

    if (isEmail) {
      const SRM_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(srmist\.edu\.in|gmail\.com)$/i;
      if (!SRM_EMAIL_REGEX.test(cleanId)) {
        setError("Invalid email id");
        return;
      }
    } else if (!isAdmin) {
      // SRM registration number format: RA23xxxxxxxxxxx (RA followed by 13 digits)
      const REG_NO_REGEX = /^RA[0-9]{13}$/i;
      if (!REG_NO_REGEX.test(cleanId)) {
        setError("Invalid registration number");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await identifyUser({ identifier: cleanId });
      const data = res.data || res;
      setIdentifiedUser(data);

      // First-time student -> directly ask for SRM mail id (skip password entry completely)
      if (data.role === "student" && (data.requireEmailSetup || !data.hasPassword)) {
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isEmail ? "Invalid email id" : "Invalid registration number")
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Password entry ────────────────────────────────────────────────
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!password) { setError("Please enter your password."); return; }
    clearMessages();
    setLoading(true);
    try {
      const res = await loginUser({
        identifier: identifier.trim(),
        email: identifier.trim(),
        password,
      });
      const data = res?.data || res;

      // ── First-time student → go to email verification step ──
      if (data?.requireEmailSetup) {
        setIdentifiedUser((prev) => ({ ...prev, ...data }));
        setStep(3);
        return;
      }

      // ── Normal login ──
      const { data: me } = await getCurrentUser();
      if (me.role === "teacher") navigate("/teacher-dashboard");
      else if (me.role === "student") {
        if (!isStudentProfileComplete(me)) {
          navigate("/student-profile", { state: { profileRequired: true } });
        } else {
          navigate("/student-dashboard");
        }
      }
      else navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Incorrect password. Please verify and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Student Email Verification ───────────────────────────────────
  const handleStep3Submit = async (e) => {
    e.preventDefault();
    clearMessages();

    const emailVal = studentEmail.trim().toLowerCase();
    const regNo = identifiedUser?.regNo || "";

    if (!emailVal) { setError("Please enter your institutional email."); return; }
    if (!isValidSrmEmail(emailVal)) {
      setError("Please enter a valid SRM institutional email in the format ab1234@srmist.edu.in (2 letters + 4 digits + @srmist.edu.in).");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyStudentEmail({ regNo, email: emailVal });
      const data = res?.data || res;
      setSetupEmail(emailVal);
      if (data?.setupOtp) {
        setOtp(data.setupOtp);
        setSuccessMsg(data?.message || `Verification OTP generated: ${data.setupOtp}`);
      } else {
        setSuccessMsg(data?.message || `OTP sent to ${emailVal}`);
      }
      setStep(4);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.code === "ECONNABORTED"
            ? "Request timed out connecting to the server. Please try again."
            : "Failed to verify email. Please ensure you entered the correct institutional email.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 4: OTP + New Password ───────────────────────────────────────────
  const handleStep4Submit = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      // Verify OTP and set the new password
      await resetPassword({ email: setupEmail, otp: cleanOtp, password });

      // Auto-login with new password
      await loginUser({ identifier: setupEmail, email: setupEmail, password });

      const { data: me } = await getCurrentUser();
      if (me.role === "student") {
        if (!isStudentProfileComplete(me)) {
          navigate("/student-profile", { state: { profileRequired: true } });
        } else {
          navigate("/student-dashboard");
        }
      }
      else navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to verify OTP or set password. Please check the code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Teacher first-time: OTP + password (step 2 variant) ─────────────────
  const handleTeacherSetupSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanOtp = otp.trim();
    if (!cleanOtp) { setError("Please enter the 6-digit OTP sent to your email."); return; }
    if (cleanOtp.length < 6) { setError("OTP must be exactly 6 digits."); return; }
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters long."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await resetPassword({ email: identifiedUser.email, identifier: identifiedUser.email, otp: cleanOtp, password });
      await loginUser({ identifier: identifiedUser.email, email: identifiedUser.email, password });
      const { data } = await getCurrentUser();
      if (data.role === "teacher") navigate("/teacher-dashboard");
      else navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to verify OTP or set password. Please check the code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    clearMessages();
    try {
      if (step === 4) {
        // Resend for student first-login setup
        const res = await verifyStudentEmail({ regNo: identifiedUser?.regNo, email: setupEmail });
        setSuccessMsg(`Fresh OTP sent to ${setupEmail}.`);
      } else {
        // Resend for teacher
        const res = await identifyUser({ identifier: identifiedUser.email });
        const data = res.data || res;
        setIdentifiedUser(data);
        setSuccessMsg(`A fresh OTP has been sent to ${identifiedUser.email}.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ─── Derived helpers ───────────────────────────────────────────────────────
  const totalSteps = identifiedUser?.role === "student" ? 4 : 2;
  const isStudentFirstLogin = step === 3 || step === 4;

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
            {isForgotMode ? (
              forgotStep === 1 ? "Reset Password" : "Enter OTP & New Password"
            ) : (
              step === 3 ? "Verify SRM Institutional Email" :
              step === 4 ? "Set Your Password" :
              step === 2 && identifiedUser?.role === "teacher" && !identifiedUser?.hasPassword ? "Faculty Password Setup" :
              "Sign In to Portal"
            )}
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            {isForgotMode ? (
              forgotStep === 1
                ? "Enter your official SRM email address to receive a recovery code"
                : `Enter the 6-digit OTP sent to ${forgotEmail}`
            ) : (
              step === 1 ? "SRM Institute of Science and Technology Portal Login" :
              step === 3 ? "First-time login: Enter your official SRM email to activate your account" :
              step === 4 ? "Enter the 6-digit OTP sent to your email and choose a new password" :
              identifiedUser?.role === "student" ? "Welcome back! Enter your password to continue" : "Faculty Portal Access"
            )}
          </p>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {isForgotMode ? (
            [1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  forgotStep === s ? "w-10 bg-blue-600" : forgotStep > s ? "w-4 bg-blue-300" : "w-4 bg-slate-300"
                }`}
              />
            ))
          ) : (
            (() => {
              const isFirstTimeStudent =
                identifiedUser?.role === "student" &&
                (identifiedUser?.requireEmailSetup || !identifiedUser?.hasPassword);
              const stepsList = isFirstTimeStudent ? [1, 3, 4] : [1, 2];
              return stepsList.map((s, idx) => {
                const currentIdx = stepsList.indexOf(step);
                const isActive = step === s;
                const isPassed = currentIdx > -1 && currentIdx > idx;
                return (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive ? "w-10 bg-blue-600" : isPassed ? "w-4 bg-blue-300" : "w-4 bg-slate-300"
                    }`}
                  />
                );
              });
            })()
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ──────────────── FORGOT PASSWORD FLOW ──────────────── */}
          {isForgotMode && forgotStep === 1 && (
            <motion.form
              key="forgotStep1"
              onSubmit={handleForgotStep1Submit}
              className="space-y-4"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
            >
              {/* Role Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Select Account Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setForgotRole("student"); setError(""); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      forgotRole === "student"
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotRole("teacher"); setError(""); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      forgotRole === "teacher"
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Faculty</span>
                  </button>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  {forgotRole === "student" ? "Student SRM Email" : "Faculty SRM Email"}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder={forgotRole === "student" ? "ab1234@srmist.edu.in" : "anything@srmist.edu.in"}
                    className="w-full pl-10 pr-4 py-3 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium shadow-sm placeholder:text-slate-400"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setError("");
                    }}
                    autoFocus
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Format helper note */}
                <div className="mt-2 text-[11px] leading-relaxed">
                  {forgotRole === "student" ? (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2 text-blue-900">
                      Format: <span className="font-mono font-bold text-blue-700">ab1234@srmist.edu.in</span> (2 letters + 4 digits)
                    </div>
                  ) : (
                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-800">
                      Format: <span className="font-mono font-bold text-slate-900">anything@srmist.edu.in</span> (Official SRM faculty email)
                    </div>
                  )}
                </div>

                {/* Live Validation Indicator */}
                {forgotEmail && forgotEmail.includes("@") && (
                  <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold ${
                    isEmailValidForRole(forgotEmail, forgotRole) ? "text-emerald-700" : "text-red-600"
                  }`}>
                    {isEmailValidForRole(forgotEmail, forgotRole) ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Valid {forgotRole === "student" ? "student" : "faculty"} email format ✓</>
                    ) : (
                      <><AlertCircle className="w-3.5 h-3.5" /> {forgotRole === "student" ? "Must be 2 letters + 4 digits (e.g. ab1234@srmist.edu.in)" : "Must end with @srmist.edu.in"}</>
                    )}
                  </div>
                )}
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
                disabled={forgotLoading || !forgotEmail.trim() || !isEmailValidForRole(forgotEmail, forgotRole)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {forgotLoading ? "Sending 6-Digit OTP..." : "Send Reset OTP"}
                {!forgotLoading && <ArrowRight size={16} />}
              </motion.button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleCloseForgotMode}
                  className="text-xs font-bold text-slate-600 hover:text-black transition"
                >
                  ← Back to Sign In
                </button>
              </div>
            </motion.form>
          )}

          {isForgotMode && forgotStep === 2 && (
            <motion.div
              key="forgotStep2"
              className="space-y-4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* OTP sent banner */}
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-1">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <Mail className="w-4 h-4 animate-pulse" />
                </div>
                <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">OTP Sent!</h4>
                <p className="text-xs text-emerald-800">
                  Enter the 6-digit OTP sent to <span className="font-bold underline">{forgotEmail}</span>
                </p>
              </div>

              {successMsg && <p className="text-xs font-bold text-emerald-700 text-center bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-200">{successMsg}</p>}
              {error && <p className="text-xs font-bold text-red-600 text-center bg-red-50 py-2.5 px-3 rounded-xl border border-red-200">{error}</p>}

              <form onSubmit={handleForgotStep2Submit} className="space-y-4">
                {/* OTP */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>6-Digit OTP</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">Valid for 15 min</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      className="w-full pl-10 pr-4 py-3 text-slate-950 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-center font-mono text-xl font-extrabold tracking-[0.4em]"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      required
                    />
                    <ShieldCheck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">New Password</label>
                  <div className="relative mt-1">
                    <input
                      type={showForgotPw ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                      value={forgotPasswordVal}
                      onChange={(e) => setForgotPasswordVal(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1"
                      aria-label={showForgotPw ? "Hide" : "Show"}
                    >
                      {showForgotPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative mt-1">
                    <input
                      type={showForgotConfirmPw ? "text" : "password"}
                      placeholder="Re-enter new password"
                      className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                      value={forgotConfirmPasswordVal}
                      onChange={(e) => setForgotConfirmPasswordVal(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1"
                      aria-label={showForgotConfirmPw ? "Hide" : "Show"}
                    >
                      {showForgotConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password match indicator */}
                  {forgotConfirmPasswordVal && (
                    <p className={`mt-1.5 text-[11px] font-bold flex items-center gap-1 ${
                      forgotPasswordVal === forgotConfirmPasswordVal ? "text-emerald-700" : "text-red-600"
                    }`}>
                      {forgotPasswordVal === forgotConfirmPasswordVal ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                      ) : (
                        <><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</>
                      )}
                    </p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={forgotLoading || forgotOtp.length < 6 || !forgotPasswordVal || forgotPasswordVal !== forgotConfirmPasswordVal}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full border-2 border-emerald-800 shadow-md transition disabled:opacity-50 text-sm"
                >
                  {forgotLoading ? "Resetting & Signing In..." : "Reset Password & Login"}
                  {!forgotLoading && <KeyRound className="w-4 h-4" />}
                </motion.button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={handleForgotResendOtp}
                    disabled={forgotResendTimer > 0 || forgotLoading}
                    className="font-bold text-blue-700 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${forgotLoading ? "animate-spin" : ""}`} />
                    <span>{forgotResendTimer > 0 ? `Resend OTP (${forgotResendTimer}s)` : "Resend OTP"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotOtp(""); setForgotPasswordVal(""); setForgotConfirmPasswordVal(""); setError(""); }}
                    className="text-slate-600 hover:text-black font-semibold"
                  >
                    ← Change email
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ──────────────── STEP 1: Identifier ──────────────── */}
          {!isForgotMode && step === 1 && (
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
                  Email Address / SRM Register No.
                </label>
                <input
                  type="text"
                  name="identifier"
                  placeholder="e.g. anything@srmist.edu.in or RA23xxxxxxxxxxx"
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
                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? "Checking ID..." : "Continue"}
                {!loading && <ArrowRight size={16} />}
              </motion.button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenForgotMode()}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  Forgot password? Reset via SRM Email OTP
                </button>
              </div>
            </motion.form>
          )}

          {/* ──────────────── STEP 2: Password ──────────────── */}
          {!isForgotMode && step === 2 && (
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
                <button type="button" onClick={handleBackToStep1} className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline px-2 py-1">
                  Change
                </button>
              </div>

              {/* Case A: Teacher first-time (no password) */}
              {identifiedUser?.role === "teacher" && !identifiedUser?.hasPassword ? (
                <form onSubmit={handleTeacherSetupSubmit} className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-1">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                      <Mail className="w-4 h-4 animate-pulse" />
                    </div>
                    <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">Verification OTP Sent!</h4>
                    <p className="text-xs text-emerald-800">
                      Enter the 6-digit OTP sent to <span className="font-bold underline">{identifiedUser?.email}</span>
                    </p>
                  </div>

                  {error && <p className="text-xs font-bold text-red-600 text-center bg-red-50 py-2 px-3 rounded-lg border border-red-200">{error}</p>}
                  {successMsg && <p className="text-xs font-bold text-emerald-700 text-center bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-200">{successMsg}</p>}

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Enter 6-Digit OTP</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">Valid for 15 min</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="• • • • • •"
                        className="w-full pl-10 pr-4 py-2.5 text-slate-950 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-center font-mono text-lg font-extrabold tracking-[0.35em]"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        autoFocus
                        required
                      />
                      <ShieldCheck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Create Password</label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors p-1" aria-label={showPassword ? "Hide" : "Show"}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative mt-1">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors p-1" aria-label={showConfirmPassword ? "Hide" : "Show"}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full border-2 border-emerald-800 shadow-md transition disabled:opacity-50 text-sm"
                  >
                    {loading ? "Verifying & Signing in..." : "Verify OTP & Set Password"}
                    {!loading && <KeyRound className="w-4 h-4" />}
                  </motion.button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button type="button" onClick={handleResendOtp} disabled={resending} className="font-bold text-blue-700 hover:underline flex items-center gap-1">
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                      <span>{resending ? "Resending OTP..." : "Resend OTP"}</span>
                    </button>
                    <button type="button" onClick={handleBackToStep1} className="text-slate-600 hover:text-black font-semibold">
                      Use another ID
                    </button>
                  </div>
                </form>
              ) : (
                /* Case B: Student OR returning teacher with password set */
                <form onSubmit={handleStep2Submit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Password</label>
                      <button
                        type="button"
                        onClick={() => handleOpenForgotMode(identifiedUser?.role)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
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
                      <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors p-1 focus:outline-none" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* For returning students, password is their personal password */}
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
                    disabled={loading || !password}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? "Signing in..." : "Sign In to Portal"}
                    {!loading && <LogIn size={16} />}
                  </motion.button>

                  <div className="text-center pt-1">
                    <button type="button" onClick={handleBackToStep1} className="text-xs font-bold text-slate-600 hover:text-black transition">
                      ← Back to identifier step
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* ──────────────── STEP 3: Student Email Verification ──────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
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
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 leading-tight">
                      {identifiedUser?.fullName || "SRM Student"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        Student
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {identifiedUser?.regNo}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline px-2 py-1"
                >
                  Change
                </button>
              </div>

              <form onSubmit={handleStep3Submit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-1.5">
                    <AtSign className="w-3.5 h-3.5" />
                    Your SRM Institutional Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="e.g. ab1234@srmist.edu.in"
                      className="w-full pl-10 pr-4 py-3 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium shadow-sm placeholder:text-slate-400"
                      value={studentEmail}
                      onChange={(e) => {
                        setStudentEmail(e.target.value);
                        setError("");
                      }}
                      autoFocus
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Live validation hint */}
                  {studentEmail && studentEmail.includes("@") && (
                    <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold ${
                      isValidSrmEmail(studentEmail)
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}>
                      {isValidSrmEmail(studentEmail) ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Valid SRM institutional email format ✓</>
                      ) : (
                        <><AlertCircle className="w-3.5 h-3.5" /> Must be <span className="font-mono">ab1234@srmist.edu.in</span> (2 letters + 4 digits)</>
                      )}
                    </div>
                  )}
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
                  disabled={loading || !studentEmail.trim() || !isValidSrmEmail(studentEmail)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-full border-2 border-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? "Sending OTP..." : "Send Verification OTP"}
                  {!loading && <ArrowRight size={16} />}
                </motion.button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleBackToStep1}
                    className="text-xs font-bold text-slate-600 hover:text-black transition"
                  >
                    ← Back to Register Number
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ──────────────── STEP 4: OTP + New Password ──────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              className="space-y-4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* OTP sent banner */}
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-1">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <Mail className="w-4 h-4 animate-pulse" />
                </div>
                <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">OTP Sent!</h4>
                <p className="text-xs text-emerald-800">
                  Enter the 6-digit OTP sent to <span className="font-bold underline">{setupEmail}</span>
                </p>
              </div>

              {successMsg && <p className="text-xs font-bold text-emerald-700 text-center bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-200">{successMsg}</p>}
              {error && <p className="text-xs font-bold text-red-600 text-center bg-red-50 py-2.5 px-3 rounded-xl border border-red-200">{error}</p>}

              <form onSubmit={handleStep4Submit} className="space-y-4">
                {/* OTP */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>6-Digit OTP</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">Valid for 15 min</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      className="w-full pl-10 pr-4 py-3 text-slate-950 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-center font-mono text-xl font-extrabold tracking-[0.4em]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      required
                    />
                    <ShieldCheck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">New Password</label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1" aria-label={showPassword ? "Hide" : "Show"}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative mt-1">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      className="w-full pl-4 pr-11 py-2.5 text-slate-900 bg-white/90 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1" aria-label={showConfirmPassword ? "Hide" : "Show"}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password match indicator */}
                  {confirmPassword && (
                    <p className={`mt-1.5 text-[11px] font-bold flex items-center gap-1 ${password === confirmPassword ? "text-emerald-700" : "text-red-600"}`}>
                      {password === confirmPassword ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</> : <><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</>}
                    </p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full border-2 border-emerald-800 shadow-md transition disabled:opacity-50 text-sm"
                >
                  {loading ? "Verifying & Signing in..." : "Verify OTP & Activate Account"}
                  {!loading && <KeyRound className="w-4 h-4" />}
                </motion.button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button type="button" onClick={handleResendOtp} disabled={resending} className="font-bold text-blue-700 hover:underline flex items-center gap-1">
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                    <span>{resending ? "Resending..." : "Resend OTP"}</span>
                  </button>
                  <button type="button" onClick={() => { setStep(3); setOtp(""); setPassword(""); setConfirmPassword(""); setError(""); }} className="text-slate-600 hover:text-black font-semibold">
                    ← Change email
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