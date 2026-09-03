import prisma from "../lib/db.js";

// 🔍 Search student by regNo and check if they are already in a team
export const searchStudentByRegNo = async (req, res) => {
  try {
    const { regNo } = req.query;

    if (!regNo) {
      return res.status(400).json({ message: "Register number is required" });
    }

    const student = await prisma.user.findFirst({ where: { regNo, role: "student" } });
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
    delete student.password;
    res.status(200).json({ student });
  } catch (err) {
    console.error("Search student error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
