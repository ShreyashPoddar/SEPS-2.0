import axios from "axios";

// Base API instance
const API = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:3050/api"
    : `https://${import.meta.env.VITE_BACKEND_URL || "ececonnect-production.up.railway.app"}/api`,
  withCredentials: true,
  timeout: 3000,
});

// --- In-Memory / LocalStorage Mock Database for offline & development demo ---
const STORAGE_KEY_USER = "seps_current_user";
const STORAGE_KEY_PROJECTS = "seps_projects";
const STORAGE_KEY_DEADLINE = "seps_deadline";
const STORAGE_KEY_APPLICATIONS = "seps_applications";
const STORAGE_KEY_TEAMS = "seps_teams";
const STORAGE_KEY_TICKETS = "seps_tickets";

const initialProjects = [
  {
    _id: "p1",
    projectTitle: "Autonomous Drone Swarm Navigation via Edge AI & ROS2",
    facultyName: "Dr. M. Sangeetha",
    facultyEmail: "sangeetm@srmist.edu.in",
    domain: "Automation and Robotics",
    description: "Developing decentralized swarm intelligence algorithms for autonomous UAVs using ROS2 and embedded Jetson Nano platforms.",
    vacancies: 2,
    teamLimit: 4,
    prerequisites: "ROS2, Python, C++, Linux",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "p2",
    projectTitle: "FPGA-Accelerated Cryptographic Hardware Accelerator",
    facultyName: "Dr. K. Vadivukkarasi",
    facultyEmail: "vadivukk@srmist.edu.in",
    domain: "VLSI Design",
    description: "Design and implementation of high-throughput AES-256 and ECC cryptographic accelerators on Xilinx Artix-7 FPGAs.",
    vacancies: 1,
    teamLimit: 3,
    prerequisites: "Verilog, Digital Design, Vivado",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "p3",
    projectTitle: "Low-Power LoRaWAN Mesh Network for Smart Campus IoT",
    facultyName: "Dr. G. Elavelvis",
    facultyEmail: "elavelvg@srmist.edu.in",
    domain: "Embedded Systems and IoT",
    description: "Creating an energy-harvesting multi-hop LoRa sensor network for environmental and air quality monitoring across university blocks.",
    vacancies: 3,
    teamLimit: 4,
    prerequisites: "Embedded C, ESP32, LoRaWAN",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "p4",
    projectTitle: "Real-Time Bio-Signal Monitoring with Edge Neural Accelerators",
    facultyName: "Dr. S. Malarvizhi",
    facultyEmail: "malarvig@srmist.edu.in",
    domain: "Biomedical Electronics",
    description: "Wearable ECG and EMG anomaly detection using quantized 1D Convolutional Neural Networks on low-power microcontrollers.",
    vacancies: 2,
    teamLimit: 3,
    prerequisites: "Signal Processing, PyTorch, PCB Design",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "p5",
    projectTitle: "5G Beamforming Antenna Array with Reconfigurable Surfaces",
    facultyName: "Dr. B. Ramachandran",
    facultyEmail: "ramachab@srmist.edu.in",
    domain: "Antenna design and RF systems",
    description: "Design of millimeter-wave phased array antennas and intelligent reflecting surfaces (RIS) for enhanced wireless coverage.",
    vacancies: 2,
    teamLimit: 4,
    prerequisites: "HFSS, CST Studio, Electromagnetics",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "p6",
    projectTitle: "Deep Learning based Real-Time Traffic Sign & Pedestrian Detection",
    facultyName: "Dr. R. Kumar",
    facultyEmail: "kumarr@srmist.edu.in",
    domain: "AI/ML/DL based applications",
    description: "Optimized YOLOv10 object detection deployment on embedded automotive edge hardware for advanced driver assistance systems (ADAS).",
    vacancies: 1,
    teamLimit: 4,
    prerequisites: "PyTorch, OpenCV, TensorRT",
    createdAt: new Date().toISOString(),
  }
];

