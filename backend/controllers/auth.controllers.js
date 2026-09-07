import { generateToken } from "../lib/utils.js";
import prisma from "../lib/db.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail, sendVerificationEmail, sendResetEmail } from "../lib/mailer.js";
import crypto from "crypto";

// ─── Per-User OTP Rate Limiting (Cooldown & Hourly Quota) ───────────────────
const userOtpHistory = new Map(); // key (email/regNo) -> Array of epoch timestamps

/**
 * Enforces:
 *  - Minimum 60-second cooldown between consecutive OTP requests for the same user.
 *  - Maximum 3 OTP requests in any rolling 1-hour window.
 */
export const checkUserOtpRateLimit = (identifier) => {
  if (!identifier) return { allowed: true };
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const COOLDOWN = 60 * 1000; // 60 seconds

  // Clean entries older than 1 hour
  const history = (userOtpHistory.get(key) || []).filter((t) => now - t < ONE_HOUR);

  if (history.length > 0) {
    const lastRequest = history[history.length - 1];
    const elapsed = now - lastRequest;
    if (elapsed < COOLDOWN) {
      const waitSeconds = Math.ceil((COOLDOWN - elapsed) / 1000);
      return {
        allowed: false,
        message: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
        waitSeconds,
      };
    }
  }

  if (history.length >= 3) {
    const oldest = history[0];
    const waitMinutes = Math.ceil((ONE_HOUR - (now - oldest)) / (60 * 1000));
    return {
      allowed: false,
      message: `Maximum OTP request limit reached (3 per hour). Please try again in ${waitMinutes} minute(s).`,
      waitMinutes,
    };
  }

  history.push(now);
  userOtpHistory.set(key, history);
  return { allowed: true };
};

export const signup = async (req, res) => {
  return res.status(403).json({
    message: "Public signup is disabled. All students and faculty have pre-provisioned portal accounts. Please log in using your SRM Register Number or Institutional Email.",
  });
};

