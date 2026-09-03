import prisma from "../lib/db.js";

export const getStudentInfo = async (req, res) => {
  try {
    const { id } = req.params; // student id

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        regNo: true,
        department: true,
        skills: true,
        resumeUrl: true,
        experience: true,
        description: true,
        researchPast: true,
        cgpa: true,
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student._id = student.id;
    res.json(student);
  } catch (error) {
    console.error("Error fetching student info:", error);
    res.status(500).json({ message: "Server error" });
  }
};