const mockStudents = [
  { _id: "s1", fullName: "Aadyoth Sreeram", regNo: "RA2111003010001", email: "aadyoth@srmist.edu.in", role: "student", department: "Dept of ECE", internshipStatus: "regular", cgpa: 9.4, skills: ["Embedded C", "RTOS", "Verilog"] },
  { _id: "s2", fullName: "Riyan Kothari", regNo: "RA2111003010002", email: "riyan@srmist.edu.in", role: "student", department: "Dept of ECE", internshipStatus: "regular", cgpa: 9.2, skills: ["Python", "ROS2", "Robotics"] },
  { _id: "s3", fullName: "Suhas Manjunath", regNo: "RA2111003010003", email: "suhas@srmist.edu.in", role: "student", department: "Dept of ECE", internshipStatus: "regular", cgpa: 9.0, skills: ["IoT", "ESP32", "Edge AI"] },
  { _id: "s4", fullName: "Priya Sharma", regNo: "RA2111003010004", email: "priya@srmist.edu.in", role: "student", department: "Dept of CSE", internshipStatus: "regular", cgpa: 9.3, skills: ["Full Stack", "React", "NodeJS"] },
  { _id: "s5", fullName: "Aditya Verma", regNo: "RA2111003010005", email: "aditya@srmist.edu.in", role: "student", department: "Dept of CSE", internshipStatus: "internship", internshipCompany: "Qualcomm India", cgpa: 9.5, skills: ["PyTorch", "Deep Learning", "CUDA"] },
  { _id: "s6", fullName: "Ananya Iyer", regNo: "RA2111003010006", email: "ananya@srmist.edu.in", role: "student", department: "Dept of IT", internshipStatus: "internship", internshipCompany: "Amazon AWS", cgpa: 9.1, skills: ["Cloud Computing", "Golang", "Kubernetes"] },
  { _id: "s7", fullName: "Karthik Raja", regNo: "RA2111003010007", email: "karthik@srmist.edu.in", role: "student", department: "Dept of Mechanical", internshipStatus: "regular", cgpa: 8.7, skills: ["SolidWorks", "CAD", "Robotics"] },
  { _id: "s8", fullName: "Sneha Reddy", regNo: "RA2111003010008", email: "sneha@srmist.edu.in", role: "student", department: "Dept of Biomedical", internshipStatus: "internship", internshipCompany: "Philips Healthcare", cgpa: 9.2, skills: ["Bio-Sensors", "MATLAB", "Signal Processing"] },
];

function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEY_USER);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function setStoredUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_USER);
  }
}

function getStoredProjects() {
  const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return initialProjects;
    }
  }
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(initialProjects));
  return initialProjects;
}

// Wrapper for resilient execution with mock fallback
async function withFallback(apiCall, mockResolver) {
  try {
    const res = await apiCall();
    return res;
  } catch (err) {
    // If backend server is unreachable / network failed, fallback gracefully to mock handler
    if (!err.response || err.code === "ERR_NETWORK" || err.code === "ECONNABORTED" || err.message?.includes("Network Error")) {
      const mockData = await mockResolver();
      return { data: mockData };
    }
    throw err;
  }
}

// --- GLOBAL DEADLINE ---
export const getGlobalDeadline = () =>
  withFallback(
    () => API.get("/global-deadline"),
    () => {
      const d = localStorage.getItem(STORAGE_KEY_DEADLINE) || new Date(Date.now() + 15 * 86400000).toISOString();
      return { deadline: d };
    }
  );

export const setGlobalDeadline = (deadline) =>
  withFallback(
    () => API.post("/global-deadline", { deadline }),
    () => {
      localStorage.setItem(STORAGE_KEY_DEADLINE, deadline);
      return { message: "Deadline updated successfully!" };
    }
  );

