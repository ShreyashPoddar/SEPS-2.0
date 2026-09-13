import axios from "axios";

// Base API instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL.replace(/\/+$/, "").endsWith("/api")
        ? import.meta.env.VITE_API_URL.replace(/\/+$/, "")
        : `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/api`)
    : import.meta.env.DEV
    ? "http://localhost:3050/api"
    : "/api",
  withCredentials: true,
  // Allow up to 30s for remote TiDB serverless wake-up latency
  timeout: 30000,
});

// Offline demo mode. Off unless VITE_USE_MOCK=true is set explicitly, so a
// failing backend surfaces as an error instead of silently becoming fake data.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// --- In-Memory / LocalStorage Mock Database for offline & development demo ---
const STORAGE_KEY_USER = "seps_current_user";
const STORAGE_KEY_PROJECTS = "seps_projects";
const STORAGE_KEY_DEADLINE = "seps_deadline";
const STORAGE_KEY_APPLICATIONS = "seps_applications";
const STORAGE_KEY_TEAMS = "seps_teams";
const STORAGE_KEY_TICKETS = "seps_tickets";

const initialProjects = [];

const mockStudents = [
  { _id: "s1", fullName: "Aadyoth Sreeram", regNo: "RA2111003010001", email: "aadyoth@srmist.edu.in", role: "student", department: "Dept of ECE", internshipStatus: "regular", linkedinUrl: "https://linkedin.com/in/aadyoth", githubUrl: "https://github.com/aadyoth", cgpa: 9.4, skills: ["Embedded C", "RTOS", "Verilog"] },
  { _id: "s2", fullName: "Riyan Kothari", regNo: "RA2111003010002", email: "riyan@srmist.edu.in", role: "student", department: "Dept of ECE", internshipStatus: "regular", linkedinUrl: "https://linkedin.com/in/riyan-kothari", githubUrl: "https://github.com/RiyanKothari", cgpa: 9.2, skills: ["Python", "ROS2", "Robotics"] },
  { _id: "s3", fullName: "Suhas Manjunath", regNo: "RA2111003010003", email: "suhas@srmist.edu.in", role: "student", department: "Dept of ECE", internshipStatus: "regular", linkedinUrl: "https://linkedin.com/in/suhas", githubUrl: "https://github.com/suhas", cgpa: 9.0, skills: ["IoT", "ESP32", "Edge AI"] },
  { _id: "s4", fullName: "Priya Sharma", regNo: "RA2111003010004", email: "priya@srmist.edu.in", role: "student", department: "Dept of CSE", internshipStatus: "regular", linkedinUrl: "https://linkedin.com/in/priya", githubUrl: "https://github.com/priya", cgpa: 9.3, skills: ["Full Stack", "React", "NodeJS"] },
  { _id: "s5", fullName: "Aditya Verma", regNo: "RA2111003010005", email: "aditya@srmist.edu.in", role: "student", department: "Dept of CSE", internshipStatus: "internship", internshipCompany: "Qualcomm India", internshipDuration: "6 Months (Jan - Jun 2026)", linkedinUrl: "https://linkedin.com/in/aditya", githubUrl: "https://github.com/aditya", cgpa: 9.5, skills: ["PyTorch", "Deep Learning", "CUDA"] },
  { _id: "s6", fullName: "Ananya Iyer", regNo: "RA2111003010006", email: "ananya@srmist.edu.in", role: "student", department: "Dept of IT", internshipStatus: "internship", internshipCompany: "Amazon AWS", internshipDuration: "6 Months (Jan - Jun 2026)", linkedinUrl: "https://linkedin.com/in/ananya", githubUrl: "https://github.com/ananya", cgpa: 9.1, skills: ["Cloud Computing", "Golang", "Kubernetes"] },
  { _id: "s7", fullName: "Karthik Raja", regNo: "RA2111003010007", email: "karthik@srmist.edu.in", role: "student", department: "Dept of Mechanical", internshipStatus: "regular", linkedinUrl: "https://linkedin.com/in/karthik", githubUrl: "https://github.com/karthik", cgpa: 8.7, skills: ["SolidWorks", "CAD", "Robotics"] },
  { _id: "s8", fullName: "Sneha Reddy", regNo: "RA2111003010008", email: "sneha@srmist.edu.in", role: "student", department: "Dept of Biomedical", internshipStatus: "internship", internshipCompany: "Philips Healthcare", internshipDuration: "6 Months (Jan - Jun 2026)", linkedinUrl: "https://linkedin.com/in/sneha", githubUrl: "https://github.com/sneha", cgpa: 9.2, skills: ["Bio-Sensors", "MATLAB", "Signal Processing"] },
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
      return [];
    }
  }
  return [];
}