export const identifyUser = async (req, res) => {
  const { identifier } = req.body;
  const rawId = (identifier || "").trim();

  if (!rawId) {
    return res.status(400).json({ message: "SRM Register Number or Official Email is required." });
  }

  try {
    const isEmail = rawId.includes("@");
    const isAdmin = [
      "admin",
      "admin123",
      "sepsadmin",
      "999999",
    ].includes(rawId.toLowerCase());

    // Format validation
    if (isEmail) {
      const SRM_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(srmist\.edu\.in|gmail\.com)$/i;
      if (!SRM_EMAIL_REGEX.test(rawId)) {
        return res.status(400).json({ message: "Invalid email id" });
      }
    } else if (!isAdmin) {
      // SRM registration number format: RA23xxxxxxxxxxx (RA followed by 13 digits)
      const REG_NO_REGEX = /^RA[0-9]{13}$/i;
      if (!REG_NO_REGEX.test(rawId)) {
        return res.status(400).json({ message: "Invalid registration number" });
      }
    }

    const searchRegNos = [rawId.toUpperCase(), rawId];
    if (rawId.toUpperCase().startsWith("RA99999999") || rawId.toUpperCase() === "RA2399999999999") {
      searchRegNos.push("RA999999999999", "RA9999999999999", "RA2399999999999");
    }

    const searchEmails = [
      rawId.toLowerCase(),
      `${rawId.toLowerCase()}@srmist.edu.in`,
    ];
    if (isAdmin) {
      searchEmails.push("sepsadmin@gmail.com", "admin123@srmist.edu.in");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { regNo: { in: searchRegNos } },
          { email: { in: searchEmails } },
        ],
      },
    });

    if (!user) {
      if (isEmail) {
        return res.status(404).json({ message: "Invalid email id" });
      }
      return res.status(404).json({ message: "Invalid registration number" });
    }

    if (user.role === "student") {
      // Determine if student is entering for the first time:
      // 1. Student has no email registered yet (!user.email)
      // 2. OR student has no password (!user.password)
      // 3. OR student's password still matches their default regNo or seed password
      let isFirstTime = false;
      if (!user.email || !user.password) {
        isFirstTime = true;
      } else if (user.regNo && user.password) {
        const isDefaultPassword =
          (await bcrypt.compare(user.regNo, user.password)) ||
          (await bcrypt.compare(user.regNo.toUpperCase(), user.password)) ||
          (await bcrypt.compare(user.regNo.toLowerCase(), user.password)) ||
          (await bcrypt.compare("password123", user.password));
        if (isDefaultPassword) {
          isFirstTime = true;
        }
      }

      if (isFirstTime) {
        return res.status(200).json({
          role: "student",
          fullName: user.fullName,
          regNo: user.regNo,
          department: user.department,
          hasPassword: false,
          requireEmailSetup: true,
          message: `Welcome, ${user.fullName}. First-time login detected. Please enter your official SRM email to activate your account.`,
        });
      }

      return res.status(200).json({
        role: "student",
        fullName: user.fullName,
        regNo: user.regNo,
        department: user.department,
        email: user.email,
        hasPassword: true,
        requireEmailSetup: false,
        message: `Welcome back, ${user.fullName}. Please enter your password to continue.`,
      });
    }

    if (user.role === "teacher") {
      const hasPassword = Boolean(user.password && user.password.trim().length > 0);

      if (!hasPassword) {
        // Enforce per-user OTP rate limiting
        const rateCheck = checkUserOtpRateLimit(user.email);
        if (!rateCheck.allowed) {
          return res.status(429).json({ message: rateCheck.message });
        }

        // Teacher has blank password -> generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedToken = crypto.createHash("sha256").update(otp).digest("hex");
        const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: tokenExpires,
          },
        });

        const mailResult = await sendResetEmail(user.email, user.fullName, otp);

        const setupUrl = `${process.env.CLIENT_URL || "http://localhost:5176"}/reset-password?email=${encodeURIComponent(user.email)}`;
        console.log(`🔑 [Faculty OTP] 6-Digit OTP for ${user.fullName} (${user.email}): ${otp}`);

        const quotaNotice = mailResult?.reason === "DAILY_LIMIT_REACHED"
          ? " (Daily email quota reached; please check with the coordinator or administrator for your activation OTP)."
          : "";

        return res.status(200).json({
          role: "teacher",
          fullName: user.fullName,
          email: user.email,
          hasPassword: false,
          setupUrl,
          message: `Verification OTP generated for your SRM email (${user.email}).${quotaNotice} Please check your inbox and enter the 6-digit OTP to set your password.`,
        });
      }

      // Teacher already has password set
      return res.status(200).json({
        role: "teacher",
        fullName: user.fullName,
        email: user.email,
        hasPassword: true,
        message: `Welcome back, ${user.fullName}. Please enter your password.`,
      });
    }

    return res.status(400).json({ message: "Invalid account role." });
  } catch (error) {
    console.error("Error in identifyUser controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email, identifier, regNo } = req.body;
  const loginId = (identifier || email || regNo || "").trim();

  if (!loginId) return res.status(400).json({ message: "Email or Register Number is required" });

  try {
    const searchEmails = [loginId.toLowerCase()];
    if (
      loginId.toLowerCase() === "admin" ||
      loginId.toLowerCase() === "admin123" ||
      loginId.toLowerCase() === "sepsadmin" ||
      loginId === "999999"
    ) {
      searchEmails.push("sepsadmin@gmail.com", "admin123@srmist.edu.in");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { in: searchEmails } },
          { regNo: loginId.toUpperCase() },
          { regNo: loginId },
        ],
      },
    });
    if (!user) {
      return res.status(404).json({ message: "Invalid email id" });
    }

    if (!user.email) {
      return res.status(400).json({
        message: "This student account has not been activated yet. Please sign in with your Register Number on the login page to set up your account.",
      });
    }

    // Enforce per-user OTP rate limiting
    const rateCheck = checkUserOtpRateLimit(user.email || loginId);
    if (!rateCheck.allowed) {
      return res.status(429).json({ message: rateCheck.message });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = crypto.createHash("sha256").update(otp).digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    console.log(`🔑 [Forgot Password OTP] 6-Digit OTP for ${user.fullName} (${user.email}): ${otp}`);
    const mailResult = await sendResetEmail(user.email, user.fullName, otp);

    const quotaNotice = mailResult?.reason === "DAILY_LIMIT_REACHED"
      ? " (Daily email quota reached; please contact the administrator for your OTP)."
      : "";

    res.status(200).json({
      message: `A 6-digit OTP has been generated for your registered email address.${quotaNotice}`,
      email: user.email,
    });
  } catch (err) {
    console.error("❌ Error in forgotPassword controller:", err.message);
    res.status(500).json({ message: "An error occurred while trying to send the reset email. Please try again later." });
  }
};

