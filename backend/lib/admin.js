// lib/admin.js — single source of truth for coordinator (admin) accounts.
// Override with ADMIN_EMAILS="a@srmist.edu.in,b@srmist.edu.in" in the environment.
const DEFAULT_ADMIN_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
];

// Read lazily: dotenv runs after ESM imports are evaluated.
export const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",") : DEFAULT_ADMIN_EMAILS)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const isAdminUser = (user) =>
  Boolean(
    user?.role === "teacher" && user?.email && getAdminEmails().includes(user.email.trim().toLowerCase())
  );
