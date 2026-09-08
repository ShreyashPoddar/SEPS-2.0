import express from "express";
import rateLimit from "express-rate-limit";
import {
  identifyUser,
  login,
  logout,
  updateProfile,
  checkAuth,
} from "../controllers/auth.controllers.js";
import { protectRoute } from "../middlewares/auth.middlewares.js";

const router = express.Router();

// ─── IP Rate Limiting ───────────────────────────────────────────
// Step 1: Identifier lookup (entering Reg No / Email)
const identificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many identification requests from this IP. Please wait a few minutes before trying again.",
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

// Two-Step Authentication: Step 1 identification
router.post("/identify", identificationLimiter, identifyUser);

// Login with email/regNo & password
router.post("/login", loginLimiter, login);

// ─── Protected Routes ───────────────────────────────────────────

// Logout
router.post("/logout", protectRoute, logout);

// Update profile
router.put("/update-profile", protectRoute, updateProfile);

// Check authentication (returns user data including role)
router.get("/check-auth", protectRoute, checkAuth);
router.get("/check", protectRoute, checkAuth);

export default router;
