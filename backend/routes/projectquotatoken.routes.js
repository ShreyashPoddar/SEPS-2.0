// backend/routes/projectquotatoken.routes.js
import express from "express";
import { protectRoute } from "../middlewares/auth.middlewares.js";
import {
  createQuotaToken,
  getMyQuotaTokens,
  getAllQuotaTokens,
  reviewQuotaToken,
} from "../controllers/projectquotatoken.controller.js";

const router = express.Router();

// Teacher routes
router.post("/", protectRoute, createQuotaToken);
router.get("/my", protectRoute, getMyQuotaTokens);

// Admin coordinator routes
router.get("/all", protectRoute, getAllQuotaTokens);
router.patch("/:id/review", protectRoute, reviewQuotaToken);

export default router;
