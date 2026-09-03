import prisma from "../lib/db.js";

const memberOrder = { orderBy: { createdAt: "asc" } };

export const applyToProject = async (req, res) => {
  try {
    const { projectId, applicationType, members } = req.body;
    const leader = req.user;

    const existingMemberships = await prisma.applicationMember.findMany({
      where: { studentId: leader._id },
      include: { application: true },
    });

    if (existingMemberships.length >= 2) {
      return res.status(400).json({
        message: "You can only apply for up to 2 projects (Priority 1 & 2).",
      });
    }

    const priority = existingMemberships.length === 0 ? 1 : 2;

    if (existingMemberships.some((m) => m.application.priority === priority)) {
      return res.status(400).json({ message: `You already applied for Priority ${priority}.` });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const leaderCohort = leader.internshipStatus || "regular";
    const leaderDept = leader.department || "Dept of ECE";
    let hasCrossBranch = false;

    const memberData = [
      {
        studentId: leader._id,
        name: leader.fullName,
        regNo: leader.regNo || "N/A",
        department: leaderDept,
        internshipStatus: leaderCohort,
        status: "approved",
      },
    ];

    if (applicationType === "group") {
      if (!members || members.length !== 2) {
        return res.status(400).json({
          message: "A group application must include exactly two other members.",
        });
      }

      for (const member of members) {
        const orClauses = [];
        if (member.regNo) orClauses.push({ regNo: member.regNo });
        if (member.studentId) orClauses.push({ id: member.studentId });

        const memberUser = orClauses.length
          ? await prisma.user.findFirst({ where: { OR: orClauses } })
          : null;

        if (!memberUser) {
          return res.status(404).json({
            message: `Student with Reg No "${member.regNo}" not found.`,
          });
        }

        const teammateAlreadyApplied = await prisma.applicationMember.findFirst({
          where: { studentId: memberUser.id, application: { projectId } },
        });
        if (teammateAlreadyApplied) {
          return res.status(400).json({
            message: `Student ${memberUser.fullName} has already applied for this project.`,
          });
        }

        // Internship-cohort constraint: mixed regular/internship teams aren't allowed
        const memberCohort = memberUser.internshipStatus || "regular";
        if (memberCohort !== leaderCohort) {
          return res.status(400).json({
            message: `Cohort Mismatch: Student ${memberUser.fullName} is on the ${memberCohort === "internship" ? "Corporate Internship" : "Regular"} track, while your team is on the ${leaderCohort === "internship" ? "Corporate Internship" : "Regular"} track. Mixed teams are not allowed.`,
          });
        }

        const memberDept = memberUser.department || "Dept of ECE";
        if (memberDept !== leaderDept) {
          hasCrossBranch = true;
        }

        memberData.push({
          studentId: memberUser.id,
          name: memberUser.fullName,
          regNo: memberUser.regNo,
          department: memberDept,
          internshipStatus: memberCohort,
          status: "pending",
        });
      }
    }

    const application = await prisma.studentProjectApply.create({
      data: {
        projectId,
        applicationType,
        cohortTrack: leaderCohort,
        hasCrossBranch,
        priority,
        status: applicationType === "group" ? "pending_member_approval" : "pending_faculty_approval",
        members: { create: memberData },
      },
      include: { members: memberOrder },
    });
    application._id = application.id;

    res.status(201).json({
      message: `Application for Priority ${priority} submitted successfully!`,
      application,
    });
  } catch (error) {
    console.error("Apply to project error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPendingInvitations = async (req, res) => {
  try {
    const studentId = req.user._id;

    const invitations = await prisma.studentProjectApply.findMany({
      where: { members: { some: { studentId, status: "pending" } } },
      include: {
        members: memberOrder,
        project: { select: { projectTitle: true, facultyName: true } },
      },
    });

    const formattedInvitations = invitations.map((app) => {
      const member = app.members.find((m) => m.studentId === studentId);
      const leader = app.members[0];

      return {
        applicationId: app.id,
        memberId: member.id,
        projectTitle: app.project.projectTitle,
        facultyName: app.project.facultyName,
        leaderName: leader.name,
      };
    });

    res.status(200).json(formattedInvitations);
  } catch (error) {
    console.error("Error fetching pending invitations:", error);
    res.status(500).json({ message: "Server error fetching invitations.", error: error.message });
  }
};

export const respondToInvitation = async (req, res) => {
  try {
    const { applicationId, memberId, response } = req.body;
    const studentId = req.user._id;

    if (!["approved", "rejected"].includes(response)) {
      return res.status(400).json({ message: "Invalid response." });
    }

    const application = await prisma.studentProjectApply.findUnique({
      where: { id: applicationId },
      include: { members: memberOrder },
    });
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    const member = application.members.find((m) => m.id === memberId);
    if (!member || member.studentId !== studentId) {
      return res.status(403).json({
        message: "You are not authorized to respond to this invitation.",
      });
    }

    if (response === "approved") {
      await prisma.applicationMember.update({
        where: { id: memberId },
        data: { status: "approved" },
      });

      const refreshed = await prisma.applicationMember.findMany({
        where: { applicationId },
      });
      const allApproved = refreshed.every((m) => m.status === "approved");
      if (allApproved) {
        await prisma.studentProjectApply.update({
          where: { id: applicationId },
          data: { status: "pending_faculty_approval" },
        });
        console.log(`NOTIFY FACULTY: Application ${applicationId} is ready for review.`);
      }
    } else {
      await prisma.studentProjectApply.delete({ where: { id: applicationId } });
      return res.status(200).json({
        message: "You have rejected the invitation. The application has been withdrawn.",
      });
    }

    res.status(200).json({ message: "You have successfully accepted the invitation!" });
  } catch (error) {
    res.status(500).json({ message: "Server error responding to invitation.", error: error.message });
  }
};

export const getApplicationsForProject = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({
        message: "Access denied. Only teachers can view applications.",
      });
    }

    const { projectId } = req.params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.facultyName !== req.user.fullName) {
      return res.status(403).json({
        message: "Access denied. You can only view applications for your own projects.",
      });
    }

    let applications = await prisma.studentProjectApply.findMany({
      where: { projectId },
      include: {
        members: {
          ...memberOrder,
          include: { student: { select: { fullName: true, email: true, regNo: true } } },
        },
      },
    });

    if (!applications.length) {
      return res.status(200).json({ project: withId(project), applications: [] });
    }

    let highestPriority = null;
    for (let p = 1; p <= 2; p++) {
      if (applications.some((app) => app.priority === p)) {
        highestPriority = p;
        break;
      }
    }

    if (!highestPriority) {
      return res.status(200).json({ project: withId(project), applications: [] });
    }

    applications = applications.filter((app) => app.priority === highestPriority);

    const priority1Members = await prisma.applicationMember.findMany({
      where: { application: { priority: 1 } },
      select: { studentId: true },
    });
    const p1Set = new Set(priority1Members.map((m) => m.studentId));

    applications = applications.filter((app) => {
      if (app.priority === 2) {
        return !app.members.some((m) => p1Set.has(m.studentId));
      }
      return true;
    });

    applications.forEach((app) => {
      app._id = app.id;
      app.members.forEach((m) => {
        m._id = m.id;
        m.studentId = { _id: m.studentId, ...m.student };
      });
    });

    res.status(200).json({
      project: {
        _id: project.id,
        title: project.projectTitle,
        facultyName: project.facultyName,
      },
      applications,
    });
  } catch (error) {
    console.error("Get Applications Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all applications for the logged-in student
export const getMyApplications = async (req, res) => {
  try {
    const studentId = req.user._id;
    const applications = await prisma.studentProjectApply.findMany({
      where: { members: { some: { studentId } } },
      include: {
        project: { select: { id: true, projectTitle: true, facultyName: true, domain: true, description: true } },
        members: {
          ...memberOrder,
          include: { student: { select: { department: true, internshipStatus: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = applications.map((app) => ({
      _id: app.id,
      projectId: app.project?.id,
      projectTitle: app.project?.projectTitle || "Capstone Project",
      facultyName: app.project?.facultyName || "Faculty Advisor",
      priority: app.priority,
      status: app.status,
      cohortTrack: app.cohortTrack || "regular",
      hasCrossBranch: app.hasCrossBranch || false,
      members: app.members.map((m) => ({
        studentId: m.studentId,
        name: m.name,
        regNo: m.regNo,
        department: m.department || m.student?.department || "Dept of ECE",
        internshipStatus: m.internshipStatus || m.student?.internshipStatus || "regular",
        status: m.status,
      })),
      submittedAt: app.createdAt || app.appliedAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Get my applications error:", error);
    res.status(500).json({ message: "Server error fetching applications", error: error.message });
  }
};

// Raise a team member modification ticket
export const raiseTicket = async (req, res) => {
  try {
    const { applicationId, projectTitle, facultyName, targetMember, changeType, requestedChanges, reason } = req.body;
    const studentId = req.user._id;

    if (!applicationId || !targetMember || !changeType || !reason) {
      return res.status(400).json({ message: "All required ticket fields must be provided." });
    }

    const ticketId = "TCK-" + Math.floor(1000 + Math.random() * 9000);

    const newTicket = await prisma.ticket.create({
      data: {
        ticketId,
        applicationId,
        studentId,
        projectTitle: projectTitle || "Capstone Project",
        facultyName: facultyName || "Faculty Guide",
        targetMember,
        changeType,
        requestedChanges: requestedChanges || undefined,
        reason,
        status: "pending",
        progressStep: 1,
        timeline: [
          {
            step: "Submitted",
            date: new Date(),
            message: "Ticket created and dispatched to Department Coordinator.",
          },
        ],
      },
    });
    newTicket._id = newTicket.id;

    res.status(201).json({
      message: `Ticket #${ticketId} submitted successfully! Your departmental coordinator will review the request.`,
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Raise ticket error:", error);
    res.status(500).json({ message: "Server error raising ticket", error: error.message });
  }
};

// Get all change tickets for the logged-in student
export const getStudentTickets = async (req, res) => {
  try {
    const studentId = req.user._id;
    const tickets = await prisma.ticket.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
    tickets.forEach((t) => (t._id = t.id));
    res.status(200).json(tickets);
  } catch (error) {
    console.error("Get student tickets error:", error);
    res.status(500).json({ message: "Server error fetching tickets", error: error.message });
  }
};

// Cancel a change ticket
export const cancelTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const studentId = req.user._id;

    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [{ id: ticketId }, { ticketId: ticketId }],
        studentId,
      },
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found or unauthorized." });
    }

    await prisma.ticket.delete({ where: { id: ticket.id } });
    res.status(200).json({ message: "Ticket cancelled successfully." });
  } catch (error) {
    console.error("Cancel ticket error:", error);
    res.status(500).json({ message: "Server error cancelling ticket", error: error.message });
  }
};

function withId(obj) {
  obj._id = obj.id;
  return obj;
}
