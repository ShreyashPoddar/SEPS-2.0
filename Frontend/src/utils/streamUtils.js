// Frontend/src/utils/streamUtils.js

/**
 * Splits raw stream string (e.g. "CSE, ECE" or "ECE/IT") into clean individual tokens.
 * @param {string} streamStr 
 * @returns {string[]}
 */
export const parseStreams = (streamStr) => {
  if (!streamStr || typeof streamStr !== "string") return [];
  const placeholder = "__AND__";
  const safeStr = streamStr.replace(/Electronics\s*&\s*Communication/gi, `Electronics${placeholder}Communication`);
  return safeStr
    .split(/[,;/|\n]+/g)
    .map((s) => s.replace(new RegExp(placeholder, "g"), " & ").trim())
    .filter(Boolean);
};

/**
 * Helper to map a single token or segment into canonical specializations.
 */
function mapTokenToSpecializations(raw) {
  const t = raw.trim().toLowerCase();
  if (!t) return [];
  if (/^(all|any|open|open to all|all branches|all departments|all specializations|all specialization|\*)$/i.test(t)) {
    return ["All Specializations"];
  }
  const res = [];
  if (t.includes("data science") || t.includes("053")) res.push("Dept of ECE (Data Science)");
  if (t.includes("cyber physical") || /\bcps\b/i.test(t) || t.includes("052")) res.push("Dept of ECE (Cyber Physical Systems)");
  if (t.includes("vlsi") || t.includes("067")) res.push("Dept of ECE (VLSI Design)");
  if (
    t.includes("electronics and computer") ||
    t.includes("elec. comp") ||
    t.includes("comp.engg") ||
    t.includes("043")
  ) {
    res.push("Dept of Electronics and Computer Engineering");
  }
  if (t.includes("integrated") || t.includes("meso") || t.includes("705")) res.push("Dept of ECE (M.Tech Integrated)");
  if (/\bcse\b/i.test(t) || t.includes("computer science")) res.push("Dept of CSE");
  if (/\b(it|information technology)\b/i.test(t)) res.push("Dept of IT");
  if (/\b(mech|mechanical)\b/i.test(t)) res.push("Dept of Mechanical");
  if (/\b(biomedical|biomed|bme)\b/i.test(t)) res.push("Dept of Biomedical");

  if (
    t.includes("core") ||
    t.includes("electronics & communication") ||
    t.includes("electronics and communication") ||
    (/\bece\b/i.test(t) && res.length === 0)
  ) {
    res.push("Dept of ECE (Core - Electronics & Communication)");
  }
  return res;
}

export const mapRawStreamToCanonical = (rawStream) => {
  if (!rawStream || typeof rawStream !== "string" || !rawStream.trim()) {
    return "All Specializations";
  }

  const s = rawStream.trim();
  if (
    /^(all|any|open|open to all|all branches|all departments|all specializations|all specialization|\*)$/i.test(s)
  ) {
    return "All Specializations";
  }

  const placeholder = "__AND__";
  const safeStr = s.replace(/Electronics\s*&\s*Communication/gi, `Electronics${placeholder}Communication`);
  const segments = safeStr
    .split(/[,;/|\n]+/g)
    .map((x) => x.replace(new RegExp(placeholder, "g"), " & ").trim())
    .filter(Boolean);
  const matched = new Set();

  for (const seg of segments) {
    for (const m of mapTokenToSpecializations(seg)) {
      matched.add(m);
    }
  }

  // Fallback: analyze whole string if no segment produced matches
  if (matched.size === 0) {
    for (const m of mapTokenToSpecializations(s)) {
      matched.add(m);
    }
  }

  // If no specific branch matched, default to "All Specializations"
  if (matched.size === 0) {
    return "All Specializations";
  }

  return Array.from(matched).join(", ");
};

/**
 * Checks whether a student is eligible to see / apply for a project based on stream.
 * @param {Object} student - The User record of the student
 * @param {string} projectStream - The project's stream string
 * @returns {boolean}
 */
export const isStudentEligibleForStream = (student, projectStream) => {
  if (!projectStream) return true; // Open to all if unspecified

  const canonicalStream = mapRawStreamToCanonical(projectStream);
  const allowedStreams = parseStreams(canonicalStream);
  if (allowedStreams.length === 0) return true;

  // Universal keywords -> open to all departments / specializations
  const isUniversal = allowedStreams.some((s) =>
    /^(all|any|open|open to all|all branches|all departments|all specializations|all specialization|\*)$/i.test(s)
  );
  if (isUniversal) return true;

  // Extract student department metadata and specialization
  const deptRaw = (student?.department || "").trim().toLowerCase();
  const deptCode = (student?.departmentRel?.code || "").trim().toLowerCase();
  const deptName = (student?.departmentRel?.name || "").trim().toLowerCase();
  const regNo = (student?.regNo || "").trim().toUpperCase();
  const regCode = regNo.length >= 9 ? regNo.substring(6, 9) : "";

  let studentSpec = deptRaw;
  if (regCode === "053" || deptRaw.includes("data science")) {
    studentSpec = "dept of ece (data science)";
  } else if (regCode === "052" || deptRaw.includes("cps") || deptRaw.includes("cyber physical")) {
    studentSpec = "dept of ece (cyber physical systems)";
  } else if (regCode === "067" || deptRaw.includes("vlsi")) {
    studentSpec = "dept of ece (vlsi design)";
  } else if (regCode === "043" || deptRaw.includes("computer")) {
    studentSpec = "dept of electronics and computer engineering";
  } else if (regCode === "705" || deptRaw.includes("integrated") || deptRaw.includes("meso")) {
    studentSpec = "dept of ece (m.tech integrated)";
  } else if (regCode === "004" || deptRaw === "dept of ece" || deptRaw.includes("core")) {
    studentSpec = "dept of ece (core - electronics & communication)";
  }

  return allowedStreams.some((streamToken) => {
    const token = streamToken.trim().toLowerCase();

    // 0. Direct specialization match
    if (
      studentSpec === token ||
      token.includes(studentSpec) ||
      studentSpec.includes(token)
    ) {
      return true;
    }

    // 1. Direct code equality (e.g. "ece" === "ece", "cse" === "cse")
    if (deptCode && (deptCode === token || deptCode.startsWith(token) || token.startsWith(deptCode))) {
      return true;
    }

    // 2. Direct department name exact match
    if (deptRaw === token || deptName === token) {
      return true;
    }

    // 3. Word boundary regex match in raw department string
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (regex.test(deptRaw) || regex.test(deptName)) {
      return true;
    }

    // 4. Common departmental acronym / keyword mappings in engineering colleges
    if (token === "ece" && (deptCode.startsWith("ece") || deptRaw.includes("electronics") || deptRaw.includes("communication"))) {
      return true;
    }
    if (token === "cse" && (deptCode === "cse" || deptRaw.includes("computer science") || (!deptRaw.includes("electronics") && (deptRaw.includes("computer") || deptRaw.includes("computing"))))) {
      return true;
    }
    if (token === "it" && (deptCode === "it" || deptRaw.includes("information technology") || deptRaw.includes("dept of it"))) {
      return true;
    }
    if (token === "eee" && (deptCode === "eee" || deptRaw.includes("electrical") || deptRaw.includes("dept of eee"))) {
      return true;
    }
    if (token === "mech" && (deptCode === "mech" || deptRaw.includes("mechanical") || deptRaw.includes("mechatronics"))) {
      return true;
    }
    if (token === "bme" && (deptCode === "bme" || deptRaw.includes("biomedical"))) {
      return true;
    }

    return false;
  });
};
