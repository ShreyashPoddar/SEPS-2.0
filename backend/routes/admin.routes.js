// routes/admin.routes.js
import express from "express";
import { protectRoute } from "../middlewares/auth.middlewares.js";
import { flushDatabase } from "../controllers/admin.controller.js";

const router = express.Router();

// POST /api/admin/flush-database
router.post("/flush-database", protectRoute, flushDatabase);

export default router;
