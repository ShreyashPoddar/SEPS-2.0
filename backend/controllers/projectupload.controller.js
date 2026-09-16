// controllers/projectupload.controller.js
import prisma from "../lib/db.js";
import {
  parseStreams,
  isStudentEligibleForStream,
  mapRawStreamToCanonical,
} from "../lib/streamMatcher.js";

const withId = (obj) => {
  if (obj) {
    obj._id = obj.id;
    obj.stream = mapRawStreamToCanonical(obj.stream);
    obj.allowedStreams = parseStreams(obj.stream);
  }
  return obj;
};

const createProject = async (req, res) => {
  try {
    const { projectTitle, description, stream, domain } = req.body;
    const canonicalStream = mapRawStreamToCanonical(stream);

    const teacherId = req.user._id;
    const facultyName = req.user.fullName;

    const savedProject = await prisma.project.create({
      data: { projectTitle, description, stream: canonicalStream, domain, teacherId, facultyName },
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
    for (const p of projects) {
      const canonical = mapRawStreamToCanonical(p.stream);
      if (p.stream !== canonical) {
        prisma.project
          .update({
            where: { id: p.id },
            data: { stream: canonical },
          })
          .catch(() => {});
        p.stream = canonical;
      }
      withId(p);
    }

    // Filter projects based on student's department/stream eligibility
    let eligibleProjects = projects;
    if (req.user && req.user.role === "student") {
      eligibleProjects = projects.filter((p) =>
        isStudentEligibleForStream(req.user, p.stream)
      );
    }

    res.status(200).json(eligibleProjects);
  } catch (error) {
    console.error("Error in getAllProjects:", error.message);
    res.status(500).json({ message: "Error fetching projects", error: error.message });
  }
};

const getProjectsByTeacher = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { teacherId: req.user._id },
          { teacherId: req.user.id },
          { facultyName: req.user.fullName },
        ],
      },
      include: {
        applications: {
          select: { id: true, status: true, priority: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    projects.forEach((p) => {
      const canonical = mapRawStreamToCanonical(p.stream);
      if (p.stream !== canonical) {
        prisma.project
          .update({
            where: { id: p.id },
            data: { stream: canonical },
          })
          .catch(() => {});
        p.stream = canonical;
      }
      withId(p);
      p.applicationsCount = p.applications ? p.applications.length : 0;
    });
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
    const canonical = mapRawStreamToCanonical(project.stream);
    if (project.stream !== canonical) {
      prisma.project
        .update({
          where: { id: project.id },
          data: { stream: canonical },
        })
        .catch(() => {});
      project.stream = canonical;
    }
    res.status(200).json(withId(project));
  } catch (error) {
    console.error("Error in getProjectById:", error.message);
    res.status(500).json({ message: "Error fetching project", error: error.message });
  }
};

// A project may only be modified by the teacher who created it.
const denyIfNotOwner = async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return true;
  }
  if (req.user.role !== "teacher" || project.teacherId !== req.user._id) {
    res.status(403).json({ message: "Access denied. You can only modify your own projects." });
    return true;
  }
  return false;
};

const updateProject = async (req, res) => {
  try {
    if (await denyIfNotOwner(req, res)) return;

    const { projectTitle, description, stream, domain } = req.body;
    const canonicalStream = mapRawStreamToCanonical(stream);

    let updatedProject;
    try {
      updatedProject = await prisma.project.update({
        where: { id: req.params.id },
        data: { projectTitle, description, stream: canonicalStream, domain },
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
    if (await denyIfNotOwner(req, res)) return;

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

const getStudentSpecializations = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: "student" },
      select: {
        department: true,
        regNo: true,
        departmentRel: { select: { name: true, code: true } },
      },
    });

    const specializationSet = new Set();

    for (const s of students) {
      const rawDept = (s.departmentRel?.name || s.department || "").trim();
      const regNo = (s.regNo || "").trim().toUpperCase();
      const regCode = regNo.length >= 9 ? regNo.substring(6, 9) : "";

      if (regCode === "053" || rawDept.toLowerCase().includes("data science")) {
        specializationSet.add("Dept of ECE (Data Science)");
      } else if (regCode === "052" || rawDept.toLowerCase().includes("cps") || rawDept.toLowerCase().includes("cyber physical")) {
        specializationSet.add("Dept of ECE (Cyber Physical Systems)");
      } else if (regCode === "067" || rawDept.toLowerCase().includes("vlsi")) {
        specializationSet.add("Dept of ECE (VLSI Design)");
      } else if (regCode === "043" || rawDept.toLowerCase().includes("computer")) {
        specializationSet.add("Dept of Electronics and Computer Engineering");
      } else if (regCode === "705" || rawDept.toLowerCase().includes("integrated") || rawDept.toLowerCase().includes("meso")) {
        specializationSet.add("Dept of ECE (M.Tech Integrated)");
      } else if (regCode === "004" || rawDept === "Dept of ECE" || rawDept.toLowerCase().includes("core")) {
        specializationSet.add("Dept of ECE (Core - Electronics & Communication)");
      } else if (rawDept) {
        specializationSet.add(rawDept);
      }
    }

    // Default institutional specializations if no student records exist in DB yet
    if (specializationSet.size === 0) {
      specializationSet.add("Dept of ECE (Core - Electronics & Communication)");
      specializationSet.add("Dept of ECE (Data Science)");
      specializationSet.add("Dept of ECE (Cyber Physical Systems)");
      specializationSet.add("Dept of ECE (VLSI Design)");
      specializationSet.add("Dept of Electronics and Computer Engineering");
      specializationSet.add("Dept of ECE (M.Tech Integrated)");
    }

    const sortedList = Array.from(specializationSet).sort();
    res.status(200).json(sortedList);
  } catch (error) {
    console.error("Error in getStudentSpecializations:", error.message);
    res.status(500).json({ message: "Error fetching specializations", error: error.message });
  }
};

export {
  createProject,
  getAllProjects,
  getProjectsByTeacher,
  getProjectById,
  updateProject,
  deleteProject,
  getStudentSpecializations,
};
