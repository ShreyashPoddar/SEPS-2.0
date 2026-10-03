import prisma from "../lib/db.js";

// 🔍 Search student by regNo and check if they are already in a team
export const searchStudentByRegNo = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. Only teachers can look up students." });
    }

    const regNo = typeof req.query.regNo === "string" ? req.query.regNo.trim() : "";

    if (!regNo) {
      return res.status(400).json({ message: "Register number is required" });
    }

    // Never return the whole row: it carries password hash and reset/verification tokens.
    const student = await prisma.user.findFirst({
      where: { regNo: { in: [regNo, regNo.toUpperCase()] }, role: "student" },
      select: {
        id: true,
        fullName: true,
        email: true,
        regNo: true,
        department: true,
        internshipStatus: true,
        cgpa: true,
      },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const alreadyInTeam = await prisma.teamMember.findFirst({
      where: { studentId: student.id },
    });
    const hasPendingOrApprovedApplication = await prisma.applicationMember.findFirst({
      where: {
        studentId: student.id,
        application: {
          status: { in: ["pending_member_approval", "pending_faculty_approval", "approved"] },
        },
      },
    });

    if (alreadyInTeam || hasPendingOrApprovedApplication) {
      return res.status(400).json({
        message: "Student is already part of another team or has a pending/approved application",
      });
    }

    student._id = student.id;
    res.status(200).json({ student });
  } catch (err) {
    console.error("Search student error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
