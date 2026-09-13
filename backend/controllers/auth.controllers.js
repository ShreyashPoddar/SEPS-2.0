import { generateToken } from "../lib/utils.js";
import prisma from "../lib/db.js";
import bcrypt from "bcryptjs";

export function getStudentPasswords(fullName, regNo) {
  const parts = (fullName || "")
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean);

  if (parts.length === 0) {
    const last6 = (regNo || "").replace(/\D/g, "").slice(-6);
    return ["srmx" + last6];
  }

  const last6 = (regNo || "").replace(/\D/g, "").slice(-6);
  const firstName = parts[0].toLowerCase();
  const passwords = [];

  // Primary: First name (or first name + surname if < 4 letters)
  let primaryPrefix = "";
  if (firstName.length >= 4) {
    primaryPrefix = firstName.slice(0, 4);
  } else {
    const surname = parts.slice(1).join("").toLowerCase();
    primaryPrefix = (firstName + surname).slice(0, 4);
    while (primaryPrefix.length < 4) primaryPrefix += "x";
  }
  passwords.push(primaryPrefix + last6);

  // Secondary: If first word was a 1-2 letter initial (e.g. 'R' in 'R SRIVATHSAN'), also allow 'sriv010018'
  if (firstName.length < 4 && parts.length > 1) {
    const mainWord = parts.find((p) => p.length >= 4);
    if (mainWord) {
      passwords.push(mainWord.toLowerCase().slice(0, 4) + last6);
    }
  }

  return Array.from(new Set(passwords));
}

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

    // Format validation
    if (isEmail) {
      const SRM_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@srmist\.edu\.in$/i;
      if (!SRM_EMAIL_REGEX.test(rawId)) {
        return res.status(400).json({ message: "Invalid email id" });
      }
    } else {
      // SRM registration number format: RA followed by digits
      const REG_NO_REGEX = /^RA[0-9]{13}$/i;
      if (!REG_NO_REGEX.test(rawId)) {
        return res.status(400).json({ message: "Invalid registration number" });
      }
    }

    const searchRegNos = [rawId.toUpperCase(), rawId];
    const searchEmails = [
      rawId.toLowerCase(),
      `${rawId.toLowerCase()}@srmist.edu.in`,
    ];

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
      return res.status(200).json({
        role: "student",
        fullName: user.fullName,
        regNo: user.regNo,
        department: user.department,
        email: user.email,
        hasPassword: true,
        message: `Welcome back, ${user.fullName}. Please enter your password to continue.`,
      });
    }

    if (user.role === "teacher") {
      return res.status(200).json({
        role: "teacher",
        fullName: user.fullName,
        email: user.email,
        hasPassword: true,
        message: `Welcome back, ${user.fullName}. Please enter your password to continue.`,
      });
    }

    return res.status(400).json({ message: "Invalid account role." });
  } catch (error) {
    console.error("Error in identifyUser controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
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
    const searchEmails = [
      loginId.toLowerCase(),
      `${loginId.toLowerCase()}@srmist.edu.in`,
    ];

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

    if (!user.password) {
      return res.status(400).json({ message: "No password configured for this account. Please contact coordinator." });
    }

    let isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect && user.role === "student" && user.regNo) {
      const candidates = getStudentPasswords(user.fullName, user.regNo);
      if (candidates.includes(password.trim().toLowerCase())) {
        isPasswordCorrect = true;
      }
    }

    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials." });

    // Mark as verified on successful login if needed
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
      phoneNumber: user.phoneNumber || "",
      internshipStatus: user.internshipStatus,
      profilePic: user.profilePic || null,
      isProfileComplete: user.isProfileComplete,
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
      phoneNumber,
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
    // Institutional field: students cannot alter department themselves
    if (department !== undefined && req.user.role !== "student") updatedFields.department = department;
    if (phoneNumber !== undefined) updatedFields.phoneNumber = (phoneNumber || "").trim();
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
      const finalDept = req.user.department; // Institutional data is locked to official registrar record
      const finalPhone = updatedFields.phoneNumber !== undefined ? updatedFields.phoneNumber : req.user.phoneNumber;
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
      const cleanPhoneDigits = (finalPhone || "").replace(/\D/g, "");
      const isPhoneFormatted = Boolean(
        finalPhone &&
        cleanPhoneDigits.length >= 10 &&
        cleanPhoneDigits.length <= 14 &&
        /^[+]?[\d\s\-()]+$/.test(String(finalPhone).trim())
      );
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
        isPhoneFormatted &&
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
          if (!isPhoneFormatted) reasons.push("Phone Number is required (must be a valid 10-digit contact number, e.g. 9876543210 or +91 9876543210)");
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
