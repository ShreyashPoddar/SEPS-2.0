import prisma from "../lib/db.js";
import bcrypt from "bcryptjs";

function generateRandom8Digits() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function main() {
  const email = "brindhak1@srmist.edu.in";
  let user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
      },
    },
  });

  if (!user) {
    console.log(`User ${email} not found. Creating user...`);
    const pin = generateRandom8Digits();
    const hashedPassword = await bcrypt.hash(pin, 10);
    user = await prisma.user.create({
      data: {
        fullName: "Brindha",
        email: email,
        role: "teacher",
        department: "Dept of ECE",
        experience: "Assistant Professor",
        password: hashedPassword,
        isVerified: true,
        isProfileComplete: true,
        internships: [],
        skills: [],
      },
    });
    console.log(`CREATED_USER_SUCCESS`);
    console.log(`EMAIL:${user.email}`);
    console.log(`NAME:${user.fullName}`);
    console.log(`PIN:${pin}`);
    return;
  }

  const pin = generateRandom8Digits();
  const hashedPassword = await bcrypt.hash(pin, 10);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      isVerified: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  console.log(`UPDATE_USER_SUCCESS`);
  console.log(`EMAIL:${updated.email}`);
  console.log(`NAME:${updated.fullName}`);
  console.log(`PIN:${pin}`);
}

main()
  .catch((err) => {
    console.error("ERROR:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
