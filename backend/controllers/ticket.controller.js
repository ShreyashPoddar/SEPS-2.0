// controllers/ticket.controller.js
// Faculty-side review of member-change tickets. Students raise tickets via
// studentprojectapply.controller.js; this is the half that acts on them and
// actually mutates the roster.
import prisma from "../lib/db.js";

// Thrown when a ticket cannot be applied for a reason the coordinator should
// see (stale roster, clashing reg no, replacement already placed elsewhere).
class TicketError extends Error {}

const TICKET_INCLUDE = {
  application: { include: { project: true } },
  team: { include: { project: true } },
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
      regNo: true,
      department: true,
      internshipStatus: true,
      internshipCompany: true,
      sectionName: true,
    },
  },
  projectIncharge: { select: { id: true, fullName: true, email: true } },
  facultyAdvisor: { select: { id: true, fullName: true, email: true } },
  hod: { select: { id: true, fullName: true, email: true } },
};

const withId = (t) => {
  t._id = t.id;
  return t;
};

// A ticket hangs off either a pending application or an approved team; both
// lead back to a project, and that project's teacher is the reviewer.
const projectOf = (ticket) => ticket.team?.project || ticket.application?.project || null;

const rosterOf = async (ticket) => {
  if (ticket.teamId) {
    return prisma.teamMember.findMany({ where: { teamId: ticket.teamId } });
  }
  if (ticket.applicationId) {
    return prisma.applicationMember.findMany({ where: { applicationId: ticket.applicationId } });
  }
  return [];
};

const appendTimeline = (ticket, step, message) => {
  const existing = Array.isArray(ticket.timeline) ? ticket.timeline : [];
  return [...existing, { step, date: new Date(), message }];
};

const notifyAll = async (studentIds, title, message, type) => {
  const unique = [...new Set(studentIds)].filter(Boolean);
  for (const userId of unique) {
    await prisma.notification.create({ data: { userId, title, message, type } });
  }
};

// --- roster mutation -------------------------------------------------------

const correctName = async (ticket, row, changes) => {
  const name = changes.correctedName?.trim() || row.name;
  const regNo = changes.correctedRegNo?.trim() || row.regNo;

  if (regNo !== row.regNo) {
    const clash = await prisma.user.findFirst({
      where: { regNo, NOT: { id: row.studentId } },
    });
    if (clash) {
      throw new TicketError(`Register number ${regNo} already belongs to another student.`);
    }
  }

  // Update the student record too, otherwise the correction is cosmetic and the
  // wrong details reappear the next time a roster is built from User.
  await prisma.user.update({
    where: { id: row.studentId },
    data: { fullName: name, regNo },
  });

  const data = { name, regNo };
  if (ticket.teamId) {
    await prisma.teamMember.update({ where: { id: row.id }, data });
  } else {
    await prisma.applicationMember.update({ where: { id: row.id }, data });
  }
  return `Roster corrected to ${name} (${regNo}).`;
};

