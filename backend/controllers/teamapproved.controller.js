// controllers/teamapproved.controller.js
import prisma from "../lib/db.js";

const memberOrder = { orderBy: { createdAt: "asc" } };

// `shapeTeam` spreads the related user into members[].studentId, so this must
// never be `student: true` — that ships password hashes and reset tokens to the
// client. MyTeams.jsx only reads studentId._id; the rest is display headroom.
const safeStudent = {
  select: {
    id: true,
    fullName: true,
    email: true,
    regNo: true,
    department: true,
  },
};

const teamWithMembers = {
  project: true,
  members: { ...memberOrder, include: { student: safeStudent } },
};

// Faculty may only act on teams and applications belonging to their own
// projects. Returns an error object to send, or null when the caller is allowed.
const ownershipError = (req, project) => {
  if (req.user.role !== "teacher") {
    return { status: 403, message: "Access denied. Only teachers can manage approved teams." };
  }
  if (!project || project.teacherId !== req.user._id) {
    return { status: 403, message: "Access denied. You can only manage teams for your own projects." };
  }
  return null;
};

const shapeTeam = (team) => {
  team._id = team.id;
  team.projectId = team.project ? { _id: team.project.id, ...team.project } : team.projectId;
  if (team.members) {
    team.members.forEach((m) => {
      m._id = m.id;
      if (m.student) m.studentId = { _id: m.student.id, ...m.student };
    });
  }
  return team;
};

// ✅ Approve an application
export const approveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await prisma.studentProjectApply.findUnique({
      where: { id: applicationId },
      include: { project: true, members: memberOrder },
    });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const denied = ownershipError(req, application.project);
    if (denied) {
      return res.status(denied.status).json({ message: denied.message });
    }

    // REQUIREMENT: If this is a Priority 2 application, verify that NO member has an active Priority 1 project
    if (application.priority === 2) {
      const studentIds = application.members.map((m) => m.studentId);
      const activeP1 = await prisma.studentProjectApply.findFirst({
        where: {
          id: { not: applicationId },
          priority: 1,
          status: { in: ["pending_member_approval", "pending_faculty_approval"] },
          members: { some: { studentId: { in: studentIds } } },
        },
        include: {
          project: { select: { projectTitle: true } },
          members: true,
        },
      });

      if (activeP1) {
        const conflictMember = activeP1.members.find((m) => studentIds.includes(m.studentId));
        return res.status(400).json({
          message: `Cannot approve Priority 2 application: Team member ${conflictMember?.name || "student"} (${conflictMember?.regNo || "N/A"}) still has an active Priority 1 application for "${activeP1.project?.projectTitle || "Priority 1 Project"}". The student must manually close/cancel their Priority 1 application before this Priority 2 application can be approved.`,
          blockingMember: {
            name: conflictMember?.name,
            regNo: conflictMember?.regNo,
            p1ProjectTitle: activeP1.project?.projectTitle,
            p1ApplicationId: activeP1.id,
          },
        });
      }
    }

    const approvedTeam = await prisma.teamApproved.create({
      data: {
        projectId: application.project.id,
        facultyName: application.project.facultyName,
        applicationType: application.applicationType,
        members: {
          create: application.members.map((m) => ({
            studentId: m.studentId,
            name: m.name,
            regNo: m.regNo,
          })),
        },
      },
      include: teamWithMembers,
    });

    for (const member of application.members) {
      await prisma.notification.create({
        data: {
          userId: member.studentId,
          title: "Project Application Approved",
          message: `Your application for project "${application.project.projectTitle}" has been approved by ${application.project.facultyName}.`,
          type: "success",
        },
      });
    }

    // Tickets raised against this application move to the approved team, so the
    // roster-change history survives approval. Without this the applications are
    // deleted below and every ticket went with them — leaving students unable to
    // request a member change at the one point they most need to.
    await prisma.ticket.updateMany({
      where: { applicationId },
      data: { teamId: approvedTeam.id, applicationId: null },
    });

    const memberIds = application.members.map((m) => m.studentId);
    const otherApplications = await prisma.studentProjectApply.findMany({
      where: { members: { some: { studentId: { in: memberIds } } } },
      select: { id: true },
    });
    const discardedIds = otherApplications
      .map((a) => a.id)
      .filter((id) => id !== applicationId);

    // Tickets on the members' other (now-discarded) applications are meaningless
    // once those applications go, so drop them rather than leaving them orphaned.
    if (discardedIds.length) {
      await prisma.ticket.deleteMany({ where: { applicationId: { in: discardedIds } } });
    }

    await prisma.studentProjectApply.deleteMany({
      where: { id: { in: otherApplications.map((a) => a.id) } },
    });

    res.status(201).json({
      message:
        "Application approved, team created, notifications sent, and all other applications of these members deleted.",
      approvedTeam: shapeTeam(approvedTeam),
    });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ❌ Reject an application
