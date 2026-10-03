// routes/usersearch.routes.js
import express from "express";
import { searchUsers } from "../controllers/usersearch.controller.js";
import { validateSearchQuery } from "../middlewares/usersearch.middleware.js";
import { protectRoute } from "../middlewares/auth.middlewares.js";

const router = express.Router();

// GET /api/usersearch?q=...  (login required — returns student PII)
router.get("/", protectRoute, validateSearchQuery, searchUsers);

export default router;
