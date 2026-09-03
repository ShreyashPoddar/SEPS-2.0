import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import csv from "csv-parser";
import prisma from "./lib/db.js";

dotenv.config();

const seedTeachers = async () => {
  try {
    const results = [];
    // NOTE: adjust this path to wherever "faculty email id.csv" lives on your machine.
    const filePath = path.resolve("./faculty email id.csv");

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(
          csv({
            skipLines: 5,
            mapHeaders: ({ header }) => {
              if (header === "Name of the Staff") return "fullName";
              if (header === "userID@srmist.edu.in") return "userId";
              return header;
            },
          })
        )
        .on("data", (data) => results.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    if (results.length === 0) {
      console.log("No valid faculty data found in faculty-data.csv. Exiting.");
      return;
    }

    console.log(`Found ${results.length} faculty records to process...`);

    for (const faculty of results) {
      const fullName = faculty.fullName?.trim();
      const email = faculty.userId ? `${faculty.userId.trim()}@srmist.edu.in` : null;

      if (!fullName || !email) {
        console.log(`🟡 Skipping invalid record:`, faculty);
        continue;
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        console.log(`🟡 Skipping: User with email ${email} already exists.`);
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("password123", salt);

      await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          role: "teacher",
          isVerified: true,
        },
      });
      console.log(`🟢 Created teacher: ${fullName} (${email})`);
    }

    console.log("\n✅ Seeding complete!");
  } catch (error) {
    console.error(`❌ Error during seeding: ${error.message}`);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 Disconnected");
    process.exit();
  }
};

seedTeachers();
