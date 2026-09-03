import { generateToken } from "../lib/utils.js";
import prisma from "../lib/db.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail, sendVerificationEmail, sendResetEmail } from "../lib/mailer.js";
import crypto from "crypto";

export const signup = async (req, res) => {
  const {
    fullName,
    email,
    password,
    role,
    regNo,
    department,
    internshipStatus,
    internshipCompany,
    internshipDuration,
    internships,
    linkedinUrl,
    githubUrl,
    cgpa,
    skills,
    experience,
    description,
    researchPast,
  } = req.body;

  try {
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!["teacher", "student"].includes(role.toLowerCase())) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (role.toLowerCase() === "student" && !regNo) {
      return res.status(400).json({ message: "Registration number is required for students." });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedRegNo = regNo ? regNo.toUpperCase() : undefined;

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (role.toLowerCase() === "student") {
      const existingRegNo = await prisma.user.findUnique({ where: { regNo: normalizedRegNo } });
      if (existingRegNo) {
        return res.status(400).json({ message: "Registration number already exists." });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        regNo: role.toLowerCase() === "student" ? normalizedRegNo : undefined,
        department: department || "Dept of ECE",
        internshipStatus: internshipStatus || "regular",
        internshipCompany: internshipCompany || "",
        internshipDuration: internshipDuration || "",
        internships: internships || [],
        linkedinUrl: linkedinUrl || "",
        githubUrl: githubUrl || "",
        cgpa: cgpa || 0,
        skills: skills || [],
        password: hashedPassword,
        role: role.toLowerCase(),
        experience,
        description,
        researchPast,
        verificationToken: hashedToken,
        tokenExpires,
      },
    });

    try {
      //await sendVerificationEmail(email, fullName, rawToken);
      //await sendWelcomeEmail(email, fullName);

      res.status(201).json({
        _id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        message: "Account created. Please check your email to verify your account.",
      });
    } catch (emailError) {
      console.error("📧 Email sending failed after user creation:", emailError.message);
      res.status(201).json({
        message: "Account created, but failed to send verification email. Please try resending.",
        user: {
          _id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
        },
      });
    }
  } catch (error) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email, identifier, regNo } = req.body;
  const loginId = (identifier || email || regNo || "").trim();

  if (!loginId) return res.status(400).json({ message: "Email or Register Number is required" });

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginId.toLowerCase() },
          { regNo: loginId.toUpperCase() },
          { regNo: loginId },
        ],
      },
    });
    if (!user) {
      return res.status(200).json({ message: "If a user with that identifier exists, a reset link has been sent." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await sendResetEmail(user.email, user.fullName, rawToken);
    res.status(200).json({ message: "If a user with that identifier exists, a reset link has been sent." });
  } catch (err) {
    console.error("❌ Error in forgotPassword controller:", err.message);
    res.status(500).json({ message: "An error occurred while trying to send the reset email. Please try again later." });
  }
};

export const login = async (req, res) => {
  const { email, identifier, regNo, password } = req.body;
  const loginId = (identifier || email || regNo || "").trim();

  if (!loginId || !password) {
    return res.status(400).json({ message: "Email / Register Number and Password are required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginId.toLowerCase() },
          { regNo: loginId.toUpperCase() },
          { regNo: loginId },
        ],
      },
    });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before logging in" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

    generateToken(user.id, res);

    res.status(200).json({
      _id: user.id,
      fullName: user.fullName,
      email: user.email,
      regNo: user.regNo,
      role: user.role,
      department: user.department,
      internshipStatus: user.internshipStatus,
      profilePic: user.profilePic || null,
    });
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      profilePic,
      department,
      internshipStatus,
      internshipCompany,
      internshipDuration,
      internships,
      skills,
      resumeUrl,
      linkedinUrl,
      githubUrl,
      experience,
      description,
      researchPast,
      cgpa,
    } = req.body;

    const userId = req.user._id;

    const updatedFields = {};
    if (profilePic !== undefined) updatedFields.profilePic = profilePic;
    if (department !== undefined) updatedFields.department = department;
    if (internshipCompany !== undefined) updatedFields.internshipCompany = internshipCompany;
    if (internshipDuration !== undefined) updatedFields.internshipDuration = internshipDuration;
    if (internships !== undefined) updatedFields.internships = internships;

    // Dynamically calculate internshipStatus based on company / duration / internships entered
    if (internshipStatus !== undefined) {
      updatedFields.internshipStatus = internshipStatus;
    } else if (internshipCompany !== undefined || internships !== undefined) {
      const hasInternship = Boolean(
        (internshipCompany && internshipCompany.trim().length > 0) ||
        (Array.isArray(internships) && internships.length > 0 && internships.some((i) => i.company && i.company.trim()))
      );
      updatedFields.internshipStatus = hasInternship ? "internship" : "regular";
    }

    if (skills) updatedFields.skills = skills;
    if (resumeUrl !== undefined) updatedFields.resumeUrl = resumeUrl;
    if (linkedinUrl !== undefined) updatedFields.linkedinUrl = linkedinUrl;
    if (githubUrl !== undefined) updatedFields.githubUrl = githubUrl;
    if (cgpa !== undefined) updatedFields.cgpa = cgpa;

    if (req.user.role === "teacher") {
      if (experience !== undefined) updatedFields.experience = experience;
      if (description !== undefined) updatedFields.description = description;
      if (researchPast !== undefined) updatedFields.researchPast = researchPast;
    }

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updatedFields,
      });
    } catch (e) {
      if (e.code === "P2025") {
        return res.status(404).json({ message: "User not found" });
      }
      throw e;
    }

    delete updatedUser.password;
    updatedUser._id = updatedUser.id;

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in updateProfile:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("Error in checkAuth:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Token is missing." });

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: hashedToken,
        tokenExpires: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, tokenExpires: null },
    });

    res.status(200).json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error("Verification error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  res.status(200).json({ message: "Password reset successful!" });
};
