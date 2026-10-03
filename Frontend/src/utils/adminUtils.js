// Frontend/src/utils/adminUtils.js
// UI-only gate for coordinator links. The backend is the real authority
// (lib/admin.js) and also returns `isAdmin` on the user object.
const ADMIN_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
];

export const isAdminEmail = (email) =>
  ADMIN_EMAILS.includes((email || "").trim().toLowerCase());

export const isAdminAccount = (user) =>
  Boolean(user && user.role === "teacher" && (user.isAdmin ?? isAdminEmail(user.email)));