// --- AUTH ROUTES ---
export const signupUser = (data) =>
  withFallback(
    () => API.post("/auth/signup", data),
    () => {
      const user = {
        _id: "user_" + Date.now(),
        fullName: data.fullName || "SRM Engineer",
        email: data.email,
        regNo: data.regNo || "RA2111003010123",
        role: data.role || "student",
        isVerified: true,
        department: "Dept of ECE",
        domain: "Embedded Systems and IoT",
        cgpa: 9.1,
        skills: "C++, Python, Embedded Systems, IoT",
      };
      setStoredUser(user);
      return { message: "Account created successfully! You can now access your dashboard." };
    }
  );

export const loginUser = (data) =>
  withFallback(
    () => API.post("/auth/login", {
      identifier: data.identifier || data.email || data.regNo,
      email: data.email || data.identifier,
      password: data.password,
    }),
    () => {
      const loginKey = (data.identifier || data.email || data.regNo || "").toLowerCase();
      const isTeacher =
        loginKey.includes("teacher") ||
        loginKey.includes("faculty") ||
        loginKey.includes("sangeetm") ||
        loginKey.includes("vadivukk") ||
        loginKey.includes("elavelvg") ||
        loginKey.includes("prof");

      const matchedMock = mockStudents.find(
        (s) => s.regNo.toLowerCase() === loginKey || s.email.toLowerCase() === loginKey
      );

      const user = matchedMock
        ? { ...matchedMock, isVerified: true }
        : {
            _id: isTeacher ? "t1" : "s1",
            fullName: isTeacher ? "Dr. M. Sangeetha" : (data.email?.split("@")[0] || loginKey.toUpperCase() || "SRM Student"),
            email: data.email || (isTeacher ? "sangeetm@srmist.edu.in" : `${loginKey.toLowerCase()}@srmist.edu.in`),
            regNo: isTeacher ? undefined : (data.regNo || (loginKey.startsWith("ra") ? loginKey.toUpperCase() : "RA2111003010123")),
            role: isTeacher ? "teacher" : "student",
            isVerified: true,
            department: "Dept of ECE",
            internshipStatus: "regular",
            internshipCompany: "",
            domain: isTeacher ? "Robotics and Automation" : "Embedded Systems and IoT",
            experience: isTeacher ? 12 : undefined,
            description: isTeacher ? "Professor & Department Coordinator" : "Final Year B.Tech ECE Student",
          };
      setStoredUser(user);
      return { message: "Login successful!", user };
    }
  );

export const logoutUser = () =>
  withFallback(
    () => API.post("/auth/logout"),
    () => {
      setStoredUser(null);
      return { message: "Logged out" };
    }
  );

export const forgotPassword = (data) =>
  withFallback(
    () => API.post("/auth/forgot-password", {
      identifier: data.identifier || data.email || data.regNo,
      email: data.email || data.identifier,
    }),
    () => ({ message: `Password reset link has been dispatched for ${data.identifier || data.email || "your account"}.` })
  );

export const getCurrentUser = () =>
  withFallback(
    () => API.get("/auth/check"),
    () => {
      let u = getStoredUser();
      if (!u) {
        // Default to a verified student if navigated directly
        u = {
          _id: "s1",
          fullName: "Demo Student",
          email: "student@srmist.edu.in",
          regNo: "RA2111003010123",
          role: "student",
          isVerified: true,
          department: "Dept of ECE",
          internshipStatus: "regular",
          internshipCompany: "",
          domain: "Embedded Systems and IoT",
          cgpa: 9.2,
          skills: "Embedded C, RTOS, PCB Design, Python",
        };
        setStoredUser(u);
      } else {
        if (!u.department) u.department = "Dept of ECE";
        if (!u.internshipStatus) u.internshipStatus = "regular";
      }
      return u;
    }
  );

