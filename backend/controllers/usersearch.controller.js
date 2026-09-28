// controllers/usersearch.controller.js
import prisma from "../lib/db.js";

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.json([]);
    }

    const searchTerm = q.trim();
    const unavailableStudentIds = new Set();

    const approvedTeamMembers = await prisma.teamMember.findMany({
      select: { studentId: true },
    });
    approvedTeamMembers.forEach((m) => {
      if (m.studentId) unavailableStudentIds.add(m.studentId);
    });

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
      if (m.studentId) {
        counts[m.studentId] = (counts[m.studentId] || 0) + 1;
      }
    });
    Object.keys(counts).forEach((id) => {
      if (counts[id] >= 2) unavailableStudentIds.add(id);
    });

    const unavailableArr = Array.from(unavailableStudentIds).filter(Boolean);
    const whereClause = {
      role: "student",
      OR: [
        { fullName: { contains: searchTerm } },
        { regNo: { contains: searchTerm } },
      ],
    };

    if (unavailableArr.length > 0) {
      whereClause.id = { notIn: unavailableArr };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
    res.status(500).json({ message: "Unable to search students at this time." });
  }
};
