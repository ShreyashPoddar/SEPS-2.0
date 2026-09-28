// backend/controllers/projectquotatoken.controller.js
import prisma from "../lib/db.js";

const ALLOWED_ADMIN_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
  "hodece@srmist.edu.in",
];

const isAdminUser = (user) => {
  if (!user?.email) return false;
  const email = user.email.trim().toLowerCase();
  return ALLOWED_ADMIN_EMAILS.some((e) => e.toLowerCase() === email);
};

/**
 * Teacher raises a new Project Quota Token to request adding more projects beyond default (2)
 * POST /api/quota-tokens
 */
export const createQuotaToken = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. Only faculty members can raise quota tokens." });
    }

    const { requestedProjects, reason } = req.body;
    const count = parseInt(requestedProjects, 10);

    if (isNaN(count) || count < 1 || count > 20) {
      return res.status(400).json({ message: "Please specify a valid number of additional projects (between 1 and 20)." });
    }

    const trimmedReason = (reason || "").trim();
    if (!trimmedReason || trimmedReason.length < 10) {
      return res.status(400).json({ message: "Please provide a detailed justification (at least 10 characters) explaining why you need additional project topics." });
    }

    const teacherId = req.user.id || req.user._id;

    // Check if teacher already has a pending quota token
    const existingPending = await prisma.projectQuotaToken.findFirst({
      where: {
        teacherId,
        status: "pending",
      },
    });

    if (existingPending) {
      return res.status(400).json({
        message: `You already have an active Token (#${existingPending.tokenNumber}) for ${existingPending.requestedProjects} additional project(s) pending coordinator review. Please wait for it to be processed.`,
      });
    }

    // Generate unique token number e.g. PQT-0012-7A9B
    const totalTokensCount = await prisma.projectQuotaToken.count();
    const tokenSeq = String(totalTokensCount + 1).padStart(4, "0");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tokenNumber = `PQT-${tokenSeq}-${randomSuffix}`;

    const token = await prisma.projectQuotaToken.create({
      data: {
        tokenNumber,
        teacherId,
        teacherName: req.user.fullName,
        teacherEmail: req.user.email,
        requestedProjects: count,
        reason: trimmedReason,
        status: "pending",
      },
    });

    // Notify admins about the new quota token
    const adminUsers = await prisma.user.findMany({
      where: {
        email: { in: ALLOWED_ADMIN_EMAILS },
      },
      select: { id: true },
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New Faculty Project Quota Request",
          message: `${req.user.fullName} has raised Token #${tokenNumber} requesting permission to upload ${count} additional project(s). Reason: "${trimmedReason}"`,
          type: "info",
        },
      });
    }

    return res.status(201).json({
      message: `Quota request token #${tokenNumber} submitted successfully to department coordinators.`,
      token,
    });
  } catch (error) {
    console.error("Error creating quota token:", error);
    return res.status(500).json({ message: "Failed to raise project quota token", error: error.message });
  }
};

/**
 * Get all quota tokens raised by the current teacher
 * GET /api/quota-tokens/my
 */
export const getMyQuotaTokens = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { projectQuota: true },
    });

    const currentQuota = teacher?.projectQuota || 2;
    const currentProjectsCount = await prisma.project.count({
      where: { teacherId },
    });

    const tokens = await prisma.projectQuotaToken.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: {
          select: { fullName: true, email: true },
        },
      },
    });

    return res.status(200).json({
      tokens,
      currentQuota,
      currentProjectsCount,
      availableSlots: Math.max(0, currentQuota - currentProjectsCount),
    });
  } catch (error) {
    console.error("Error fetching faculty quota tokens:", error);
    return res.status(500).json({ message: "Failed to fetch quota tokens", error: error.message });
  }
};

/**
 * Get all quota tokens for Admin Coordinators
 * GET /api/quota-tokens/all
 */