export const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await prisma.studentProjectApply.findUnique({
      where: { id: applicationId },
      include: { project: true, members: memberOrder },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const denied = ownershipError(req, application.project);
    if (denied) {
      return res.status(denied.status).json({ message: denied.message });
    }

    const leaderId = application.members[0].studentId;

    for (const member of application.members) {
      await prisma.notification.create({
        data: {
          userId: member.studentId,
          title: "Project Application Rejected",
          message: `Your Priority ${application.priority} application for project "${application.project?.projectTitle}" has been rejected.`,
          type: "error",
        },
      });
    }

    await prisma.studentProjectApply.delete({ where: { id: applicationId } });

    if (application.priority === 1) {
      const priority2 = await prisma.studentProjectApply.findFirst({
        where: { priority: 2, members: { some: { studentId: leaderId } } },
        include: { project: true },
      });

      if (priority2) {
        console.log(`Faculty ${priority2.project.facultyName} notified about Priority 2 application`);
      }
    }

    res.status(200).json({ message: "Application rejected and notifications sent" });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 📌 Fetch all approved teams
export const getApprovedTeams = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. Only teachers can view approved teams." });
    }

    // Scoped to the caller's own projects. MyTeams.jsx already filters
    // client-side; doing it here stops the full roster leaving the server.
    const teams = await prisma.teamApproved.findMany({
      where: { project: { teacherId: req.user._id } },
      include: teamWithMembers,
    });
    teams.forEach(shapeTeam);
    res.status(200).json({ teams });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Remove a member from an approved team
export const removeMemberFromTeam = async (req, res) => {
  try {
    const { teamId, memberId } = req.params; // memberId here is the *student's* id, matching old $pull semantics

    const team = await prisma.teamApproved.findUnique({
      where: { id: teamId },
      include: { project: true },
    });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const denied = ownershipError(req, team.project);
    if (denied) {
      return res.status(denied.status).json({ message: denied.message });
    }

    const existingMember = await prisma.teamMember.findFirst({
      where: { teamId, studentId: memberId },
    });
    if (!existingMember) {
      return res.status(404).json({ message: "Member not found in this team" });
    }

    await prisma.teamMember.delete({ where: { id: existingMember.id } });

    const updatedTeam = await prisma.teamApproved.findUnique({
      where: { id: teamId },
      include: teamWithMembers,
    });

    await prisma.notification.create({
      data: {
        userId: memberId,
        title: "Removed from Team",
        message: `You have been removed from the project "${updatedTeam.project.projectTitle}" by ${updatedTeam.facultyName}.`,
        type: "warning",
      },
    });

    res.status(200).json({ message: "Member removed successfully", team: shapeTeam(updatedTeam) });
  } catch (err) {
    console.error("Remove member error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ➕ Add member to approved team
export const addMemberToTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { studentId } = req.body;

    const team = await prisma.teamApproved.findUnique({
      where: { id: teamId },
      include: { project: true },
    });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const denied = ownershipError(req, team.project);
    if (denied) {
      return res.status(denied.status).json({ message: denied.message });
    }

    const alreadyInTeam = await prisma.teamMember.findFirst({ where: { studentId } });
    if (alreadyInTeam) {
      return res.status(400).json({
        message: "This student is already part of another approved team",
      });
    }

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await prisma.teamMember.create({
      data: { teamId, studentId: student.id, name: student.fullName, regNo: student.regNo },
    });

    const updatedTeam = await prisma.teamApproved.findUnique({
      where: { id: teamId },
      include: teamWithMembers,
    });

    await prisma.notification.create({
      data: {
        userId: student.id,
        title: "Added to Project Team",
        message: `You have been added to the project "${updatedTeam.project.projectTitle}" by ${updatedTeam.facultyName}.`,
        type: "info",
      },
    });

    res.status(200).json({ message: "Member added successfully", team: shapeTeam(updatedTeam) });
  } catch (err) {
    console.error("Add member error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