export const updateProfile = (data) =>
  withFallback(
    () => API.put("/auth/update-profile", data),
    () => {
      const u = { ...getStoredUser(), ...data };
      setStoredUser(u);
      return { message: "Profile updated successfully!", user: u };
    }
  );

export const resetPassword = (data) =>
  withFallback(
    () => API.post("/auth/reset-password", data),
    () => ({ message: "Password has been reset successfully!" })
  );

// --- PROJECT ROUTES ---
export const getAllProjects = () =>
  withFallback(
    () => API.get("/projects"),
    () => getStoredProjects()
  );

export const createProject = (data) =>
  withFallback(
    () => API.post("/projects", data),
    () => {
      const projects = getStoredProjects();
      const newP = {
        _id: "p_" + Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      };
      projects.unshift(newP);
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      return { message: "Project created successfully!", project: newP };
    }
  );

export const deleteProject = (id) =>
  withFallback(
    () => API.delete(`/projects/${id}`),
    () => {
      const projects = getStoredProjects().filter((p) => p._id !== id);
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      return { message: "Project deleted" };
    }
  );

export const getTeacherProjects = () =>
  withFallback(
    () => API.get("/projects/my-projects"),
    () => {
      const u = getStoredUser();
      const projects = getStoredProjects();
      if (u && u.email) {
        return projects.filter((p) => p.facultyEmail === u.email || p.facultyName?.includes(u.fullName));
      }
      return projects.slice(0, 3);
    }
  );

export const updateProject = (id, data) =>
  withFallback(
    () => API.put(`/projects/${id}`, data),
    () => {
      const projects = getStoredProjects().map((p) => (p._id === id ? { ...p, ...data } : p));
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      return { message: "Project updated", project: data };
    }
  );

// --- STUDENT & APPLICATION ROUTES ---
export const applyToProject = (data) =>
  withFallback(
    () => API.post("/student/apply", data),
    () => {
      const apps = JSON.parse(localStorage.getItem(STORAGE_KEY_APPLICATIONS) || "[]");
      const projects = getStoredProjects();
      const proj = projects.find((p) => p._id === data.projectId) || { projectTitle: "Selected Project", facultyName: "Faculty Guide" };
      const newApp = {
        _id: "app_" + Date.now(),
        projectId: data.projectId,
        projectTitle: proj.projectTitle,
        facultyName: proj.facultyName,
        priority: apps.length === 0 ? 1 : 2,
        status: "pending_faculty_approval",
        cohortTrack: data.cohortTrack || "regular",
        hasCrossBranch: data.hasCrossBranch || false,
        members: data.members || [],
        submittedAt: new Date().toISOString(),
      };
      apps.unshift(newApp);
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(apps));
      return { message: "Application submitted successfully to the faculty guide!", application: newApp };
    }
  );

export const getMyApplications = () =>
  withFallback(
    () => API.get("/student/my-applications"),
    () => {
      const stored = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // fallback
        }
      }
      const initialApps = [
        {
          _id: "app_init_1",
          projectId: "p1",
          projectTitle: "Autonomous Drone Swarm Navigation via Edge AI & ROS2",
          facultyName: "Dr. M. Sangeetha",
          priority: 1,
          status: "pending_faculty_approval",
          cohortTrack: "regular",
          members: [
            { studentId: "s1", name: "Aadyoth Sreeram", regNo: "RA2111003010001", department: "Dept of ECE", internshipStatus: "regular", status: "approved" },
            { studentId: "s2", name: "Riyan Kothari", regNo: "RA2111003010002", department: "Dept of ECE", internshipStatus: "regular", status: "approved" },
            { studentId: "s3", name: "Suhas Manjunath", regNo: "RA2111003010003", department: "Dept of ECE", internshipStatus: "regular", status: "approved" },
          ],
          hasCrossBranch: false,
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
        }
      ];
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(initialApps));
      return initialApps;
    }
  );

