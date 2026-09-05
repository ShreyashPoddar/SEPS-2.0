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
  student: { select: { id: true, fullName: true, email: true, regNo: true } },
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
    throw new TicketError("Cannot withdraw the last remaining member of a team.");
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

const applyRosterChange = async (ticket) => {
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

// GET /api/tickets — every ticket raised against this teacher's projects
export const getFacultyTickets = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. Only teachers can review change tickets." });
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { team: { project: { teacherId: req.user._id } } },
          { application: { project: { teacherId: req.user._id } } },
        ],
      },
      include: TICKET_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    tickets.forEach(withId);
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
    if (req.user.role !== "teacher" || !project || project.teacherId !== req.user._id) {
      return res.status(403).json({
        message: "Access denied. You can only review tickets raised against your own projects.",
      });
    }

    if (ticket.status === "approved" || ticket.status === "rejected") {
      return res.status(400).json({ message: `This ticket has already been ${ticket.status}.` });
    }

    const audience = (await rosterOf(ticket)).map((m) => m.studentId).concat(ticket.studentId);

    if (action === "review") {
      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "in_review",
          progressStep: 2,
          coordinatorRemarks: remarks || ticket.coordinatorRemarks,
          timeline: appendTimeline(ticket, "Faculty Review", remarks || "Under review by the faculty guide."),
        },
      });
      await notifyAll(audience, "Change Ticket Under Review",
        `Ticket ${ticket.ticketId} for "${ticket.projectTitle}" is now under review by ${project.facultyName}.`, "info");
      return res.status(200).json({ message: `Ticket ${ticket.ticketId} marked as under review.`, ticket: withId(updated) });
    }

    if (action === "reject") {
      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "rejected",
          coordinatorRemarks: remarks || "Rejected by the faculty guide.",
          timeline: appendTimeline(ticket, "Rejected", remarks || "Rejected by the faculty guide."),
        },
      });
      await notifyAll(audience, "Change Ticket Rejected",
        `Ticket ${ticket.ticketId} for "${ticket.projectTitle}" was rejected${remarks ? `: ${remarks}` : "."}`, "error");
      return res.status(200).json({ message: `Ticket ${ticket.ticketId} rejected.`, ticket: withId(updated) });
    }

    // approve — mutate the roster first; only mark approved if that succeeded.
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

    await notifyAll(audience, "Change Ticket Approved",
      `Ticket ${ticket.ticketId} for "${ticket.projectTitle}" was approved. ${summary}`, "success");

    res.status(200).json({
      message: `Ticket ${ticket.ticketId} approved. ${summary}`,
      ticket: withId(updated),
    });
  } catch (error) {
    console.error("Act on ticket error:", error);
    res.status(500).json({ message: "Server error updating ticket", error: error.message });
  }
};
