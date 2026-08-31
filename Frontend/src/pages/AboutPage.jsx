import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";
import {
  Users,
  BookOpen,
  Calendar,
  ShieldCheck,
  Award,
  GraduationCap,
  FileSpreadsheet
} from "lucide-react";

export default function AboutPage() {
  const features = [
    {
      icon: Users,
      title: "Registration Number Teammate Matchmaking",
      desc: "Search classmates across sections by their official SRM register number. Evaluate complementary technical skills, domain interests, and form balanced teams without chaotic messaging threads."
    },
    {
      icon: BookOpen,
      title: "Faculty Research & Capstone Proposals",
      desc: "Faculty guides publish specialized research initiatives, laboratory prerequisites, and team vacancies directly on the central portal for students to browse and apply."
    },
    {
      icon: Calendar,
      title: "Synchronized Global Deadlines",
      desc: "Centralized department countdown timers enforce timely milestone submissions for team registration, project proposals, and review phase deliverables."
    },
    {
      icon: ShieldCheck,
      title: "Zero-Collision Allocation & Lock-in",
      desc: "Automated verification ensures students cannot be part of multiple approved project applications simultaneously, maintaining absolute fairness across the entire department."
    },
    {
      icon: FileSpreadsheet,
      title: "Department Statistics & Dossier Exports",
      desc: "Academic coordinators can instantly monitor project allocation metrics, domain distributions, and generate one-click official PDF dossiers for university records."
    },
    {
      icon: Award,
      title: "Real-Time Application Status Lifecycle",
      desc: "Transparent status indicators (Pending, Under Review, Approved) keep both student team members and faculty mentors aligned at every step."
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Register & Profile Setup",
      desc: "Log in with your university credentials and specify your SRM register number, department, domain interests, and primary technical skillsets."
    },
    {
      step: "02",
      title: "Assemble or Join a Team",
      desc: "Search for peers by registration number, send instant in-app invitations, and confirm all members prior to applying for a project."
    },
    {
      step: "03",
      title: "Submit Project Proposal",
      desc: "Browse faculty research proposals across 30+ engineering tracks and submit your team's application before the global deadline."
    },
    {
      step: "04",
      title: "Faculty Approval & Execution",
      desc: "Faculty advisors evaluate applicant teams and approve the project, locking in the allocation for capstone reviews and final grading."
    }
  ];

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 overflow-x-hidden selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* Background Sliced Waves */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-40">
        <SlicedWaves
          color1="#ffea43"
          color2="#007dff"
          color3="#0f001e"
          columns={14}
          rows={8}
          barThickness={0.1}
          speed={0.25}
          travel={0.7}
          waveSpread={0.9}
          rowOffset={1}
          softness={0.05}
          glow={0}
          brightness={1}
          contrast={1}
          opacity={0.35}
          orientation="horizontal"
          alternate={false}
          grain
          grainIntensity={0.05}
          mouseInteraction={false}
        />
      </div>

      {/* 🌟 Floating Light Glassmorphic Header */}
      <header className="relative z-20 w-full px-4 sm:px-6 pt-5 sm:pt-6">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 rounded-2xl bg-white/70 backdrop-blur-2xl backdrop-saturate-150 border-2 border-black shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]"
        >
          {/* Logo + Divider + SEPS 2.0 */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-3">
              <img
                src={srmLogo}
                alt="SRM IST Logo"
                className="h-8 sm:h-9 w-auto object-contain transition"
              />
              <span className="text-slate-400 font-light text-xl sm:text-2xl select-none leading-none">
                |
              </span>
              <span className="font-extrabold text-xl sm:text-2xl text-slate-950 tracking-tight leading-none">
                SEPS 2.0
              </span>
            </motion.div>
          </Link>

          {/* Nav Items & Action Button */}
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="flex items-center gap-5 sm:gap-6 text-sm font-semibold text-slate-700">
              <motion.div whileHover={{ y: -1 }}>
                <Link to="/about" className="text-black font-extrabold transition">
                  About
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -1 }}>
                <Link to="/signup" className="hover:text-black transition">
                  Sign up
                </Link>
              </motion.div>
            </nav>

            <div className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  to="/login"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-black hover:bg-slate-800 border-2 border-black rounded-full transition-colors shadow-md block"
                >
                  Log in
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* 🚀 Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/80 backdrop-blur-md border-2 border-black text-xs font-bold text-slate-900 shadow-sm cursor-default"
          >
            <GraduationCap className="w-4 h-4 text-black" />
            <span>ABOUT SEPS 2.0 • STUDENT ENGINEERING PROJECT SYSTEM</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight"
          >
            Empowering Collaborative Engineering & Capstone Excellence.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium"
          >
            SEPS 2.0 is the official project allocation and teammate matching platform designed to streamline the academic engineering project lifecycle for university students, faculty guides, and departmental coordinators.
          </motion.p>
        </div>

        {/* 🛡️ Core Platform Pillars Grid with Motion Hover */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Why SEPS 2.0 Was Built
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
              Replacing scattered spreadsheets and disconnected communication with structured transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ type: "spring", stiffness: 350, damping: 20 }}
                  className="p-6 rounded-2xl bg-white/85 backdrop-blur-xl border-2 border-black shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex flex-col justify-between cursor-default"
                >
                  <div>
                    <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center mb-4 border border-black shadow-sm">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-950 mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 🔄 The 4-Step Capstone Workflow */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white/75 backdrop-blur-xl border-2 border-black shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-extrabold uppercase tracking-wider text-black bg-slate-100 border border-black px-3 py-1 rounded-full">
              Streamlined Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-3 tracking-tight">
              How the Project Lifecycle Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.04, y: -3 }}
                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                className="p-5 rounded-2xl bg-white/90 border-2 border-black shadow-sm flex flex-col justify-between cursor-default"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-black text-white font-extrabold text-xs flex items-center justify-center mb-3">
                    {item.step}
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 🚀 Bottom CTA Banner */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="text-center p-8 sm:p-12 rounded-3xl bg-slate-950 text-white border-2 border-black shadow-2xl space-y-6"
        >
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Build Your Engineering Breakthrough?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join fellow engineers and faculty advisors already collaborating on SEPS 2.0.
          </p>
          <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
              <Link
                to="/signup"
                className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-black bg-white hover:bg-slate-100 border-2 border-black shadow-lg transition block"
              >
                Get started
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
              <Link
                to="/login"
                className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 transition block"
              >
                Sign in to account
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-600 font-semibold border-t border-slate-200/80 bg-white/70 backdrop-blur-md">
        © {new Date().getFullYear()} SRM Institute of Science and Technology • Student Engineering Project System (SEPS 2.0)
      </footer>
    </div>
  );
}
