import prisma from "../lib/db.js";
import { isStudentEligibleForStream } from "../lib/streamMatcher.js";

const memberOrder = { orderBy: { createdAt: "asc" } };

export const applyToProject = async (req, res) => {
  try {
    const { projectId, members } = req.body;
    const applicationType = "group";
    const leader = req.user;

    // Team size validation:
    // Team Leader + 1 or 2 invited teammates = 2 or 3 students total.
    const isLeaderEntry = (m) =>
      (m.studentId && (m.studentId === leader._id || m.studentId === leader.id)) ||
      (m.regNo && leader.regNo && m.regNo.toLowerCase() === leader.regNo.toLowerCase());

    const otherMembers = (members || []).filter((m) => !isLeaderEntry(m));

    if (otherMembers.length < 1 || otherMembers.length > 2) {
      return res.status(400).json({
        message:
          "The team must consist of either 2 or 3 students (team leader and 1 or 2 teammates). Individual applications or teams with more than 3 members are not permitted.",
      });
    }

    // Ensure distinct teammates in otherMembers
    const seenRegNos = new Set();
    const seenMemberIds = new Set();
    for (const m of otherMembers) {
      if (m.regNo) {
        const normReg = m.regNo.trim().toLowerCase();
        if (seenRegNos.has(normReg)) {
          return res.status(400).json({
            message: `Duplicate team member detected: Reg No "${m.regNo}". Each team member must be unique.`,
          });
        }
        seenRegNos.add(normReg);
      }
      if (m.studentId) {
        if (seenMemberIds.has(m.studentId)) {
          return res.status(400).json({
            message: "Duplicate team member detected in the application. Each team member must be unique.",
          });
        }
        seenMemberIds.add(m.studentId);
      }
    }

    const leaderApprovedTeam = await prisma.teamMember.findFirst({
      where: { studentId: leader._id },
    });
    if (leaderApprovedTeam) {
      return res.status(400).json({
        message: "You are already allocated to an approved major project and cannot apply for additional projects.",
      });
    }

    const existingMemberships = await prisma.applicationMember.findMany({
      where: { studentId: leader._id },
      include: { application: true },
    });

    if (existingMemberships.length >= 2) {
      return res.status(400).json({
        message: "You can only apply for up to 2 projects (Priority 1 & 2).",
      });
    }

    if (existingMemberships.some((m) => m.application.projectId === projectId)) {
      return res.status(400).json({
        message: "You have already applied for this project. Please choose a different project.",
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

    if (!isStudentEligibleForStream(leader, project.stream)) {
      return res.status(403).json({
        message: `This project is restricted to stream(s): ${project.stream}. Your department (${leader.department || "N/A"}) is not eligible to apply.`,
      });
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

    for (const member of otherMembers) {
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

        if (
          memberUser.id === leader._id ||
          memberUser.id === leader.id ||
          (memberUser.regNo && leader.regNo && memberUser.regNo.toLowerCase() === leader.regNo.toLowerCase())
        ) {
          return res.status(400).json({
            message: "Team leader cannot be added as a teammate.",
          });
        }

        const memberApproved = await prisma.teamMember.findFirst({
          where: { studentId: memberUser.id },
        });
        if (memberApproved) {
          return res.status(400).json({
            message: `Student ${memberUser.fullName} (${memberUser.regNo || "N/A"}) is already allocated to an approved major project.`,
          });
        }

        const memberMemberships = await prisma.applicationMember.findMany({
          where: { studentId: memberUser.id },
          include: { application: true },
        });
        if (memberMemberships.length >= 2) {
          return res.status(400).json({
            message: `Student ${memberUser.fullName} (${memberUser.regNo || "N/A"}) has already applied for the maximum limit of 2 projects.`,
          });
        }

        if (memberMemberships.some((m) => m.application.projectId === projectId)) {
          return res.status(400).json({
            message: `Student ${memberUser.fullName} (${memberUser.regNo || "N/A"}) has already applied for this project.`,
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

    const response = {
      message: `Application for Priority ${priority} submitted successfully!`,
      application,
    };

    if (hasCrossBranch) {
      response.warning =
        "Cross-Branch Team: Your team includes a student from a different department. Please make sure this is intended.";
    }

    res.status(201).json(response);
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
        members: {
          ...memberOrder,
          include: {
            student: {
              select: {
                phoneNumber: true,
                email: true,
                department: true,
                regNo: true,
              },
            },
          },
        },
        project: { select: { projectTitle: true, facultyName: true } },
      },
    });

    const formattedInvitations = invitations.map((app) => {
      const member = app.members.find((m) => m.studentId === studentId);
      const leader = app.members.find((m) => m.status === "approved") || app.members[0];

      return {
        applicationId: app.id,
        memberId: member?.id,
        projectTitle: app.project?.projectTitle,
        facultyName: app.project?.facultyName,
        leaderName: leader?.name,
        leaderRegNo: leader?.regNo,
        leaderDept: leader?.department || leader?.student?.department || "Dept of ECE",
        leaderPhone: leader?.student?.phoneNumber || "",
        leaderEmail: leader?.student?.email || "",
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
      const memberApproved = await prisma.teamMember.findFirst({
        where: { studentId },
      });
      if (memberApproved) {
        return res.status(400).json({
          message: "You are already allocated to an approved major project and cannot accept this invitation.",
        });
      }

      const activeApplicationsCount = await prisma.applicationMember.count({
        where: {
          studentId,
          status: "approved",
          applicationId: { not: applicationId },
        },
      });
      if (activeApplicationsCount >= 2) {
        return res.status(400).json({
          message: "You have already reached the maximum limit of 2 project applications.",
        });
      }

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

    const isOwner =
      project.teacherId === req.user._id ||
      project.teacherId === req.user.id ||
      project.facultyName?.trim().toLowerCase() === req.user.fullName?.trim().toLowerCase();
    if (!isOwner) {
      return res.status(403).json({
        message: "Access denied. You can only view applications for your own projects.",
      });
    }

    let applications = await prisma.studentProjectApply.findMany({
      where: { projectId },
      include: {
        members: {
          ...memberOrder,
          include: {
            student: {
              select: {
                fullName: true,
                email: true,
                regNo: true,
                department: true,
                internshipStatus: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
      // First-come, first-served: within the same priority, applications submitted first are ranked first
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    for (let index = 0; index < applications.length; index++) {
      const app = applications[index];
      app._id = app.id;
      app.queueRank = index + 1;
      app.isFirstComePriority = index === 0;

      app.members.forEach((m, idx) => {
        m._id = m.id;
        m.isLeader = idx === 0;
        m.phoneNumber = m.student?.phoneNumber || "";
        m.studentId = { _id: m.studentId, ...m.student };
      });

      // Priority 2 gating check: verify if any member still has an active Priority 1 application
      app.blockingPriority1 = null;
      if (app.priority === 2) {
        const studentIds = app.members.map((m) => m.studentId._id || m.studentId.id || m.studentId);
        const activeP1 = await prisma.studentProjectApply.findFirst({
          where: {
            id: { not: app.id },
            priority: 1,
            status: { in: ["pending_member_approval", "pending_faculty_approval"] },
            members: { some: { studentId: { in: studentIds } } },
          },
          include: {
            project: { select: { projectTitle: true } },
            members: { include: { student: { select: { id: true, fullName: true, regNo: true } } } },
          },
        });

        if (activeP1) {
          const conflictStudent = activeP1.members.find((m) => studentIds.includes(m.studentId));
          app.blockingPriority1 = {
            hasActiveP1: true,
            p1ApplicationId: activeP1.id,
            p1ProjectTitle: activeP1.project?.projectTitle || "Priority 1 Project",
            memberName: conflictStudent?.name || conflictStudent?.student?.fullName || "Student",
            memberRegNo: conflictStudent?.regNo || conflictStudent?.student?.regNo || "N/A",
          };
        }
      }
    }

    res.status(200).json({
      project: {
        _id: project.id,
        title: project.projectTitle,
        facultyName: project.facultyName,
        stream: project.stream,
        domain: project.domain,
        description: project.description,
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
          include: { student: { select: { department: true, internshipStatus: true, phoneNumber: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = applications.map((app) => ({
      _id: app.id,
      projectId: app.project?.id,
      projectTitle: app.project?.projectTitle || "Major Project",
      facultyName: app.project?.facultyName || "Faculty Advisor",
      priority: app.priority,
      status: app.status,
      cohortTrack: app.cohortTrack || "regular",
      hasCrossBranch: app.hasCrossBranch || false,
      members: app.members.map((m, idx) => ({
        studentId: m.studentId,
        isLeader: idx === 0,
        name: m.name,
        regNo: m.regNo,
        phoneNumber: m.student?.phoneNumber || "",
        department: m.department || m.student?.department || "Dept of ECE",
        internshipStatus: m.internshipStatus || m.student?.internshipStatus || "regular",
        status: m.status,
      })),
      submittedAt: app.createdAt || app.appliedAt,
    }));

    // Approval deletes the underlying application, so a student on an approved
    // team would otherwise see nothing here. Return their approved teams in the
    // same shape; entries carrying `teamId` are teams, and the ticket flow uses
    // that to file against the team instead of a (now gone) application.
    const teams = await prisma.teamApproved.findMany({
      where: { members: { some: { studentId } } },
      include: {
        project: { select: { id: true, projectTitle: true, facultyName: true, domain: true, description: true } },
        members: {
          ...memberOrder,
          include: { student: { select: { department: true, internshipStatus: true, phoneNumber: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedTeams = teams.map((team) => {
      const teamMembers = team.members.map((m, idx) => ({
        studentId: m.studentId,
        isLeader: idx === 0,
        name: m.name,
        regNo: m.regNo,
        phoneNumber: m.student?.phoneNumber || "",
        department: m.student?.department || "Dept of ECE",
        internshipStatus: m.student?.internshipStatus || "regular",
        status: "approved",
      }));

      // TeamApproved doesn't carry these, so derive them from the roster the
      // same way applyToProject does.
      const leadDept = teamMembers[0]?.department;
      return {
        _id: team.id,
        teamId: team.id,
        projectId: team.project?.id,
        projectTitle: team.project?.projectTitle || "Major Project",
        facultyName: team.facultyName || team.project?.facultyName || "Faculty Advisor",
        priority: 1,
        status: "approved",
        cohortTrack: teamMembers[0]?.internshipStatus || "regular",
        hasCrossBranch: teamMembers.some((m) => m.department !== leadDept),
        members: teamMembers,
        submittedAt: team.approvedAt || team.createdAt,
      };
    });

    res.status(200).json([...formattedTeams, ...formatted]);
  } catch (error) {
    console.error("Get my applications error:", error);
    res.status(500).json({ message: "Server error fetching applications", error: error.message });
  }
};

// Raise a team member modification or project cancellation ticket
export const raiseTicket = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { applicationId, teamId, projectTitle, facultyName, targetMember, changeType, requestedChanges, reason } = req.body;
    const effectiveTargetMember =
      targetMember ||
      (changeType === "cancellation"
        ? {
            studentId,
            name: req.user.fullName,
            regNo: req.user.regNo || "N/A",
            department: req.user.department || "Dept of ECE",
          }
        : null);

    if ((!applicationId && !teamId) || !effectiveTargetMember || !changeType || !reason) {
      return res.status(400).json({ message: "All required ticket fields must be provided." });
    }

    // A ticket hangs off either a pending application or an approved team, and
    // the caller must belong to whichever they named. Without this check an
    // unknown id surfaces as a raw Prisma foreign-key error, and any student
    // could file a ticket against another team's roster.
    let project = null;
    if (teamId) {
      const teamMembership = await prisma.teamMember.findFirst({
        where: { studentId, teamId },
      });
      if (!teamMembership) {
        return res.status(404).json({
          message: "Team not found, or you are not a member of it.",
        });
      }
      const team = await prisma.teamApproved.findUnique({
        where: { id: teamId },
        include: { project: true },
      });
      project = team?.project;
    } else {
      const membership = await prisma.applicationMember.findFirst({
        where: { studentId, applicationId },
      });
      if (!membership) {
        return res.status(404).json({
          message: "Application not found, or you are not a member of it.",
        });
      }
      const app = await prisma.studentProjectApply.findUnique({
        where: { id: applicationId },
        include: { project: true },
      });
      project = app?.project;
    }

    // Resolve student and their academic RDBMS relations (Faculty Advisor & HOD)
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        section: { include: { facultyAdvisor: true } },
        facultyAdvisor: true,
        departmentRel: { include: { hod: true } },
      },
    });

    // Detect if student has an internship background
    const hasInternship =
      student?.internshipStatus === "internship" ||
      (Array.isArray(student?.internships) && student.internships.length > 0) ||
      Boolean(student?.internshipCompany && student.internshipCompany.trim());

    const isCancellation = changeType === "cancellation";
    const projectInchargeId = project?.teacherId || null;
    let facultyAdvisorId = student?.facultyAdvisorId || student?.section?.facultyAdvisorId || null;
    let facultyAdvisorApproval = "not_required";
    if (facultyAdvisorId && facultyAdvisorId !== projectInchargeId) {
      const advUser = await prisma.user.findUnique({
        where: { id: facultyAdvisorId },
        select: { password: true },
      });
      if (advUser && advUser.password && advUser.password.trim().length > 0) {
        facultyAdvisorApproval = "pending";
      } else {
        facultyAdvisorId = null;
      }
    }
    const hodId = student?.departmentRel?.hodId || null;

    const requiresHodApproval = isCancellation ? hasInternship : false;
    const hodApproval = isCancellation
      ? hasInternship
        ? "pending_prior_approvals"
        : "not_required"
      : "not_required";

    const ticketId = "TCK-" + Math.floor(1000 + Math.random() * 9000);

    const timelineMsg = isCancellation
      ? hasInternship
        ? "Project cancellation ticket submitted. Dispatched to Project Incharge and Faculty Advisor for review (HOD approval required upon their sign-off)."
        : "Project cancellation ticket submitted. Dispatched to Project Incharge and Faculty Advisor for review (no HOD approval needed)."
      : "Ticket created and dispatched to Department Coordinator.";

    const newTicket = await prisma.ticket.create({
      data: {
        ticketId,
        applicationId: teamId ? null : applicationId,
        teamId: teamId || null,
        studentId,
        projectTitle: projectTitle || project?.projectTitle || "Major Project",
        facultyName: facultyName || project?.facultyName || "Faculty Guide",
        targetMember: effectiveTargetMember,
        changeType,
        requestedChanges: requestedChanges || undefined,
        reason,
        status: "pending",
        progressStep: 1,
        hasInternship,
        requiresHodApproval,
        projectInchargeId,
        projectInchargeApproval: "pending",
        facultyAdvisorId,
        facultyAdvisorApproval:
          facultyAdvisorId && facultyAdvisorId !== projectInchargeId ? "pending" : "not_required",
        hodId,
        hodApproval,
        timeline: [
          {
            step: "Submitted",
            date: new Date(),
            message: timelineMsg,
          },
        ],
      },
    });
    newTicket._id = newTicket.id;

    // Dispatch notifications for ticket
    if (projectInchargeId) {
      const notifTitle = isCancellation
        ? "Project Cancellation Request"
        : `Change Ticket: ${
            changeType === "name_correction"
              ? "Name Correction"
              : changeType === "replacement"
              ? "Member Swap"
              : "Member Withdrawal"
          }`;
      const notifMsg = isCancellation
        ? `${student?.fullName || "Student"} (${student?.regNo || ""}) has requested to cancel project "${projectTitle || project?.projectTitle}". Please review.`
        : `${student?.fullName || "Student"} (${student?.regNo || ""}) has raised a change ticket for project "${projectTitle || project?.projectTitle}". Reason: ${reason}.`;

      await prisma.notification.create({
        data: {
          userId: projectInchargeId,
          title: notifTitle,
          message: notifMsg,
          type: "warning",
        },
      });
    }

    if (isCancellation && facultyAdvisorId && facultyAdvisorId !== projectInchargeId) {
      await prisma.notification.create({
        data: {
          userId: facultyAdvisorId,
          title: "Advisee Project Cancellation Request",
          message: `Your advisee ${student?.fullName || "Student"} (${student?.regNo || ""}) has requested to cancel project "${projectTitle || project?.projectTitle}". Please review.`,
          type: "warning",
        },
      });
    }

    const successMsg = isCancellation
      ? hasInternship
        ? `Cancellation ticket #${ticketId} submitted. Sent to your Project Incharge and Faculty Advisor; HOD final approval will be required.`
        : `Cancellation ticket #${ticketId} submitted. Sent to your Project Incharge and Faculty Advisor.`
      : `Ticket #${ticketId} submitted successfully! Your departmental coordinator will review the request.`;

    res.status(201).json({
      message: successMsg,
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

    // Once a coordinator has actioned a ticket it is a record of a decision —
    // and for an approved one, of a roster change that already happened. Only
    // an un-actioned request can be withdrawn.
    if (ticket.status === "approved" || ticket.status === "rejected") {
      return res.status(400).json({
        message: `Ticket ${ticket.ticketId} has already been ${ticket.status} by your faculty guide and can no longer be cancelled.`,
      });
    }

    await prisma.ticket.delete({ where: { id: ticket.id } });
    res.status(200).json({ message: "Ticket cancelled successfully." });
  } catch (error) {
    console.error("Cancel ticket error:", error);
    res.status(500).json({ message: "Server error cancelling ticket", error: error.message });
  }
};

// DELETE /api/student/applications/:applicationId — manually close/cancel a pending application
export const cancelApplication = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;
    const { applicationId } = req.params;

    const application = await prisma.studentProjectApply.findUnique({
      where: { id: applicationId },
      include: {
        project: { select: { id: true, projectTitle: true, facultyName: true } },
        members: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    // Must be a member of this application
    const membership = application.members.find((m) => m.studentId === studentId);
    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this application.",
      });
    }

    if (application.status === "approved") {
      return res.status(400).json({
        message:
          "This application has already been approved and allocated to an official team. Please raise a project cancellation ticket instead.",
      });
    }

    // Clean up any pending change tickets for this application
    await prisma.ticket.deleteMany({
      where: { applicationId },
    });

    // Delete members and application
    await prisma.applicationMember.deleteMany({
      where: { applicationId },
    });
    await prisma.studentProjectApply.delete({
      where: { id: applicationId },
    });

    // Notify all other members
    for (const m of application.members) {
      if (m.studentId !== studentId) {
        await prisma.notification.create({
          data: {
            userId: m.studentId,
            title: "Project Application Cancelled",
            message: `The application for project "${application.project?.projectTitle || "Major Project"}" was closed/cancelled by ${req.user.fullName}.`,
            type: "info",
          },
        });
      }
    }

    res.status(200).json({
      message: `Application for "${application.project?.projectTitle || "Major Project"}" was successfully cancelled.`,
    });
  } catch (error) {
    console.error("Cancel application error:", error);
    res.status(500).json({ message: "Server error cancelling application", error: error.message });
  }
};

function withId(obj) {
  obj._id = obj.id;
  return obj;
}