const replaceMember = async (ticket, row, changes, roster) => {
  const requested = changes.replacementStudent;
  if (!requested?._id) {
    throw new TicketError("This replacement ticket has no replacement student attached.");
  }

  const replacement = await prisma.user.findUnique({ where: { id: requested._id } });
  if (!replacement) {
    throw new TicketError("The requested replacement student no longer exists.");
  }
  if (roster.some((m) => m.studentId === replacement.id)) {
    throw new TicketError(`${replacement.fullName} is already on this team.`);
  }

  const placed = await prisma.teamMember.findFirst({ where: { studentId: replacement.id } });
  if (placed) {
    throw new TicketError(`${replacement.fullName} is already part of another approved team.`);
  }

  // Same cohort rule the application flow enforces.
  const others = roster.filter((m) => m.studentId !== row.studentId);
  const cohortRef = await prisma.user.findUnique({
    where: { id: others[0]?.studentId || row.studentId },
    select: { internshipStatus: true },
  });
  const teamCohort = cohortRef?.internshipStatus || "regular";
  const theirCohort = replacement.internshipStatus || "regular";
  if (theirCohort !== teamCohort) {
    throw new TicketError(
      `Cohort mismatch: ${replacement.fullName} is on the ${theirCohort === "internship" ? "Corporate Internship" : "Regular"} track but the team is on the ${teamCohort === "internship" ? "Corporate Internship" : "Regular"} track.`
    );
  }

  if (ticket.teamId) {
    await prisma.teamMember.delete({ where: { id: row.id } });
    await prisma.teamMember.create({
      data: {
        teamId: ticket.teamId,
        studentId: replacement.id,
        name: replacement.fullName,
        regNo: replacement.regNo,
      },
    });
  } else {
    await prisma.applicationMember.delete({ where: { id: row.id } });
    await prisma.applicationMember.create({
      data: {
        applicationId: ticket.applicationId,
        studentId: replacement.id,
        name: replacement.fullName,
        regNo: replacement.regNo,
        department: replacement.department || "Dept of ECE",
        internshipStatus: theirCohort,
        status: "approved",
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: replacement.id,
      title: "Added to Project Team",
      message: `You have been added to "${ticket.projectTitle}" as a replacement member, approved by ${ticket.facultyName}.`,
      type: "success",
    },
  });

  return `${row.name} replaced by ${replacement.fullName} (${replacement.regNo}).`;
};

const withdrawMember = async (ticket, row, roster) => {
  if (roster.length <= 1) {
    throw new TicketError("Cannot withdraw the last remaining member of a team. Raise a project cancellation ticket instead.");
  }
  if (ticket.teamId) {
    await prisma.teamMember.delete({ where: { id: row.id } });
  } else {
    await prisma.applicationMember.delete({ where: { id: row.id } });
  }
  await prisma.notification.create({
    data: {
      userId: row.studentId,
      title: "Removed from Team",
      message: `Your withdrawal from "${ticket.projectTitle}" was approved by ${ticket.facultyName}.`,
      type: "warning",
    },
  });
  return `${row.name} withdrawn from the roster. The team now has ${roster.length - 1} member(s).`;
};

// Cancel project membership / team allocation
const executeCancellation = async (ticket) => {
  const target = ticket.targetMember || {};
  const studentId = target.studentId || ticket.studentId;

  if (ticket.teamId) {
    const members = await prisma.teamMember.findMany({ where: { teamId: ticket.teamId } });
    if (members.length <= 1 || members.every((m) => m.studentId === studentId)) {
      // Last or sole member: detach ticket first so it survives team deletion
      await prisma.ticket.updateMany({
        where: { teamId: ticket.teamId },
        data: { teamId: null },
      });
      await prisma.teamMember.deleteMany({ where: { teamId: ticket.teamId } });
      await prisma.teamApproved.delete({ where: { id: ticket.teamId } });
      return `Project team was disbanded. Student ${target.name || "member"} has officially left the project.`;
    } else {
      // Multiple members: remove this student
      const memberRow = members.find((m) => m.studentId === studentId);
      if (memberRow) {
        await prisma.teamMember.delete({ where: { id: memberRow.id } });
      }
      return `${target.name || "Student"} has officially left the project team. The team now has ${members.length - 1} member(s).`;
    }
  }

  if (ticket.applicationId) {
    const members = await prisma.applicationMember.findMany({ where: { applicationId: ticket.applicationId } });
    if (members.length <= 1 || members.every((m) => m.studentId === studentId)) {
      // Last or sole applicant: detach ticket first so it survives application deletion
      await prisma.ticket.updateMany({
        where: { applicationId: ticket.applicationId },
        data: { applicationId: null },
      });
      await prisma.applicationMember.deleteMany({ where: { applicationId: ticket.applicationId } });
      await prisma.studentProjectApply.delete({ where: { id: ticket.applicationId } });
      return `Project application was cancelled. Student ${target.name || "member"} has officially left the project.`;
    } else {
      const memberRow = members.find((m) => m.studentId === studentId);
      if (memberRow) {
        await prisma.applicationMember.delete({ where: { id: memberRow.id } });
      }
      return `${target.name || "Student"} was removed from the application roster.`;
    }
  }

  return `Student has officially left the project.`;
};

const applyRosterChange = async (ticket) => {
  if (ticket.changeType === "cancellation") return executeCancellation(ticket);

  const target = ticket.targetMember || {};
  const changes = ticket.requestedChanges || {};
  const roster = await rosterOf(ticket);

  const row = roster.find((m) => m.studentId === target.studentId);
  if (!row) {
    throw new TicketError("The member named on this ticket is no longer on the roster.");
  }

  if (ticket.changeType === "name_correction") return correctName(ticket, row, changes);
  if (ticket.changeType === "replacement") return replaceMember(ticket, row, changes, roster);
  if (ticket.changeType === "withdrawal") return withdrawMember(ticket, row, roster);
  throw new TicketError(`Unsupported change type "${ticket.changeType}".`);
};

// --- endpoints -------------------------------------------------------------

// GET /api/tickets — change tickets visible to this teacher (as Project Incharge, Faculty Advisor, or HOD)
export const getFacultyTickets = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. Only teachers can review change tickets." });
    }

    const teacherProjects = await prisma.project.findMany({
      where: {
        OR: [
          { teacherId: req.user._id },
          { facultyName: req.user.fullName },
        ],
      },
      select: { id: true, projectTitle: true },
    });
    const projectTitles = teacherProjects.map((p) => p.projectTitle).filter(Boolean);

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { team: { project: { teacherId: req.user._id } } },
          { application: { project: { teacherId: req.user._id } } },
          { projectInchargeId: req.user._id },
          { facultyAdvisorId: req.user._id },
          { facultyName: req.user.fullName },
          ...(projectTitles.length > 0 ? [{ projectTitle: { in: projectTitles } }] : []),
          // HOD sees tickets escalated to them (pending) or completed/rejected where they were involved
          { hodId: req.user._id, hodApproval: { in: ["pending", "approved", "rejected"] } },
        ],
      },
      include: TICKET_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    tickets.forEach((t) => {
      withId(t);
      const roles = [];
      if (
        t.projectInchargeId === req.user._id ||
        t.team?.project?.teacherId === req.user._id ||
        t.application?.project?.teacherId === req.user._id ||
        t.facultyName === req.user.fullName ||
        projectTitles.includes(t.projectTitle)
      ) {
        roles.push("project_incharge");
      }
      if (t.facultyAdvisorId === req.user._id) {
        roles.push("faculty_advisor");
      }
      if (t.hodId === req.user._id && t.hodApproval !== "not_required") {
        roles.push("hod");
      }
      t.userRoles = roles;
    });

    res.status(200).json(tickets);
  } catch (error) {
    console.error("Get faculty tickets error:", error);
    res.status(500).json({ message: "Server error fetching tickets", error: error.message });
  }
};

