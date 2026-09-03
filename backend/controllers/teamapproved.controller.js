// controllers/teamapproved.controller.js
import prisma from "../lib/db.js";

const memberOrder = { orderBy: { createdAt: "asc" } };

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
      include: { project: true, members: memberOrder },
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

    const memberIds = application.members.map((m) => m.studentId);
    const otherApplications = await prisma.studentProjectApply.findMany({
      where: { members: { some: { studentId: { in: memberIds } } } },
      select: { id: true },
    });
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
    const teams = await prisma.teamApproved.findMany({
      include: {
        project: true,
        members: { ...memberOrder, include: { student: true } },
      },
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

    const existingMember = await prisma.teamMember.findFirst({
      where: { teamId, studentId: memberId },
    });
    if (!existingMember) {
      return res.status(404).json({ message: "Team not found" });
    }

    await prisma.teamMember.delete({ where: { id: existingMember.id } });

    const updatedTeam = await prisma.teamApproved.findUnique({
      where: { id: teamId },
      include: { project: true, members: { ...memberOrder, include: { student: true } } },
    });
    if (!updatedTeam) {
      return res.status(404).json({ message: "Team not found" });
    }

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

    const team = await prisma.teamApproved.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
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
      include: { project: true, members: { ...memberOrder, include: { student: true } } },
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
