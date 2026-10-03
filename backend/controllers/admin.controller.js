// controllers/admin.controller.js
import prisma from "../lib/db.js";

import { isAdminUser } from "../lib/admin.js";

/**
 * Flush all semester records to start afresh for a new semester.
 * Requires admin authorization and explicit confirmation phrase 'flush'.
 */
export const flushDatabase = async (req, res) => {
  try {
    const userEmail = (req.user?.email || "").trim().toLowerCase();
    const isAdmin = isAdminUser(req.user);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to reset the institutional database.",
      });
    }

    const { confirmation } = req.body;
    if (!confirmation || String(confirmation).trim().toLowerCase() !== "flush") {
      return res.status(400).json({
        success: false,
        message: "Confirmation failed. You must type 'flush' to proceed with resetting the database.",
      });
    }

    // Execute atomic purge of all semester round data in correct dependency sequence
    const purgeStats = await prisma.$transaction(async (tx) => {
      // 1. Delete all change tickets (references studentProjectApply and teamApproved)
      const deletedTickets = await tx.ticket.deleteMany({});

      // 2. Delete all teacher project quota tokens
      const deletedQuotaTokens = await tx.projectQuotaToken.deleteMany({});

      // 3. Delete team members and approved teams
      const deletedTeamMembers = await tx.teamMember.deleteMany({});
      const deletedTeams = await tx.teamApproved.deleteMany({});

      // 4. Delete application members and project applications
      const deletedAppMembers = await tx.applicationMember.deleteMany({});
      const deletedApplications = await tx.studentProjectApply.deleteMany({});

      // 5. Delete all proposed major projects
      const deletedProjects = await tx.project.deleteMany({});

      // 6. Delete in-app alerts and notifications
      const deletedNotifications = await tx.notification.deleteMany({});

      // 7. Delete central round deadline
      const deletedDeadlines = await tx.globalDeadline.deleteMany({});

      // 8. Reset faculty project quotas back to the initial default of 2
      const updatedTeachers = await tx.user.updateMany({
        where: { role: "teacher" },
        data: {
          projectQuota: 2,
        },
      });

      // 9. Reset student semester profiles/allocations for the clean round
      const updatedStudents = await tx.user.updateMany({
        where: { role: "student" },
        data: {
          isProfileComplete: false,
          internshipStatus: "regular",
          internshipCompany: "",
          internshipDuration: "",
          internships: [],
          skills: [],
          linkedinUrl: "",
          githubUrl: "",
          resumeUrl: "",
          description: null,
          experience: null,
          researchPast: null,
        },
      });

      return {
        tickets: deletedTickets.count,
        quotaTokens: deletedQuotaTokens.count,
        teams: deletedTeams.count,
        teamMembers: deletedTeamMembers.count,
        applications: deletedApplications.count,
        applicationMembers: deletedAppMembers.count,
        projects: deletedProjects.count,
        notifications: deletedNotifications.count,
        deadlines: deletedDeadlines.count,
        teachersReset: updatedTeachers.count,
        studentsReset: updatedStudents.count,
      };
    });

    console.log(`🧹 Database Flush executed successfully by ${userEmail}:`, purgeStats);

    return res.status(200).json({
      success: true,
      message: "Database flushed successfully! All semester projects, applications, teams, tickets, and quotas have been reset for the new semester.",
      stats: purgeStats,
    });
  } catch (error) {
    console.error("❌ Error executing database flush:", error);
    return res.status(500).json({
      success: false,
      message: "A database error occurred while resetting records. All changes were rolled back.",
      error: error.message,
    });
  }
};
