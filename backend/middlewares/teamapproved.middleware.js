// middlewares/teamapproved.middleware.js
import prisma from "../lib/db.js";

export const validateApplicationExists = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const application = await prisma.studentProjectApply.findUnique({ where: { id: applicationId } });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    req.application = application;
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
