// controllers/statistics.controller.js
import prisma from "../lib/db.js";

const ALLOWED_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
  "hodece@srmist.edu.in",
];

export const getStatistics = async (req, res) => {
  try {
    const userEmail = (req.user?.email || "").trim().toLowerCase();
    if (!ALLOWED_EMAILS.some((e) => e.toLowerCase() === userEmail)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const teachers = await prisma.user.findMany({ where: { role: "teacher" } });
    const projects = await prisma.project.findMany();

    const domainCounts = {};
    const teacherIdToProjects = {};
    projects.forEach((p) => {
      if (!teacherIdToProjects[p.teacherId]) teacherIdToProjects[p.teacherId] = [];
      teacherIdToProjects[p.teacherId].push(p.projectTitle);

      const d = p.domain || "General";
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });

    const teachersWithProjects = teachers.filter((t) => teacherIdToProjects[t.id]);
    const teachersWithoutProjects = teachers.filter((t) => !teacherIdToProjects[t.id]);

    const students = await prisma.user.findMany({ where: { role: "student" } });
    const applications = await prisma.studentProjectApply.findMany({
      include: { members: true },
    });

    // Fetch approved teams with members, ordered by creation date
    const allApprovedTeams = await prisma.teamApproved.findMany({
      include: { members: true },
      orderBy: { createdAt: "asc" },
    });

    // Deduplicate approved teams:
    // 1. Exclude phantom rows with 0 members
    // 2. Exclude identical duplicates (same projectId + same student roster)
    const validApprovedTeams = [];
    const seenRosterKeys = new Set();

    for (const team of allApprovedTeams) {
      if (!team.members || team.members.length === 0) {
        continue; // Ignore phantom/empty team records
      }

      const rosterKey = `${team.projectId}_${team.members
        .map((m) => (m.regNo || "").trim().toUpperCase())
        .sort()
        .join("_")}`;

      if (seenRosterKeys.has(rosterKey)) {
        continue; // Ignore duplicate clone
      }
      seenRosterKeys.add(rosterKey);
      validApprovedTeams.push(team);
    }

    const groupApplications = validApprovedTeams.filter((t) => t.applicationType === "group");
    const individualApplications = validApprovedTeams.filter((t) => t.applicationType === "individual");

    const groupDetails = groupApplications.map((group) => {
      const project = projects.find((p) => p.id === group.projectId || p._id === group.projectId);
      const teacher = teachers.find((t) => t.id === project?.teacherId || t._id === project?.teacherId);
      return {
        projectTitle: project?.projectTitle || group.projectTitle || "Unknown",
        domain: project?.domain || "General",
        teacherName: teacher?.fullName || group.facultyName || "Unknown",
        students: group.members.map((m) => ({ name: m.name, regNo: m.regNo })),
      };
    });

    // Track all students with active applications or in approved teams
    const appliedStudentIds = new Set();
    applications.forEach((app) => {
      app.members.forEach((m) => appliedStudentIds.add(m.studentId));
    });
    validApprovedTeams.forEach((team) => {
      team.members.forEach((m) => appliedStudentIds.add(m.studentId));
    });

    const studentsWithApplications = students.filter((s) => appliedStudentIds.has(s.id));
    const studentsWithoutApplications = students.filter((s) => !appliedStudentIds.has(s.id));

    const teacherCount = teachers.length;
    const studentCount = students.length;
    const projectCount = projects.length;
    const groupCount = groupApplications.length;
    const individualCount = individualApplications.length;

    const applicationCount = applications.length + groupCount + individualCount;

    res.json({
      teacherCount,
      studentCount,
      projectCount,
      applicationCount,
      groupCount,
      individualCount,
      domainCounts,
      teachersWithProjects: teachersWithProjects.map((t) => ({
        name: t.fullName,
        email: t.email,
        projects: Array.from(new Set(teacherIdToProjects[t.id] || [])),
      })),
      teachersWithoutProjects: teachersWithoutProjects.map((t) => ({
        name: t.fullName,
        email: t.email,
      })),
      studentsWithApplications: studentsWithApplications.map((s) => ({
        name: s.fullName,
        email: s.email,
        regNo: s.regNo,
      })),
      studentsWithoutApplications: studentsWithoutApplications.map((s) => ({
        name: s.fullName,
        email: s.email,
        regNo: s.regNo,
      })),
      groupDetails,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching statistics", error: err.message });
  }
};
