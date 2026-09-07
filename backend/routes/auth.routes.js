import express from "express";
import rateLimit from "express-rate-limit";
import {
  identifyUser,
  login,
  logout,
  updateProfile,
  checkAuth,
  verifyEmail,
  forgotPassword,
  resetPassword,
  verifyStudentEmail,
  changePassword,
} from "../controllers/auth.controllers.js";
import { protectRoute } from "../middlewares/auth.middlewares.js";
import { getDailyMailStats } from "../lib/mailer.js";

const router = express.Router();

// ─── IP Rate Limiting ───────────────────────────────────────────
// Step 1: Identifier lookup (entering Reg No / Email). Generous limit for shared campus Wi-Fi
const identificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many identification requests from this IP. Please wait a few minutes before trying again.",
  },
});

// Protects endpoints that actually trigger outbound OTP emails
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 OTP requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication/OTP requests from this IP. Please wait 15 minutes before trying again.",
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 login attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts from this IP. Please wait 15 minutes before trying again.",
  },
});

// ─── Public Routes ──────────────────────────────────────────────

// Check current Brevo daily email quota status (diagnostic)
router.get("/email-quota", (req, res) => {
  res.status(200).json(getDailyMailStats());
});

// Two-Step Authentication: Step 1 identification
router.post("/identify", identificationLimiter, identifyUser);

// Login with email/regNo & password
router.post("/login", loginLimiter, login);

// Forgot & Reset Password
router.post("/forgot-password", otpRequestLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

// Student first-time login: validate institutional email & send OTP
router.post("/verify-student-email", otpRequestLimiter, verifyStudentEmail);

// Change password (must be logged in)
router.post("/change-password", protectRoute, changePassword);

// Email verification link
router.get("/verify", verifyEmail);
router.get("/check-auth", protectRoute, checkAuth);
// ─── Protected Routes ───────────────────────────────────────────

// Logout
router.post("/logout", protectRoute, logout);

// Update profile (can also update role if allowed)
router.put("/update-profile", protectRoute, updateProfile);

// Check authentication (returns user data including role)
router.get("/check", protectRoute, checkAuth);

export default router;
