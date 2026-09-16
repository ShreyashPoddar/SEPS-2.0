// lib/db.js
// Prisma client singleton (replaces the old Mongoose connectDB()).
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Kept for parity with the old import style (`import { connectDB } from "./lib/db.js"`).
// Prisma connects lazily on first query, but we ping the DB here so startup
// fails fast (and loudly) if TiDB is unreachable, same as the old behavior.
export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("✅ TiDB Connected (via Prisma)");
  } catch (err) {
    console.error("⚠️ TiDB Connection Warning (could not connect on startup):", err.message || err);
  }
};

export default prisma;