export const getAllQuotaTokens = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: "Access denied. Administrative privileges required." });
    }

    const tokens = await prisma.projectQuotaToken.findMany({
      orderBy: [
        // Pending first, then newest
        { status: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
            projectQuota: true,
          },
        },
        reviewedBy: {
          select: { fullName: true, email: true },
        },
      },
    });

    // Compute live project counts for teachers in the tokens
    const teacherIds = [...new Set(tokens.map((t) => t.teacherId))];
    const projectCounts = await prisma.project.groupBy({
      by: ["teacherId"],
      where: { teacherId: { in: teacherIds } },
      _count: { id: true },
    });

    const countsMap = {};
    projectCounts.forEach((c) => {
      countsMap[c.teacherId] = c._count.id;
    });

    const enrichedTokens = tokens.map((t) => ({
      ...t,
      currentProjectCount: countsMap[t.teacherId] || 0,
      currentQuota: t.teacher?.projectQuota || 2,
    }));

    return res.status(200).json({ tokens: enrichedTokens });
  } catch (error) {
    console.error("Error fetching all quota tokens for admin:", error);
    return res.status(500).json({ message: "Failed to fetch all quota tokens", error: error.message });
  }
};

/**
 * Admin reviews (approves or rejects) a Project Quota Token
 * PATCH /api/quota-tokens/:id/review
 */
export const reviewQuotaToken = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: "Access denied. Administrative privileges required." });
    }

    const { id } = req.params;
    const { action, adminRemarks, approvedProjects } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'." });
    }

    const token = await prisma.projectQuotaToken.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!token) {
      return res.status(404).json({ message: "Project quota token not found." });
    }

    if (token.status !== "pending") {
      return res.status(400).json({
        message: `This token has already been reviewed (${token.status}) on ${new Date(token.reviewedAt).toLocaleDateString()}.`,
      });
    }

    const adminId = req.user.id || req.user._id;
    const remarks = (adminRemarks || "").trim();

    if (action === "approve") {
      const additionalCount = parseInt(approvedProjects, 10) || token.requestedProjects;
      const currentQuota = token.teacher?.projectQuota || 2;
      const newQuota = currentQuota + additionalCount;

      // Update teacher quota and token status
      const [updatedUser, updatedToken] = await prisma.$transaction([
        prisma.user.update({
          where: { id: token.teacherId },
          data: { projectQuota: newQuota },
        }),
        prisma.projectQuotaToken.update({
          where: { id },
          data: {
            status: "approved",
            approvedProjects: additionalCount,
            adminRemarks: remarks || `Approved +${additionalCount} additional project topic(s).`,
            reviewedById: adminId,
            reviewedAt: new Date(),
          },
          include: {
            reviewedBy: { select: { fullName: true, email: true } },
          },
        }),
      ]);

      // Notify the teacher via database Notification
      await prisma.notification.create({
        data: {
          userId: token.teacherId,
          title: "🎉 Project Quota Token Approved!",
          message: `Your request for ${additionalCount} additional project(s) (Token #${token.tokenNumber}) has been approved by Coordinator ${req.user.fullName}. Your project creation limit is now ${newQuota} projects.${remarks ? " Note: " + remarks : ""}`,
          type: "success",
        },
      });

      return res.status(200).json({
        message: `Token #${token.tokenNumber} approved! Faculty ${token.teacherName}'s project limit increased to ${newQuota}.`,
        token: updatedToken,
        newQuota,
      });
    } else {
      // Reject action
      const updatedToken = await prisma.projectQuotaToken.update({
        where: { id },
        data: {
          status: "rejected",
          approvedProjects: 0,
          adminRemarks: remarks || "Declined by department coordinator.",
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
        include: {
          reviewedBy: { select: { fullName: true, email: true } },
        },
      });

      // Notify teacher of rejection
      await prisma.notification.create({
        data: {
          userId: token.teacherId,
          title: "Project Quota Request Update",
          message: `Your request for additional projects (Token #${token.tokenNumber}) was not approved by Coordinator ${req.user.fullName}.${remarks ? " Reason: " + remarks : ""}`,
          type: "warning",
        },
      });

      return res.status(200).json({
        message: `Token #${token.tokenNumber} has been rejected.`,
        token: updatedToken,
      });
    }
  } catch (error) {
    console.error("Error reviewing quota token:", error);
    return res.status(500).json({ message: "Failed to review quota token", error: error.message });
  }
};
