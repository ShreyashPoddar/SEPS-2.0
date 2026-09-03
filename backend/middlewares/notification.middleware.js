// middlewares/notification.middleware.js
// NOTE: unused by any route (notification.routes.js uses protectRoute instead)
// but kept and ported in case something else imports it later.
import jwt from "jsonwebtoken";
import prisma from "../lib/db.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    delete user.password;
    user._id = user.id;
    req.user = user;

    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
