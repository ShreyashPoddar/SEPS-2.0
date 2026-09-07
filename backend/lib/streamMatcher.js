// lib/streamMatcher.js
// Parses multi-stream project designations (e.g. "CSE, ECE", "ECE/IT")
// and verifies student department eligibility.

/**
 * Splits a raw stream string into individual clean stream tokens.
 * e.g. "CSE, ECE" -> ["CSE", "ECE"]
 * e.g. "ECE / CSE ; IT" -> ["ECE", "CSE", "IT"]
 * @param {string} streamStr - The raw stream string
 * @returns {string[]} Array of distinct stream names
 */
export const parseStreams = (streamStr) => {
  if (!streamStr || typeof streamStr !== "string") return [];
  return streamStr
    .split(/[,/;&|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Checks whether a student is eligible to see / apply for a project based on stream.
 * @param {Object} student - The User record of the student
 * @param {string} projectStream - The project's stream string
 * @returns {boolean}
 */
export const isStudentEligibleForStream = (student, projectStream) => {
  if (!projectStream) return true; // Open to all if unspecified

  const allowedStreams = parseStreams(projectStream);
  if (allowedStreams.length === 0) return true;

  // Universal keywords -> open to all departments
  const isUniversal = allowedStreams.some((s) =>
    /^(all|any|open|open to all|all branches|all departments|\*)$/i.test(s)
  );
  if (isUniversal) return true;

  // Extract student department metadata
  const deptRaw = (student?.department || "").trim().toLowerCase();
  const deptCode = (student?.departmentRel?.code || "").trim().toLowerCase();
  const deptName = (student?.departmentRel?.name || "").trim().toLowerCase();

  return allowedStreams.some((streamToken) => {
    const token = streamToken.trim().toLowerCase();

    // 1. Direct code equality (e.g. "ece" === "ece", "cse" === "cse")
    if (deptCode && (deptCode === token || deptCode.startsWith(token) || token.startsWith(deptCode))) {
      return true;
    }

    // 2. Direct department name exact match
    if (deptRaw === token || deptName === token) {
      return true;
    }

    // 3. Word boundary regex match in raw department string
    // e.g. token "cse" in "dept of cse"
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