// Wrapper for resilient execution with mock fallback.
// The mock branch only runs when VITE_USE_MOCK=true. Without it, a network
// failure propagates to the caller's .catch so the UI shows a real error —
// masking these was hiding genuine backend outages behind plausible data.
async function withFallback(apiCall, mockResolver) {
  try {
    const res = await apiCall();
    return res;
  } catch (err) {
    const isNetworkFailure =
      !err.response ||
      err.code === "ERR_NETWORK" ||
      err.code === "ECONNABORTED" ||
      err.message?.includes("Network Error");

    if (isNetworkFailure && USE_MOCK) {
      console.warn(
        `[api] ${err.config?.method?.toUpperCase() || "REQUEST"} ${err.config?.url || "?"} failed (${err.code || "no response"}) — serving MOCK data because VITE_USE_MOCK=true`
      );
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
export const identifyUser = (data) =>
  withFallback(
    () => API.post("/auth/identify", data),
    () => {
      const id = (data.identifier || "").trim();
      const lower = id.toLowerCase();
      if (lower.startsWith("ra")) {
        return {
          role: "student",
          regNo: id.toUpperCase(),
          fullName: "SRM Student",
          message: "Please enter your password to continue.",
        };
      }
      return {
        role: "teacher",
        email: lower.includes("@") ? lower : `${lower}@srmist.edu.in`,
        fullName: "Faculty Member",
        hasPassword: true,
        message: "Please enter your password to continue.",
      };
    }
  );

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

export const loginUser = async (data) => {
  const res = await withFallback(
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

  if (res?.data?.role || res?.data?.user?.role) {
    setStoredUser(res.data.user || res.data);
  }
  return res;
};

export const logoutUser = async () => {
  try {
    const res = await withFallback(
      () => API.post("/auth/logout"),
      () => {
        setStoredUser(null);
        return { message: "Logged out" };
      }
    );
    return res;
  } finally {
    setStoredUser(null);
  }
};


export const getCurrentUser = async () => {
  try {
    const res = await withFallback(
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
    if (res?.data) {
      setStoredUser(res.data);
    }
    return res;
  } catch (err) {
    if (err.response?.status === 401) {
      setStoredUser(null);
    }
    throw err;
  }
};

export const isStudentProfileComplete = (user) => {
  if (!user || user.role !== "student") return true;
  if (!user.isProfileComplete) return false;

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

  const hasCgpa = user.cgpa !== null && user.cgpa !== undefined &&
    !isNaN(Number(user.cgpa)) && Number(user.cgpa) >= 0.01 && Number(user.cgpa) <= 10.00 &&
    CGPA_FORMAT_REGEX.test(String(user.cgpa).trim());
  const hasDept = Boolean(user.department && user.department.trim());
  const hasPic = Boolean(user.profilePic && isValidHttpUrl(user.profilePic.trim()));
  const hasLinkedin = Boolean(user.linkedinUrl && LINKEDIN_FORMAT_REGEX.test(user.linkedinUrl.trim()));
  const hasGithub = Boolean(user.githubUrl && GITHUB_FORMAT_REGEX.test(user.githubUrl.trim()));
  const hasResume = Boolean(user.resumeUrl && isValidHttpUrl(user.resumeUrl.trim()));

  const isCorporate = user.internshipStatus === "internship";
  const hasInternship = isCorporate
    ? Boolean(user.internshipCompany && user.internshipCompany.trim().length >= 2 && user.internshipDuration && user.internshipDuration.trim().length >= 2)
    : true;

  const cleanPhone = (user.phoneNumber || "").replace(/\D/g, "");
  const hasPhone = Boolean(
    user.phoneNumber &&
    cleanPhone.length >= 10 &&
    cleanPhone.length <= 14 &&
    /^[+]?[\d\s\-()]+$/.test(String(user.phoneNumber).trim())
  );

  return hasCgpa && hasDept && hasPhone && hasPic && hasLinkedin && hasGithub && hasResume && hasInternship;
};

export const updateProfile = (data) =>
  withFallback(
    () => API.put("/auth/update-profile", {
      ...data,
      isProfileComplete: data.isProfileComplete !== undefined ? data.isProfileComplete : (Number(data.cgpa) > 0),
    }),
    () => {
      const current = getStoredUser() || {};
      const hasInternship = Boolean(
        (data.internshipCompany && data.internshipCompany.trim().length > 0) ||
        (data.internships && Array.isArray(data.internships) && data.internships.length > 0)
      );
      const computedStatus = data.internshipStatus || (hasInternship ? "internship" : "regular");
      const isComplete = data.isProfileComplete !== undefined ? data.isProfileComplete : (Number(data.cgpa) > 0);
      const u = { ...current, ...data, internshipStatus: computedStatus, isProfileComplete: isComplete };
      setStoredUser(u);
      return { message: "Profile updated successfully!", user: u };
    }
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

export const cancelPendingApplication = (applicationId) =>
  withFallback(
    () => API.delete(`/student/applications/${applicationId}`),
    () => {
      let apps = JSON.parse(localStorage.getItem(STORAGE_KEY_APPLICATIONS) || "[]");
      apps = apps.filter((a) => a._id !== applicationId && a.id !== applicationId);
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(apps));
      return { message: "Application cancelled successfully." };
    }
  );


// --- FACULTY TICKET REVIEW ---
export const getFacultyTickets = () =>
  withFallback(
    () => API.get("/tickets"),
    () => []
  );

// action: "review" | "approve" | "reject"
export const actOnTicket = (ticketId, action, remarks) =>
  withFallback(
    () => API.put(`/tickets/${ticketId}`, { action, remarks }),
    () => ({ message: `Ticket ${action} recorded locally (offline demo mode).` })
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
    // Shape must match the backend: { success, notifications }, with `type`
    // driving the icon and `isRead` rather than `read`.
    () => ({
      success: true,
      notifications: [
        {
          _id: "n1",
          title: "Global Deadline Reminder",
          message: "Final major project proposals must be submitted before the department deadline.",
          type: "info",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "n2",
          title: "Project Application Approved",
          message: "Your application for project \"Autonomous Drone Swarm Navigation\" has been approved.",
          type: "success",
          isRead: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    })
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
    // Shape must match the backend: { teams: [...] }, each member carrying a
    // populated `studentId` object — MyTeams.jsx reads member.studentId._id.
    () => ({
      teams: [
        {
          _id: "team_1",
          projectTitle: "Autonomous Drone Swarm Navigation",
          facultyName: "Dr. M. Sangeetha",
          members: mockStudents.slice(0, 3).map((s) => ({
            _id: `tm_${s._id}`,
            name: s.fullName,
            regNo: s.regNo,
            studentId: { _id: s._id, fullName: s.fullName, email: s.email, regNo: s.regNo, department: s.department },
          })),
          status: "Approved",
        },
      ],
    })
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
    // Keys must match backend/controllers/statistics.controller.js — the old
    // mock returned totalStudents/domainDistribution/batchStats, none of which
    // StatisticsReport.jsx reads, so every figure rendered as undefined.
    () => ({
      teacherCount: 24,
      studentCount: 2048,
      projectCount: 132,
      applicationCount: 512,
      groupCount: 489,
      individualCount: 23,
      teachersWithProjects: [
        { name: "Dr. M. Sangeetha", email: "sangeetm@srmist.edu.in", projects: ["Autonomous Drone Swarm Navigation"] },
      ],
      teachersWithoutProjects: [
        { name: "Dr. K. Vadivukkarasi", email: "vadivukk@srmist.edu.in" },
      ],
      studentsWithApplications: mockStudents.slice(0, 3).map((s) => ({ name: s.fullName, email: s.email, regNo: s.regNo })),
      studentsWithoutApplications: mockStudents.slice(3).map((s) => ({ name: s.fullName, email: s.email, regNo: s.regNo })),
      groupDetails: [
        {
          projectTitle: "Autonomous Drone Swarm Navigation",
          teacherName: "Dr. M. Sangeetha",
          students: mockStudents.slice(0, 3).map((s) => ({ name: s.fullName, regNo: s.regNo })),
        },
      ],
    })
  );