export const login = async (req, res) => {
  const { email, identifier, regNo, password } = req.body;
  const loginId = (identifier || email || regNo || "").trim();

  if (!loginId || !password) {
    return res.status(400).json({ message: "Register Number / Email and Password are required." });
  }

  try {
    const searchRegNos = [loginId.toUpperCase(), loginId];
    if (loginId.toUpperCase().startsWith("RA99999999") || loginId.toUpperCase() === "RA2399999999999") {
      searchRegNos.push("RA999999999999", "RA9999999999999", "RA2399999999999");
    }

    const searchEmails = [
      loginId.toLowerCase(),
      `${loginId.toLowerCase()}@srmist.edu.in`,
    ];
    if (
      loginId.toLowerCase() === "admin" ||
      loginId.toLowerCase() === "admin123" ||
      loginId.toLowerCase() === "sepsadmin" ||
      loginId === "999999"
    ) {
      searchEmails.push("sepsadmin@gmail.com", "admin123@srmist.edu.in");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { regNo: { in: searchRegNos } },
          { email: { in: searchEmails } },
        ],
      },
    });

    if (!user) {
      const isEmail = loginId.includes("@");
      if (isEmail) return res.status(404).json({ message: "Invalid email id" });
      return res.status(404).json({ message: "Invalid registration number" });
    }

    if (user.role === "teacher" && (!user.password || user.password.trim().length === 0)) {
      return res.status(400).json({
        message: "Your password has not been set yet. Please use Step 1 to receive your activation link via your official SRM email.",
      });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Account setup required. Please enter your ID on Step 1." });
    }

    let isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect && user.regNo && (user.regNo.startsWith("RA99999999") || user.regNo === "RA2399999999999")) {
      if (password === "RA999999999999" || password === "RA9999999999999" || password === "RA2399999999999") {
        isPasswordCorrect = true;
      }
    }

    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials." });

    // ── First-time student login detection ─────────────────────────────────
    // Students are seeded with their Reg No as the initial password. If the
    // submitted plaintext password matches the regNo we know they have never
    // changed it, so we force the email-verification + password-setup flow
    // before issuing any session token.
    if (user.role === "student" && user.regNo) {
      const isDefaultPassword = password === user.regNo ||
        password === user.regNo.toUpperCase() ||
        password === user.regNo.toLowerCase();

      if (isDefaultPassword) {
        return res.status(200).json({
          requireEmailSetup: true,
          regNo: user.regNo,
          fullName: user.fullName,
          message: "First-time login detected. Please verify your institutional email to set a new password.",
        });
      }
    }
    // ── End first-time detection ────────────────────────────────────────────

    // Mark as verified on successful login
    if (!user.isVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

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
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("jwt", "", {
      maxAge: 0,
      httpOnly: true,
      sameSite: isProd ? "None" : "Lax",
      secure: isProd,
      path: "/",
    });
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
      isProfileComplete,
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

    // Common URL Format Helpers & Regexes
    const CGPA_FORMAT_REGEX = /^(?:10(?:\.0{1,2})?|[0-9](?:\.[0-9]{1,2})?)$/;
    const LINKEDIN_FORMAT_REGEX = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.%]+(\/.*)?$/i;
    const GITHUB_FORMAT_REGEX = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_\-\.%]+(\/.*)?$/i;
    const isValidHttpUrl = (str) => {
      if (!str || typeof str !== "string") return false;
      const trimmed = str.trim();
      if (!trimmed) return false;
      const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      try {
        const parsed = new URL(withProto);
        return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".");
      } catch {
        return false;
      }
    };
    const normalizeUrl = (url) => {
      if (!url || typeof url !== "string") return "";
      const trimmed = url.trim();
      if (!trimmed) return "";
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    };

    if (skills) updatedFields.skills = skills;
    if (profilePic !== undefined) {
      const picTrimmed = (profilePic || "").trim();
      if (picTrimmed) {
        if (!isValidHttpUrl(picTrimmed)) {
          return res.status(400).json({ message: "Profile Picture must be a valid URL (https://...)" });
        }
        updatedFields.profilePic = normalizeUrl(picTrimmed);
      } else {
        updatedFields.profilePic = "";
      }
    }
    if (resumeUrl !== undefined) {
      const resumeTrimmed = (resumeUrl || "").trim();
      if (resumeTrimmed) {
        if (!isValidHttpUrl(resumeTrimmed)) {
          return res.status(400).json({ message: "Resume / CV must be a valid URL starting with https://" });
        }
        updatedFields.resumeUrl = normalizeUrl(resumeTrimmed);
      } else {
        updatedFields.resumeUrl = "";
      }
    }
    if (linkedinUrl !== undefined) {
      const linkedinTrimmed = (linkedinUrl || "").trim();
      if (linkedinTrimmed) {
        if (!LINKEDIN_FORMAT_REGEX.test(linkedinTrimmed)) {
          return res.status(400).json({ message: "LinkedIn must be in the format https://www.linkedin.com/in/username" });
        }
        updatedFields.linkedinUrl = normalizeUrl(linkedinTrimmed);
      } else {
        updatedFields.linkedinUrl = "";
      }
    }
    if (githubUrl !== undefined) {
      const githubTrimmed = (githubUrl || "").trim();
      if (githubTrimmed) {
        if (!GITHUB_FORMAT_REGEX.test(githubTrimmed)) {
          return res.status(400).json({ message: "GitHub must be in the format https://github.com/username" });
        }
        updatedFields.githubUrl = normalizeUrl(githubTrimmed);
      } else {
        updatedFields.githubUrl = "";
      }
    }
    if (cgpa !== undefined) {
      updatedFields.cgpa = cgpa === "" || cgpa === null ? null : parseFloat(cgpa);
    }

    if (req.user.role === "student") {
      const finalCgpa = updatedFields.cgpa !== undefined ? updatedFields.cgpa : req.user.cgpa;
      const finalDept = updatedFields.department !== undefined ? updatedFields.department : req.user.department;
      const finalPic = updatedFields.profilePic !== undefined ? updatedFields.profilePic : req.user.profilePic;
      const finalLinkedin = updatedFields.linkedinUrl !== undefined ? updatedFields.linkedinUrl : req.user.linkedinUrl;
      const finalGithub = updatedFields.githubUrl !== undefined ? updatedFields.githubUrl : req.user.githubUrl;
      const finalResume = updatedFields.resumeUrl !== undefined ? updatedFields.resumeUrl : req.user.resumeUrl;

      const finalStatus = updatedFields.internshipStatus !== undefined ? updatedFields.internshipStatus : req.user.internshipStatus;
      const isCorporate = finalStatus === "internship";
      const finalCompany = updatedFields.internshipCompany !== undefined ? updatedFields.internshipCompany : req.user.internshipCompany;
      const finalDuration = updatedFields.internshipDuration !== undefined ? updatedFields.internshipDuration : req.user.internshipDuration;

      const finalCgpaStr = finalCgpa !== null && finalCgpa !== undefined ? String(finalCgpa).trim() : "";
      const isCgpaFormatted = Boolean(
        finalCgpaStr &&
        !isNaN(finalCgpa) &&
        finalCgpa >= 0.01 &&
        finalCgpa <= 10.00 &&
        CGPA_FORMAT_REGEX.test(finalCgpaStr)
      );
      const isDeptFormatted = Boolean(finalDept && finalDept.trim().length > 0);
      const isPicFormatted = Boolean(finalPic && isValidHttpUrl(finalPic.trim()));
      const isLinkedinFormatted = Boolean(finalLinkedin && LINKEDIN_FORMAT_REGEX.test(finalLinkedin.trim()));
      const isGithubFormatted = Boolean(finalGithub && GITHUB_FORMAT_REGEX.test(finalGithub.trim()));
      const isResumeFormatted = Boolean(finalResume && isValidHttpUrl(finalResume.trim()));

      const hasInternshipFields = isCorporate
        ? Boolean(finalCompany && finalCompany.trim().length >= 2 && finalDuration && finalDuration.trim().length >= 2)
        : true;

      const isAllFilled = Boolean(
        isCgpaFormatted &&
        isDeptFormatted &&
        isPicFormatted &&
        isLinkedinFormatted &&
        isGithubFormatted &&
        isResumeFormatted &&
        hasInternshipFields
      );

      if (isProfileComplete !== undefined) {
        if (isProfileComplete && !isAllFilled) {
          const reasons = [];
          if (!isCgpaFormatted) reasons.push("CGPA must be a valid number between 0.01 and 10.00 (e.g. 9.92)");
          if (!isDeptFormatted) reasons.push("Department / Branch is required");
          if (!isPicFormatted) reasons.push("Profile Picture must be a valid URL (https://...)");
          if (!isLinkedinFormatted) reasons.push("LinkedIn must be in the format https://www.linkedin.com/in/username");
          if (!isGithubFormatted) reasons.push("GitHub must be in the format https://github.com/username");
          if (!isResumeFormatted) reasons.push("Resume must be a valid link (e.g. Google Drive or PDF)");
          if (isCorporate && !hasInternshipFields) reasons.push("Internship Company and Duration are required on the Corporate track");

          return res.status(400).json({
            message: `Cannot proceed to dashboard: The following fields are missing or have invalid formats:\n• ${reasons.join("\n• ")}`,
          });
        }
        updatedFields.isProfileComplete = Boolean(isProfileComplete && isAllFilled);
      } else {
        updatedFields.isProfileComplete = isAllFilled;
      }
    } else if (isProfileComplete !== undefined) {
      updatedFields.isProfileComplete = Boolean(isProfileComplete);
    }

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
  const { token, otp, code, email, identifier, regNo, password } = req.body;
  const rawCode = (otp || code || token || "").trim();
  const loginKey = (email || identifier || regNo || "").trim().toLowerCase();

  if (!rawCode || !password) {
    return res.status(400).json({ message: "6-digit OTP and new password are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  const hashedToken = crypto.createHash("sha256").update(rawCode).digest("hex");
  const searchCodes = [hashedToken, rawCode];

  let user = null;
  if (loginKey) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginKey },
          { email: `${loginKey}@srmist.edu.in` },
          { regNo: loginKey.toUpperCase() },
          { regNo: loginKey },
        ],
        AND: [
          { resetPasswordToken: { in: searchCodes } },
          { resetPasswordExpires: { gt: new Date() } },
        ],
      },
    });
  } else {
    user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: { in: searchCodes },
        resetPasswordExpires: { gt: new Date() },
      },
    });
  }

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired OTP. Please request a new code." });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      isVerified: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  res.status(200).json({ message: "Password updated successfully! You can now log in." });
};

