import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import Login from "./pages/Login.jsx";
import StudentDashboard from "./pages/StudentDahboard.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import StudentProfile from "./pages/StudentProfile.jsx";
import TeacherProfile from "./pages/TeacherProfile.jsx";
import TeacherApplications from "./pages/TeacherApplications.jsx";
import UpdateProject from "./pages/UpdateProject.jsx";
import Notifications from "./pages/Notifications.jsx";
import MyTeams from "./pages/MyTeams.jsx";
import SetGlobalDeadline from "./pages/SetGlobalDeadline.jsx";
import StatisticsReport from "./pages/StatisticsReport.jsx";
import TeacherTickets from "./pages/TeacherTickets.jsx";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import { getCurrentUser } from "./api";

// Wrapper to inject user prop from getCurrentUser API
function SetGlobalDeadlineWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCurrentUser()
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen text="Verifying Coordinator Authorization..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <SetGlobalDeadline user={user} />;
}

export default function App() {
  // Automatically recover if page is restored from browser Back-Forward Cache (bfcache)
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />

          {/* Student Routes */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-profile" element={<StudentProfile />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Teacher Routes */}
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher-profile" element={<TeacherProfile />} />
          <Route
            path="/teacher/applications/:id"
            element={<TeacherApplications />}
          />
          <Route
            path="/teacher/project-applications/:id"
            element={<TeacherApplications />}
          />
          <Route
            path="/teacher/update-project/:projectId"
            element={<UpdateProject />}
          />
          <Route path="/teacher/my-teams" element={<MyTeams />} />
          <Route path="/teacher/set-global-deadline" element={<SetGlobalDeadlineWrapper />} />
          <Route path="/teacher/statistics-report" element={<StatisticsReport />} />
          <Route path="/teacher/tickets" element={<TeacherTickets />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#090d16",
            color: "#f8fafc",
            borderRadius: "14px",
            padding: "12px 18px",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          },
          error: {
            iconTheme: {
              primary: "#f43f5e",
              secondary: "#ffffff",
            },
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#ffffff",
            },
          },
        }}
      />
    </Router>
  );
}