// controllers/statistics.controller.js
import prisma from "../lib/db.js";

const ALLOWED_EMAILS = [
  "sangeetm@srmist.edu.in",
  "vadivukk@srmist.edu.in",
  "elavelvg@srmist.edu.in",
];

export const getStatistics = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!ALLOWED_EMAILS.includes(userEmail)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const teachers = await prisma.user.findMany({ where: { role: "teacher" } });
    const projects = await prisma.project.findMany();

    const teacherIdToProjects = {};
    projects.forEach((p) => {
      if (!teacherIdToProjects[p.teacherId]) teacherIdToProjects[p.teacherId] = [];
      teacherIdToProjects[p.teacherId].push(p.projectTitle);
    });
    const teachersWithProjects = teachers.filter((t) => teacherIdToProjects[t.id]);
    const teachersWithoutProjects = teachers.filter((t) => !teacherIdToProjects[t.id]);

    const students = await prisma.user.findMany({ where: { role: "student" } });
    const applications = await prisma.studentProjectApply.findMany({
      include: { members: true },
    });

    // Approval deletes the StudentProjectApply rows, so counting only those
    // reported "Students Who Applied: None" once every team was approved.
    // Membership of an approved team counts as having applied.
    const approvedTeamMembers = await prisma.teamMember.findMany({
      select: { studentId: true },
    });

    const appliedStudentIds = new Set();
    applications.forEach((app) => {
      app.members.forEach((m) => appliedStudentIds.add(m.studentId));
    });
    approvedTeamMembers.forEach((m) => appliedStudentIds.add(m.studentId));
    const studentsWithApplications = students.filter((s) => appliedStudentIds.has(s.id));
    const studentsWithoutApplications = students.filter((s) => !appliedStudentIds.has(s.id));

    const groupApplications = await prisma.teamApproved.findMany({
      where: { applicationType: "group" },
      include: { members: true },
    });
    const groupDetails = groupApplications.map((group) => {
      const project = projects.find((p) => p.id === group.projectId);
      const teacher = teachers.find((t) => t.id === project?.teacherId);
      return {
        projectTitle: project?.projectTitle || "Unknown",
        teacherName: teacher?.fullName || "Unknown",
        students: group.members.map((m) => ({ name: m.name, regNo: m.regNo })),
      };
    });

    const teacherCount = teachers.length;
    const studentCount = students.length;
    const projectCount = projects.length;
    const groupCount = groupApplications.length;
    const individualCount = await prisma.teamApproved.count({
      where: { applicationType: "individual" },
    });

    // Total submitted, not just still-pending: an approved application no longer
    // exists as a row, so `applications.length` alone read 0 once teams were
    // approved even though Approved Groups showed 2.
    const applicationCount = applications.length + groupCount + individualCount;

    res.json({
      teacherCount,
      studentCount,
      projectCount,
      applicationCount,
      groupCount,
      individualCount,
      teachersWithProjects: teachersWithProjects.map((t) => ({
        name: t.fullName,
        email: t.email,
        projects: teacherIdToProjects[t.id] || [],
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
