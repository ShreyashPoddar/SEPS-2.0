// middlewares/auth.middlewares.js
import jwt from "jsonwebtoken";
import prisma from "../lib/db.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    delete user.password;
    // Alias `_id` -> `id` so existing controller/frontend code that expects
    // Mongo-style `_id` keeps working without further changes.
    user._id = user.id;

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Error in protectRoute middleware:", error.message);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized - Your session is invalid or has expired." });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};