// PUT /api/tickets/:ticketId — move a ticket along: review | approve | reject
export const actOnTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { action, remarks } = req.body;

    if (!["review", "approve", "reject"].includes(action)) {
      return res.status(400).json({ message: 'Action must be one of "review", "approve" or "reject".' });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { OR: [{ id: ticketId }, { ticketId }] },
      include: TICKET_INCLUDE,
    });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const project = projectOf(ticket);
    const teacherProjects = await prisma.project.findMany({
      where: {
        OR: [{ teacherId: req.user._id }, { facultyName: req.user.fullName }],
      },
      select: { projectTitle: true },
    });
    const projectTitles = teacherProjects.map((p) => p.projectTitle).filter(Boolean);

    const isProjectIncharge =
      (ticket.projectInchargeId && ticket.projectInchargeId === req.user._id) ||
      (project && project.teacherId === req.user._id) ||
      (ticket.facultyName && ticket.facultyName === req.user.fullName) ||
      projectTitles.includes(ticket.projectTitle);
    const isFacultyAdvisor = ticket.facultyAdvisorId && ticket.facultyAdvisorId === req.user._id;
    const isHod = ticket.hodId && ticket.hodId === req.user._id;

    if (req.user.role !== "teacher" || (!isProjectIncharge && !isFacultyAdvisor && !isHod)) {
      return res.status(403).json({
        message:
          "Access denied. You are not authorized to act on this ticket (must be Project Incharge, Faculty Advisor, or Department HOD).",
      });
    }

    if (ticket.status === "approved" || ticket.status === "rejected") {
      return res.status(400).json({ message: `This ticket has already been ${ticket.status}.` });
    }

    const roleTitles = [];
    if (isProjectIncharge) roleTitles.push("Project Incharge");
    if (isFacultyAdvisor) roleTitles.push("Faculty Advisor");
    if (isHod) roleTitles.push("HOD");
    const roleTitle = roleTitles.join(" & ");

    const audience = (await rosterOf(ticket)).map((m) => m.studentId).concat(ticket.studentId);

    // 1. Action: REVIEW
    if (action === "review") {
      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "in_review",
          progressStep: 2,
          coordinatorRemarks: remarks || ticket.coordinatorRemarks,
          timeline: appendTimeline(
            ticket,
            "Under Review",
            remarks || `Under review by ${roleTitle} (${req.user.fullName}).`
          ),
        },
      });
      await notifyAll(
        audience,
        "Change Ticket Under Review",
        `Ticket ${ticket.ticketId} for "${ticket.projectTitle}" is now under review by ${roleTitle} (${req.user.fullName}).`,
        "info"
      );
      return res.status(200).json({
        message: `Ticket ${ticket.ticketId} marked as under review.`,
        ticket: withId(updated),
      });
    }

    // 2. Action: REJECT
    if (action === "reject") {
      const approvalUpdates = {};
      if (isProjectIncharge) approvalUpdates.projectInchargeApproval = "rejected";
      if (isFacultyAdvisor) approvalUpdates.facultyAdvisorApproval = "rejected";
      if (isHod) approvalUpdates.hodApproval = "rejected";

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "rejected",
          ...approvalUpdates,
          coordinatorRemarks: remarks || `Rejected by ${roleTitle} (${req.user.fullName}).`,
          timeline: appendTimeline(ticket, "Rejected", remarks || `Rejected by ${roleTitle} (${req.user.fullName}).`),
        },
      });
      await notifyAll(
        audience,
        "Ticket Request Rejected",
        `Ticket ${ticket.ticketId} for "${ticket.projectTitle}" was rejected by ${roleTitle} (${req.user.fullName})${remarks ? `: ${remarks}` : "."}`,
        "error"
      );
      return res.status(200).json({ message: `Ticket ${ticket.ticketId} rejected.`, ticket: withId(updated) });
    }

    // 3. Action: APPROVE
    // Handle multi-stage Project Cancellation tickets
    if (ticket.changeType === "cancellation") {
      let newInchargeApproval = ticket.projectInchargeApproval;
      let newAdvisorApproval = ticket.facultyAdvisorApproval;
      let newHodApproval = ticket.hodApproval;

      if (isProjectIncharge) newInchargeApproval = "approved";
      if (isFacultyAdvisor) newAdvisorApproval = "approved";
      if (isHod) {
        if (
          ticket.requiresHodApproval &&
          (ticket.projectInchargeApproval !== "approved" || ticket.facultyAdvisorApproval !== "approved")
        ) {
          return res.status(400).json({
            message: "HOD approval cannot be processed until both Project Incharge and Faculty Advisor have approved.",
          });
        }
        newHodApproval = "approved";
      }

      const advisorRequired = Boolean(
        ticket.facultyAdvisorId &&
        ticket.facultyAdvisorId !== (ticket.projectInchargeId || project?.teacherId) &&
        ticket.facultyAdvisorApproval !== "not_required"
      );
      if (!advisorRequired && newAdvisorApproval === "pending") {
        newAdvisorApproval = "not_required";
      }
      const bothInitialApproved =
        newInchargeApproval === "approved" &&
        (!advisorRequired || newAdvisorApproval === "approved");

      // Case A: Student has Internship Background -> Requires HOD Approval
      if (ticket.requiresHodApproval) {
        if (newHodApproval === "approved") {
          // All required approvals (Incharge, Advisor, HOD) are complete!
          let summary;
          try {
            summary = await executeCancellation(ticket);
          } catch (err) {
            if (err instanceof TicketError) return res.status(400).json({ message: err.message });
            throw err;
          }

          const updated = await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "approved",
              progressStep: 4,
              projectInchargeApproval: newInchargeApproval,
              facultyAdvisorApproval: newAdvisorApproval,
              hodApproval: "approved",
              coordinatorRemarks: remarks || summary,
              timeline: appendTimeline(
                ticket,
                "HOD Approved & Cancelled",
                `Final approval granted by HOD (${req.user.fullName}). ${summary}`
              ),
            },
          });

          await notifyAll(
            audience,
            "Project Cancellation Approved by HOD",
            `Project cancellation for "${ticket.projectTitle}" was approved by Department HOD (${req.user.fullName}). ${summary}`,
            "success"
          );

          return res.status(200).json({
            message: `Project cancellation approved by HOD. ${summary}`,
            ticket: withId(updated),
          });
        } else if (bothInitialApproved) {
          // Incharge and Advisor both approved -> escalate to HOD!
          newHodApproval = "pending";
          const updated = await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "in_review",
              progressStep: 3,
              projectInchargeApproval: newInchargeApproval,
              facultyAdvisorApproval: newAdvisorApproval,
              hodApproval: "pending",
              coordinatorRemarks:
                remarks ||
                "Approved by Project Incharge and Faculty Advisor. Escalated to Department HOD for final sign-off.",
              timeline: appendTimeline(
                ticket,
                "Escalated to HOD",
                `Approved by ${roleTitle} (${req.user.fullName}). Both Project Incharge and Faculty Advisor have approved. Forwarded to Department HOD for final approval.`
              ),
            },
          });

          // Send notification to HOD
          if (ticket.hodId) {
            await prisma.notification.create({
              data: {
                userId: ticket.hodId,
                title: "Project Cancellation Ticket Pending HOD Approval",
                message: `Student ${ticket.student?.fullName || ticket.targetMember?.name} (${ticket.student?.regNo || ticket.targetMember?.regNo}) has requested project cancellation for "${ticket.projectTitle}". Both the Project Incharge and Faculty Advisor have approved. As the student has an internship background, your approval as HOD is required for them to leave the project.`,
                type: "warning",
              },
            });
          }

          // Notify student
          await notifyAll(
            [ticket.studentId],
            "Cancellation Escalated to HOD",
            `Your project cancellation request has been approved by your Project Incharge and Faculty Advisor. It is now awaiting final sign-off from your Department HOD.`,
            "info"
          );

          return res.status(200).json({
            message: `Approved by ${roleTitle}. Ticket escalated to Department HOD for final sign-off.`,
            ticket: withId(updated),
          });
        } else {
          // Only one of Incharge or Advisor has approved so far
          const remaining = newInchargeApproval !== "approved" ? "Project Incharge" : "Faculty Advisor";
          const updated = await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "in_review",
              progressStep: 2,
              projectInchargeApproval: newInchargeApproval,
              facultyAdvisorApproval: newAdvisorApproval,
              coordinatorRemarks: remarks || `Approved by ${roleTitle}. Awaiting ${remaining} approval.`,
              timeline: appendTimeline(
                ticket,
                `Approved by ${roleTitle}`,
                `Approved by ${roleTitle} (${req.user.fullName}). Awaiting approval from ${remaining}.`
              ),
            },
          });

          await notifyAll(
            [ticket.studentId],
            "Partial Approval Granted",
            `Your project cancellation request has been approved by ${roleTitle} (${req.user.fullName}). Awaiting approval from ${remaining}.`,
            "info"
          );

          return res.status(200).json({
            message: `Approved by ${roleTitle}. Awaiting approval from ${remaining}.`,
            ticket: withId(updated),
          });
        }
      } else {
        // Case B: Student has NO Internship Background -> NO HOD approval needed
        if (bothInitialApproved) {
          let summary;
          try {
            summary = await executeCancellation(ticket);
          } catch (err) {
            if (err instanceof TicketError) return res.status(400).json({ message: err.message });
            throw err;
          }

          const updated = await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "approved",
              progressStep: 4,
              projectInchargeApproval: "approved",
              facultyAdvisorApproval: "approved",
              hodApproval: "not_required",
              coordinatorRemarks: remarks || summary,
              timeline: appendTimeline(
                ticket,
                "Approved & Cancelled",
                `Approved by Project Incharge and Faculty Advisor (no HOD approval required). ${summary}`
              ),
            },
          });

          await notifyAll(
            audience,
            "Project Cancellation Approved",
            `Your project cancellation for "${ticket.projectTitle}" was approved by your Project Incharge and Faculty Advisor. ${summary}`,
            "success"
          );

          return res.status(200).json({
            message: `Project cancellation approved. ${summary}`,
            ticket: withId(updated),
          });
        } else {
          // Only one approved so far
          const remaining = newInchargeApproval !== "approved" ? "Project Incharge" : "Faculty Advisor";
          const updated = await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "in_review",
              progressStep: 2,
              projectInchargeApproval: newInchargeApproval,
              facultyAdvisorApproval: newAdvisorApproval,
              coordinatorRemarks: remarks || `Approved by ${roleTitle}. Awaiting ${remaining} approval.`,
              timeline: appendTimeline(
                ticket,
                `Approved by ${roleTitle}`,
                `Approved by ${roleTitle} (${req.user.fullName}). Awaiting approval from ${remaining}.`
              ),
            },
          });

          await notifyAll(
            [ticket.studentId],
            "Partial Approval Granted",
            `Your project cancellation request has been approved by ${roleTitle} (${req.user.fullName}). Awaiting approval from ${remaining}.`,
            "info"
          );

          return res.status(200).json({
            message: `Approved by ${roleTitle}. Awaiting approval from ${remaining}.`,
            ticket: withId(updated),
          });
        }
      }
    }

    // For standard non-cancellation tickets (name_correction, replacement, withdrawal)
    if (!isProjectIncharge) {
      return res.status(403).json({
        message: "Access denied. Only the Project Incharge can approve roster modification tickets.",
      });
    }

    let summary;
    try {
      summary = await applyRosterChange(ticket);
    } catch (err) {
      if (err instanceof TicketError) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "approved",
        progressStep: 4,
        coordinatorRemarks: remarks || summary,
        timeline: appendTimeline(ticket, "Roster Updated", summary),
      },
    });

    await notifyAll(
      audience,
      "Change Ticket Approved",
      `Ticket ${ticket.ticketId} for "${ticket.projectTitle}" was approved. ${summary}`,
      "success"
    );

    res.status(200).json({
      message: `Ticket ${ticket.ticketId} approved. ${summary}`,
      ticket: withId(updated),
    });
  } catch (error) {
    console.error("Act on ticket error:", error);
    res.status(500).json({ message: "Server error updating ticket", error: error.message });
  }
};
