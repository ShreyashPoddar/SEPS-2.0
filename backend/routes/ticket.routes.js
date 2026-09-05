// routes/ticket.routes.js
// Faculty-side ticket review. Student-side ticket routes live under
// /api/student in studentprojectapply.routes.js.
import express from "express";
import { getFacultyTickets, actOnTicket } from "../controllers/ticket.controller.js";
import { protectRoute } from "../middlewares/auth.middlewares.js";

const router = express.Router();

router.use(protectRoute);

// All change tickets raised against the logged-in teacher's projects
router.get("/", getFacultyTickets);

// Advance one ticket: { action: "review" | "approve" | "reject", remarks? }
router.put("/:ticketId", actOnTicket);

export default router;
