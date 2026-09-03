import prisma from "../lib/db.js";

export const checkProjectCapacity = async (req, res, next) => {
  try {
    const { projectId } = req.body;

    const count = await prisma.studentProjectApply.count({ where: { projectId } });

    if (count >= 3) {
      return res.status(400).json({ message: "This project already has 3 students." });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
