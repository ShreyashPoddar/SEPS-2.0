// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/projectupload.routes.js";
import studentRoutes from "./routes/studentprojectapply.routes.js";
import userSearchRoutes from "./routes/usersearch.routes.js";
import teamApprovedRoutes from "./routes/teamapproved.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import infoRoutes from "./routes/info.routes.js";
import globalDeadlineRoutes from "./routes/globalDeadline.routes.js";
import statisticsRoutes from "./routes/statistics.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import rateLimit from "express-rate-limit";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ✅ Trust proxy for reverse proxies (Render, Vercel, Cloudflare)
// This ensures client IP addresses are correctly resolved for rate limiting
app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS config for frontend + credentials support
// In production, CLIENT_URL is set to the Vercel frontend URL so only that origin
// can send credentialed (cookie) requests — prevents token leakage to arbitrary origins.
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5176", "http://localhost:5173", "https://seps.srmecho.in"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, Postman) and explicitly listed origins
      if (!origin || allowedOrigins.some((o) => o === origin || origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security & optimization middleware (disable restrictive CSP/COEP so React SPA, CDN fonts & HF iframe work seamlessly)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());

// Body parsing with 2MB ceiling to protect Render 512MB RAM against buffer flooding
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// 🛡️ Global API Rate Limiter tuned for Render Free Tier (512MB RAM & 0.1 shared vCPU)
// Allows 150 requests per 15 minutes per IP (~10 req/min), plenty for normal dashboard navigation
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // max 150 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP address. Please slow down and try again after a few moments.",
  },
});
app.use("/api", globalApiLimiter);

// Lightweight health check endpoint for cold-start verification & uptime monitors
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "SEPS Backend", timestamp: new Date().toISOString() });
});

// Static frontend serving for production / Docker deployment
const frontendDistPath = path.resolve(__dirname, "../Frontend/dist");
const localPublicPath = path.resolve(__dirname, "./public");
const clientDist = fs.existsSync(frontendDistPath)
  ? frontendDistPath
  : fs.existsSync(localPublicPath)
    ? localPublicPath
    : null;

if (clientDist) {
  console.log(`📦 Serving static frontend from: ${clientDist}`);
  app.use(express.static(clientDist));
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/usersearch", userSearchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/team-approved", teamApprovedRoutes);
app.use("/api/info", infoRoutes);
app.use("/api/global-deadline", globalDeadlineRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/tickets", ticketRoutes);

// SPA client-side fallback (route all non-API GET requests to index.html)
if (clientDist) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  // Health check route if frontend is not built
  app.get("/", (req, res) => {
    res.send("✅ Student-Teacher Project Backend is running.");
  });
}

// Catch-all for unhandled routes
app.all("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Render free-tier web services use port 10000 by default — fall back to 7860 for HF/local
const PORT = process.env.PORT || 10000;
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 Server running on http://0.0.0.0:${PORT}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
