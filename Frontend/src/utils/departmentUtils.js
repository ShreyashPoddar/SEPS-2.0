// Frontend/src/utils/departmentUtils.js

/**
 * Resolves the official institutional display name of a student's department and specialization.
 * Handles both backend-populated department strings/objects and registration number decoding
 * so students always see their exact specialization regardless of legacy local state or cache.
 *
 * @param {Object} student - The student object (contains department, departmentRel, regNo)
 * @returns {string} Fully formatted official specialization name
 */
export function getStudentDisplayDepartment(student) {
  if (!student) return "Dept of ECE (Core - Electronics & Communication)";

  const rawDept = (student.departmentRel?.name || student.department || "").trim();
  const regNo = (student.regNo || "").trim().toUpperCase();
  const regCode = regNo.length >= 9 ? regNo.substring(6, 9) : "";

  // 1. Data Science (053 or explicit 'Data Science')
  if (regCode === "053" || rawDept.toLowerCase().includes("data science")) {
    return "Dept of ECE (Data Science)";
  }

  // 2. Cyber Physical Systems (052 or explicit 'CPS')
  if (regCode === "052" || rawDept.toLowerCase().includes("cps") || rawDept.toLowerCase().includes("cyber physical")) {
    return "Dept of ECE (Cyber Physical Systems)";
  }

  // 3. VLSI Design & Technology (067 or explicit 'VLSI')
  if (regCode === "067" || rawDept.toLowerCase().includes("vlsi")) {
    return "Dept of ECE (VLSI Design)";
  }

  // 4. Electronics and Computer Engineering (043 or explicit 'Computer')
  if (
    regCode === "043" ||
    rawDept.toLowerCase().includes("comp.engg") ||
    rawDept.toLowerCase().includes("electronics and computer") ||
    rawDept.toLowerCase().includes("elec. comp")
  ) {
    return "Dept of Electronics and Computer Engineering";
  }

  // 5. M.Tech Integrated / MESO (705 or explicit 'Integrated' / 'MESO')
  if (
    regCode === "705" ||
    rawDept.toLowerCase().includes("integrated") ||
    rawDept.toLowerCase().includes("meso")
  ) {
    return "Dept of ECE (M.Tech Integrated)";
  }

  // 6. Core ECE (004 or 'Dept of ECE' or 'ECE')
  if (
    regCode === "004" ||
    rawDept === "Dept of ECE" ||
    rawDept.toLowerCase().includes("core")
  ) {
    return "Dept of ECE (Core - Electronics & Communication)";
  }

  return rawDept || "Dept of ECE (Core - Electronics & Communication)";
}
