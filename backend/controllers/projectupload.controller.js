// controllers/projectupload.controller.js
import prisma from "../lib/db.js";

const withId = (obj) => {
  if (obj) obj._id = obj.id;
  return obj;
};

const createProject = async (req, res) => {
  try {
    const { projectTitle, description, stream, domain } = req.body;

    const teacherId = req.user._id;
    const facultyName = req.user.fullName;

    const savedProject = await prisma.project.create({
      data: { projectTitle, description, stream, domain, teacherId, facultyName },
    });

    res.status(201).json(withId(savedProject));
  } catch (error) {
    console.error("Error in createProject:", error.message);
    res.status(500).json({ message: "Error creating project", error: error.message });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const studentId = req.user._id;

    const approvedTeams = await prisma.teamApproved.findMany({
      select: { projectId: true },
      distinct: ["projectId"],
    });
    const approvedProjectIds = approvedTeams.map((t) => t.projectId);

    const allApplications = await prisma.studentProjectApply.findMany({
      select: { id: true, projectId: true },
    });
    const countByProject = {};
    allApplications.forEach((a) => {
      countByProject[a.projectId] = (countByProject[a.projectId] || 0) + 1;
    });
    const overAppliedIds = Object.keys(countByProject).filter(
      (pid) => countByProject[pid] > 2
    );

    const studentMemberships = await prisma.applicationMember.findMany({
      where: { studentId },
      select: { application: { select: { projectId: true } } },
    });
    const studentAppliedProjectIds = studentMemberships.map(
      (m) => m.application.projectId
    );

    const excludedIds = [
      ...new Set([...approvedProjectIds, ...overAppliedIds, ...studentAppliedProjectIds]),
    ];

    const projects = await prisma.project.findMany({
      where: { id: { notIn: excludedIds } },
      orderBy: { createdAt: "desc" },
    });
    projects.forEach(withId);

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error in getAllProjects:", error.message);
    res.status(500).json({ message: "Error fetching projects", error: error.message });
  }
};

const getProjectsByTeacher = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { teacherId: req.user._id },
      orderBy: { createdAt: "desc" },
    });
    projects.forEach(withId);
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error in getProjectsByTeacher:", error.message);
    res.status(500).json({ message: "Error fetching teacher's projects", error: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(withId(project));
  } catch (error) {
    console.error("Error in getProjectById:", error.message);
    res.status(500).json({ message: "Error fetching project", error: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const { projectTitle, description, stream, domain } = req.body;

    let updatedProject;
    try {
      updatedProject = await prisma.project.update({
        where: { id: req.params.id },
        data: { projectTitle, description, stream, domain },
      });
    } catch (e) {
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Project not found" });
      }
      throw e;
    }

    res.status(200).json(withId(updatedProject));
  } catch (error) {
    console.error("Error in updateProject:", error.message);
    res.status(500).json({ message: "Error updating project", error: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    try {
      // Cascade delete (defined in prisma/schema.prisma) removes the
      // project's StudentProjectApply and TeamApproved rows automatically.
      await prisma.project.delete({ where: { id: projectId } });
    } catch (e) {
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Project not found" });
      }
      throw e;
    }

    res.status(200).json({
      message: "Project and related applications/teams deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteProject:", error.message);
    res.status(500).json({ message: "Error deleting project", error: error.message });
  }
};

export {
  createProject,
  getAllProjects,
  getProjectsByTeacher,
  getProjectById,
  updateProject,
  deleteProject,
};
