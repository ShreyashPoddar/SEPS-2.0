// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
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

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ✅ CORS config for frontend + credentials support
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security & optimization middleware
app.use(helmet());
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route
app.get("/", (req, res) => {
  res.send("✅ Student-Teacher Project Backend is running.");
});

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

// Catch-all for unknown routes
app.all("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 3050;
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 Server running on [::]:${PORT} (IPv6 and IPv4 if dual stack)`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
