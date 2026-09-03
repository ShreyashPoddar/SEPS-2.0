// controllers/usersearch.controller.js
import prisma from "../lib/db.js";

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Query parameter 'q' is required" });
    }

    const unavailableStudentIds = new Set();

    const approvedTeamMembers = await prisma.teamMember.findMany({
      select: { studentId: true },
    });
    approvedTeamMembers.forEach((m) => unavailableStudentIds.add(m.studentId));

    const activeMembers = await prisma.applicationMember.findMany({
      where: {
        application: {
          status: {
            in: ["pending_member_approval", "pending_faculty_approval", "approved"],
          },
        },
      },
      select: { studentId: true },
    });
    const counts = {};
    activeMembers.forEach((m) => {
      counts[m.studentId] = (counts[m.studentId] || 0) + 1;
    });
    Object.keys(counts).forEach((id) => {
      if (counts[id] >= 2) unavailableStudentIds.add(id);
    });

    const users = await prisma.user.findMany({
      where: {
        role: "student",
        id: { notIn: Array.from(unavailableStudentIds) },
        OR: [
          { fullName: { contains: q } },
          { regNo: { contains: q } },
        ],
      },
      select: {
        id: true,
        regNo: true,
        fullName: true,
        email: true,
        department: true,
        internshipStatus: true,
        internshipCompany: true,
        internshipDuration: true,
        internships: true,
        linkedinUrl: true,
        githubUrl: true,
        cgpa: true,
        skills: true,
      },
      take: 10,
    });
    users.forEach((u) => (u._id = u.id));

    res.json(users);
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