export const raiseChangeTicket = (ticketData) =>
  withFallback(
    () => API.post("/student/tickets", ticketData),
    () => {
      const tickets = JSON.parse(localStorage.getItem(STORAGE_KEY_TICKETS) || "[]");
      const ticketId = "TCK-" + Math.floor(1000 + Math.random() * 9000);
      const newTicket = {
        _id: "tck_" + Date.now(),
        ticketId,
        ...ticketData,
        status: "pending",
        progressStep: 1, // 1: Submitted, 2: Faculty Review, 3: HoD Approval, 4: Roster Updated
        createdAt: new Date().toISOString(),
        timeline: [
          { step: "Submitted", date: new Date().toISOString(), message: "Ticket created and dispatched to Department Coordinator." }
        ]
      };
      tickets.unshift(newTicket);
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
      return { message: `Ticket #${ticketId} submitted successfully! Your departmental coordinator will review the request.`, ticket: newTicket };
    }
  );

export const getStudentTickets = () =>
  withFallback(
    () => API.get("/student/tickets"),
    () => {
      const tickets = JSON.parse(localStorage.getItem(STORAGE_KEY_TICKETS) || "[]");
      if (tickets.length === 0) {
        const sampleTicket = {
          _id: "tck_demo_1",
          ticketId: "TCK-4821",
          applicationId: "app_init_1",
          projectTitle: "Autonomous Drone Swarm Navigation via Edge AI & ROS2",
          targetMember: { name: "Suhas Manjunath", regNo: "RA2111003010003", department: "Dept of ECE" },
          changeType: "name_correction",
          requestedChanges: {
            correctionField: "Official Name & Register No. Rectification",
            correctedName: "Suhas Manjunath",
            correctedRegNo: "RA2111003010003",
          },
          reason: "Official university register number spelling rectification from academic ERP.",
          status: "in_review",
          progressStep: 2,
          createdAt: new Date(Date.now() - 43200000).toISOString(),
          coordinatorRemarks: "Under verification with academic coordinator Dr. M. Sangeetha.",
          timeline: [
            { step: "Submitted", date: new Date(Date.now() - 43200000).toISOString(), message: "Ticket filed by group leader." },
            { step: "Faculty Review", date: new Date(Date.now() - 21600000).toISOString(), message: "Passed preliminary document verification." }
          ]
        };
        tickets.push(sampleTicket);
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
      }
      return tickets;
    }
  );

export const cancelTicket = (ticketId) =>
  withFallback(
    () => API.delete(`/student/tickets/${ticketId}`),
    () => {
      let tickets = JSON.parse(localStorage.getItem(STORAGE_KEY_TICKETS) || "[]");
      tickets = tickets.filter((t) => t._id !== ticketId && t.ticketId !== ticketId);
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
      return { message: "Ticket cancelled successfully." };
    }
  );

export const getApplicationsForProject = (projectId) =>
  withFallback(
    () => API.get(`/student/${projectId}`),
    () => [
      {
        _id: "app_1",
        projectId,
        teamLeader: { fullName: "Aadyoth Sreeram", regNo: "RA2111003010001", email: "aadyoth@srmist.edu.in" },
        members: [
          { fullName: "Riyan Kothari", regNo: "RA2111003010002" },
          { fullName: "Suhas Manjunath", regNo: "RA2111003010003" },
        ],
        status: "pending",
        appliedAt: new Date().toISOString(),
      },
    ]
  );

// --- NOTIFICATION / INVITATION ROUTES ---
export const getPendingInvitations = () =>
  withFallback(
    () => API.get("/student/invitations"),
    () => [
      {
        _id: "inv_1",
        projectTitle: "Autonomous Drone Swarm Navigation",
        senderName: "Aadyoth Sreeram",
        senderRegNo: "RA2111003010001",
        role: "Teammate",
        createdAt: new Date().toISOString(),
      },
    ]
  );