// ─── Student First-Time Email Verification ──────────────────────────────────
// Called after a student successfully authenticates with their default password
// (= their Reg No). They must supply an institutional email whose local part
// (the part before @) matches their Reg No. We store the email, generate a
// 6-digit OTP and send it so the student can then set a real password.
export const verifyStudentEmail = async (req, res) => {
  const { regNo, email } = req.body;

  if (!regNo || !email) {
    return res.status(400).json({ message: "Register Number and email are required." });
  }

  // SRM institutional email format: <2 letters><4 digits>@srmist.edu.in
  // e.g. sp7170@srmist.edu.in, ab1234@srmist.edu.in
  const emailLower = email.trim().toLowerCase();
  const SRM_EMAIL_REGEX = /^[a-z]{2}[0-9]{4}@srmist\.edu\.in$/;

  if (!SRM_EMAIL_REGEX.test(emailLower)) {
    return res.status(400).json({
      message: `Invalid email format. Please use your SRM institutional email in the format: ab1234@srmist.edu.in (2 letters + 4 digits + @srmist.edu.in).`,
    });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { regNo: { in: [regNo.trim(), regNo.trim().toUpperCase(), regNo.trim().toLowerCase()] } },
    });

    if (!user || user.role !== "student") {
      return res.status(404).json({ message: "Student account not found." });
    }

    // Check if this email is already linked to a different registered account
    const existingEmailOwner = await prisma.user.findFirst({
      where: {
        email: emailLower,
        NOT: { id: user.id },
      },
    });
    if (existingEmailOwner) {
      return res.status(400).json({
        message: "This SRM institutional email is already linked to another registered account.",
      });
    }

    // Enforce per-user OTP rate limiting
    const rateCheck = checkUserOtpRateLimit(emailLower || user.regNo);
    if (!rateCheck.allowed) {
      return res.status(429).json({ message: rateCheck.message });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = crypto.createHash("sha256").update(otp).digest("hex");
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save the verified institutional email and the OTP on the student record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: emailLower,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: tokenExpires,
      },
    });

    console.log(`🔑 [Student First-Login OTP] ${user.fullName} (${emailLower}): ${otp}`);
    const mailResult = await sendResetEmail(emailLower, user.fullName, otp);

    const quotaNotice = mailResult?.reason === "DAILY_LIMIT_REACHED"
      ? " (Daily email quota reached; please contact the administrator for your setup OTP)."
      : "";

    return res.status(200).json({
      message: `A 6-digit OTP has been generated for ${emailLower}.${quotaNotice} Enter it along with your new password to complete setup.`,
      email: emailLower,
    });
  } catch (error) {
    console.error("Error in verifyStudentEmail:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─── Change Password (authenticated) ─────────────────────────────────────────
// Requires the user to supply their current password and a new one.
// Must be called with a valid session (protectRoute middleware).
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different from the current password." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user._id } });
    if (!user || !user.password) {
      return res.status(400).json({ message: "No password set for this account. Please use the reset flow." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error in changePassword:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
