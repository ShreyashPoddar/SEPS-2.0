// controllers/globalDeadline.controller.js
import prisma from "../lib/db.js";

import { isAdminUser } from "../lib/admin.js";


export const getGlobalDeadline = async (req, res) => {
  try {
    const deadlineDoc = await prisma.globalDeadline.findFirst();
    if (!deadlineDoc) {
      return res.status(404).json({ message: "No global deadline set." });
    }
    res.status(200).json({ deadline: deadlineDoc.deadline });
  } catch (error) {
    res.status(500).json({ message: "Error fetching global deadline.", error: error.message });
  }
};

export const setGlobalDeadline = async (req, res) => {
  try {
    const isAuthorized = isAdminUser(req.user);

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized. Admin faculty access required." });
    }

    const { deadline } = req.body;
    if (!deadline) {
      return res.status(400).json({ message: "Deadline is required." });
    }

    // If input is YYYY-MM-DD, set deadline to 23:59:59 end-of-day IST (the institute timezone)
    let parsedDate;
    if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
      parsedDate = new Date(`${deadline.trim()}T23:59:59.999+05:30`);
    } else {
      parsedDate = new Date(deadline);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format provided." });
    }

    let deadlineDoc = await prisma.globalDeadline.findFirst();
    if (deadlineDoc) {
      deadlineDoc = await prisma.globalDeadline.update({
        where: { id: deadlineDoc.id },
        data: { deadline: parsedDate },
      });
    } else {
      deadlineDoc = await prisma.globalDeadline.create({
        data: { deadline: parsedDate },
      });
    }

    res.status(200).json({ message: "Global deadline updated successfully.", deadline: deadlineDoc.deadline });
  } catch (error) {
    res.status(500).json({ message: "Error setting global deadline.", error: error.message });
  }
};