export const respondToInvitation = (data) =>
  withFallback(
    () => API.post("/student/invitations/respond", data),
    () => ({ message: `Invitation ${data.action}ed successfully!` })
  );

export const getNotifications = () =>
  withFallback(
    () => API.get("/notifications/me"),
    () => [
      {
        _id: "n1",
        title: "Global Deadline Reminder",
        message: "Final capstone project proposals must be submitted before the department deadline.",
        createdAt: new Date().toISOString(),
        read: false,
      },
      {
        _id: "n2",
        title: "Team Invitation Received",
        message: "You have been invited by Aadyoth Sreeram to join their team.",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        read: true,
      },
    ]
  );

export const deleteNotification = (id) =>
  withFallback(
    () => API.delete(`/notifications/${id}`),
    () => ({ message: "Notification deleted" })
  );

// --- USER SEARCH ROUTE ---
export const searchStudents = (name) =>
  withFallback(
    () => API.get(`/usersearch?q=${name}`),
    () => {
      const q = (name || "").toLowerCase();
      return mockStudents.filter(
        (s) => s.fullName.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q)
      );
    }
  );

// --- TEAM APPROVAL ROUTES ---
export const approveApplication = (id) =>
  withFallback(
    () => API.post(`/team-approved/approve/${id}`),
    () => ({ message: "Team application approved and locked in!" })
  );

export const rejectApplication = (id) =>
  withFallback(
    () => API.post(`/team-approved/reject/${id}`),
    () => ({ message: "Team application rejected." })
  );

export const getApprovedTeams = () =>
  withFallback(
    () => API.get(`/team-approved`),
    () => [
      {
        _id: "team_1",
        projectTitle: "Autonomous Drone Swarm Navigation",
        facultyName: "Dr. M. Sangeetha",
        members: [
          { fullName: "Aadyoth Sreeram", regNo: "RA2111003010001", email: "aadyoth@srmist.edu.in" },
          { fullName: "Riyan Kothari", regNo: "RA2111003010002", email: "riyan@srmist.edu.in" },
          { fullName: "Suhas Manjunath", regNo: "RA2111003010003", email: "suhas@srmist.edu.in" },
        ],
        status: "Approved",
      },
    ]
  );

export const removeTeamMember = (teamId, memberId) =>
  withFallback(
    () => API.delete(`/team-approved/${teamId}/members/${memberId}`),
    () => ({ message: "Team member removed" })
  );

export const searchStudentByRegNo = (regNo) =>
  withFallback(
    () => API.get(`/team-approved/search-student?regNo=${regNo}`),
    () => mockStudents.find((s) => s.regNo.toLowerCase() === (regNo || "").toLowerCase()) || null
  );

export const addTeamMember = (teamId, studentId) =>
  withFallback(
    () => API.post(`/team-approved/${teamId}/members`, { studentId }),
    () => ({ message: "Member added to team" })
  );

// --- INFO ROUTE ---
export const getStudentInfo = (studentId) =>
  withFallback(
    () => API.get(`/info/${studentId}`),
    () => mockStudents.find((s) => s._id === studentId) || mockStudents[0]
  );

// --- STATISTICS ROUTE ---
export const getStatistics = () =>
  withFallback(
    () => API.get("/statistics"),
    () => ({
      totalStudents: 2048,
      registeredTeams: 512,
      approvedTeams: 489,
      pendingApplications: 23,
      domainDistribution: [
        { domain: "Embedded Systems and IoT", count: 142 },
        { domain: "VLSI Design", count: 98 },
        { domain: "AI/ML/DL based applications", count: 125 },
        { domain: "Automation and Robotics", count: 64 },
        { domain: "Wireless Communication", count: 48 },
        { domain: "Biomedical Electronics", count: 35 },
      ],
      batchStats: {
        "2023-2027": { total: 1024, matched: 998 },
        "2022-2026": { total: 1024, matched: 1010 },
      },
    })
  );
