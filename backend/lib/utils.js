// lib/utils.js
import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not set in environment variables");
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    // Browsers reject SameSite=None cookies that aren't also Secure, which
    // silently breaks login over plain http://localhost. Use Lax + non-secure
    // for local dev, and None + secure once actually deployed over HTTPS.
    sameSite: isProd ? "None" : "Lax",
    secure: isProd,
    path: "/",
  });

  return token;
};
