// routes/teamapproved.routes.js
import express from "express";
import {
  approveApplication,
  rejectApplication,
  getApprovedTeams,
  removeMemberFromTeam,
  addMemberToTeam,
} from "../controllers/teamapproved.controller.js";
import { validateApplicationExists } from "../middlewares/teamapproved.middleware.js";
import { searchStudentByRegNo } from "../controllers/user.controller.js";
import { protectRoute } from "../middlewares/auth.middlewares.js";

const router = express.Router();

// Every route below touches team rosters or student records, so all of them
// require a session. Per-route ownership checks live in the controllers.
router.use(protectRoute);

// ✅ Approve and move to TeamApproved
router.post(
  "/approve/:applicationId",
  validateApplicationExists,
  approveApplication
);

// ❌ Reject and delete
router.post(
  "/reject/:applicationId",
  validateApplicationExists,
  rejectApplication
);

// 📌 Get all approved teams
router.get("/", getApprovedTeams);

// 🔍 Search student by regNo
router.get("/search-student", searchStudentByRegNo);

// 📌 Remove member from team
router.delete("/:teamId/members/:memberId", removeMemberFromTeam);

// ➕ Add member
router.post("/:teamId/members", addMemberToTeam);
export default router;
