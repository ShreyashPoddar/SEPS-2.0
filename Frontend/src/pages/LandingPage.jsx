import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SlicedWaves from "../components/SlicedWaves";
import srmLogo from "../assets/SRM_Institute_of_Science_and_Technology_Logo.svg.png";

export default function LandingPage() {
  return (
    <div className="relative w-screen h-screen min-h-screen bg-white text-slate-900 overflow-hidden flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Background Sliced Waves (Soft high-contrast wave ripple on white) */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-auto">
        <SlicedWaves
          color1="#ffea43"
          color2="#007dff"
          color3="#0f001e"
          columns={14}
          rows={8}
          barThickness={0.1}
          speed={0.35}
          travel={0.7}
          waveSpread={0.9}
          rowOffset={1}
          softness={0.05}
          glow={0}
          brightness={1}
          contrast={1}
          opacity={0.4}
          orientation="horizontal"
          alternate={false}
          grain
          grainIntensity={0.05}
          mouseInteraction
          mouseStrength={1}
          mouseRadius={0.3}
        />
      </div>

      {/* 🌟 Floating Light Glassmorphic Header / Toolbar with Motion */}
      <header className="relative z-20 w-full px-4 sm:px-6 pt-5 sm:pt-6">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 rounded-2xl bg-white/35 backdrop-blur-2xl backdrop-saturate-150 border-2 border-black shadow-[0_8px_32px_0_rgba(0,0,0,0.12)]"
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
              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}>
                <Link to="/about" className="hover:text-black transition">
                  About
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}>
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

      {/* 🚀 Hero Section with Framer Motion */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-4xl mx-auto py-12">
        {/* Centered Light Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ scale: 1.03, y: -2 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/40 backdrop-blur-2xl backdrop-saturate-150 border-2 border-black shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-slate-800 text-xs sm:text-sm font-medium mb-8 cursor-default"
        >
          <span className="bg-black text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-black">
            NEW
          </span>
          <span className="text-slate-900 font-bold">
            SEPS 2.0 • Unified Project Portal
          </span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-950 leading-[1.12] sm:leading-[1.12]"
        >
          Find teammates, build projects, <br className="hidden sm:block" />
          and innovate together.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mt-6 text-sm sm:text-base md:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed font-medium"
        >
          The centralized platform for SRM engineering students to discover project partners, match skillsets, and connect with faculty mentors seamlessly.
        </motion.p>

        {/* CTA Motion Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.4 }}
          className="mt-8 sm:mt-10 flex flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link
              to="/signup"
              className="px-7 py-3 rounded-full text-sm sm:text-base font-bold text-white bg-black hover:bg-slate-800 border-2 border-black shadow-xl shadow-black/10 transition-colors block"
            >
              Get started
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link
              to="/about"
              className="px-7 py-3 rounded-full text-sm sm:text-base font-bold text-black bg-white/40 hover:bg-white/70 border-2 border-black backdrop-blur-2xl backdrop-saturate-150 shadow-md transition-colors block"
            >
              Learn more
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* Subtle Bottom Footprint */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-600 font-semibold pointer-events-none">
        © {new Date().getFullYear()} SRM Institute of Science and Technology • Student Engineering Project System
      </footer>
    </div>
  );
}
