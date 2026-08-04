import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Sparkles, Volume2, VolumeX, RotateCcw, ArrowRight, Award, GraduationCap, Users } from "lucide-react";
import { playSnipSound, playFanfareSound } from "../utils/audioFx";

export default function RibbonCeremony({ onComplete }) {
  const [isCut, setIsCut] = useState(false);
  const [isCuttingAnim, setIsCuttingAnim] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pressedKey, setPressedKey] = useState(false);
  const canvasRef = useRef(null);

  // Embedded Canvas Confetti Engine (zero dependency fallback + full support)
  const launchCanvasParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#fbbf24", "#ef4444", "#ffffff", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#ffd700"];
    const particles = [];

    // Create 180 confetti particles
    for (let i = 0; i < 180; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI / 2; // Spray upwards
      const speed = Math.random() * 22 + 8;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 12,
        vy: Math.sin(angle) * speed - Math.random() * 10,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 15,
        gravity: 0.35,
        drag: 0.98,
        opacity: 1,
        shape: Math.random() > 0.4 ? "rect" : "circle",
      });
    }

    let animationFrame;
    const startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach((p) => {
        if (p.opacity <= 0) return;
        aliveCount++;

        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rSpeed;
        
        if (Date.now() - startTime > 2500) {
          p.opacity -= 0.015;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      if (aliveCount > 0 && Date.now() - startTime < 4500) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();

    // Also attempt external canvas-confetti library if installed
    import("canvas-confetti")
      .then((m) => {
        const confetti = m.default;
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.45 } });
      })
      .catch(() => {});

  }, []);

  // Handle cutting action
  const handleCutRibbon = useCallback(() => {
    if (isCut || isCuttingAnim) return;

    setIsCuttingAnim(true);

    if (soundEnabled) {
      playSnipSound();
    }

    // Snip animation timing
    setTimeout(() => {
      setIsCut(true);
      setIsCuttingAnim(false);

      if (soundEnabled) {
        playFanfareSound();
      }

      launchCanvasParticles();

      if (onComplete) {
        onComplete();
      }
    }, 550);
  }, [isCut, isCuttingAnim, soundEnabled, launchCanvasParticles, onComplete]);

  // Keyboard shortcut listener (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setPressedKey(true);
        handleCutRibbon();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space" || e.key === " ") {
        setPressedKey(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleCutRibbon]);

  // Handle window resize for canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset ribbon
  const handleReset = () => {
    setIsCut(false);
    setIsCuttingAnim(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden font-sans select-none">
      
      {/* Fullscreen Canvas for Confetti */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-50 w-full h-full"
      />

      {/* Background ambient lights & radial glowing textures */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(185,28,28,0.22),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_75%,rgba(217,119,6,0.15),transparent_60%)] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-red-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              ECHO Inauguration 2026
            </h2>
            <p className="text-xs text-slate-400">SEPS 2.0 - The Ultimate Project Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mute / Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition shadow-sm"
            title={soundEnabled ? "Mute ceremony sound" : "Enable sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span>{soundEnabled ? "Audio On" : "Audio Muted"}</span>
          </button>

          {/* Reset / Re-tie Ribbon Button */}
          {isCut && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-tie Ribbon</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-6">
        
        {/* Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold tracking-wider uppercase mb-3 shadow-lg shadow-red-900/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>ECHO Inauguration 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3"
          >
            ECHO Inauguration 2026 <br />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              SEPS 2.0 - The Ultimate Project Portal
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto"
          >
            {isCut
              ? "The ribbon has been cut! Welcome to SEPS 2.0 - The Ultimate Project Portal."
              : "Press the Spacebar or click the scissors to cut the inaugural ribbon and launch SEPS 2.0!"}
          </motion.p>
        </div>

        {/* RIBBON & SCISSORS CONTAINER */}
        <div className="relative w-full max-w-5xl h-60 sm:h-72 my-2 flex items-center justify-center">
          
          {/* UNVEILED PORTAL CARD (Appears when ribbon is cut) */}
          <AnimatePresence>
            {isCut && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 25 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, type: "spring", stiffness: 120 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-900/90 border border-amber-500/40 rounded-3xl backdrop-blur-xl shadow-2xl shadow-amber-500/10 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-amber-400/50 flex items-center justify-center mb-4 text-amber-300 shadow-inner">
                  <Award className="w-8 h-8 text-amber-400 animate-bounce" />
                </div>
                <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent mb-2">
                  🚀 SEPS 2.0 IS OFFICIALLY LIVE!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mb-6 leading-relaxed">
                  Welcome to <strong className="text-amber-300 font-semibold">ECHO Inauguration 2026</strong>. Empowering student innovators, faculty advisors, and engineering excellence across the platform.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <a
                    href="/login"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/30 transition transform hover:-translate-y-0.5"
                  >
                    <span>Proceed to Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <a
                    href="/signup"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-sm transition"
                  >
                    <span>Register Account</span>
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* RIBBON HALF PIECES & SCISSORS */}
          <AnimatePresence>
            {!isCut && (
              <div className="absolute inset-x-0 z-20 flex items-center justify-center pointer-events-none">
                
                {/* Left Ribbon Piece */}
                <motion.div
                  initial={false}
                  animate={
                    isCuttingAnim
                      ? { x: "-100%", rotate: -35, y: 160, opacity: 0 }
                      : { x: 0, rotate: 0, y: 0, opacity: 1 }
                  }
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="w-1/2 h-16 sm:h-20 bg-gradient-to-r from-red-900 via-red-600 to-red-700 border-y-4 border-amber-300/90 shadow-2xl relative flex items-center justify-start px-8 origin-left"
                >
                  <div className="h-0.5 w-full bg-amber-200/40 absolute top-2 left-0" />
                  <div className="h-0.5 w-full bg-amber-200/40 absolute bottom-2 left-0" />
                  <span className="text-amber-200 font-serif text-xs sm:text-sm tracking-widest uppercase font-bold drop-shadow">
                    ★ ECHO INAUGURATION 2026 ★
                  </span>
                </motion.div>

                {/* Right Ribbon Piece */}
                <motion.div
                  initial={false}
                  animate={
                    isCuttingAnim
                      ? { x: "100%", rotate: 35, y: 160, opacity: 0 }
                      : { x: 0, rotate: 0, y: 0, opacity: 1 }
                  }
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="w-1/2 h-16 sm:h-20 bg-gradient-to-r from-red-700 via-red-600 to-red-900 border-y-4 border-amber-300/90 shadow-2xl relative flex items-center justify-end px-8 origin-right"
                >
                  <div className="h-0.5 w-full bg-amber-200/40 absolute top-2 left-0" />
                  <div className="h-0.5 w-full bg-amber-200/40 absolute bottom-2 left-0" />
                  <span className="text-amber-200 font-serif text-xs sm:text-sm tracking-widest uppercase font-bold drop-shadow">
                    ★ SEPS 2.0 - ULTIMATE PORTAL ★
                  </span>
                </motion.div>

                {/* CENTER BOW & GOLD CREST */}
                <motion.div
                  animate={
                    isCuttingAnim
                      ? { scale: 0, rotate: 180, opacity: 0 }
                      : { scale: 1, rotate: 0, opacity: 1 }
                  }
                  transition={{ duration: 0.4 }}
                  className="absolute z-30 flex items-center justify-center pointer-events-auto cursor-pointer"
                  onClick={handleCutRibbon}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-12 bg-red-600 rounded-full border-2 border-amber-300 shadow-xl transform -rotate-12 -mr-3" />
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 border-4 border-amber-100 shadow-2xl flex items-center justify-center z-10 hover:scale-105 transition">
                      <div className="w-12 h-12 rounded-full bg-red-800 border border-amber-300 flex items-center justify-center text-amber-300 font-bold text-xs">
                        2026
                      </div>
                    </div>
                    <div className="w-16 h-12 bg-red-600 rounded-full border-2 border-amber-300 shadow-xl transform rotate-12 -ml-3" />
                  </div>
                </motion.div>

                {/* ANIMATED GOLDEN SCISSORS */}
                <motion.div
                  initial={{ y: -65, opacity: 0.9 }}
                  animate={
                    isCuttingAnim
                      ? { y: 0, scale: 1.3, rotate: [-20, 0, -25, 0] }
                      : { y: [-60, -48, -60], opacity: 1 }
                  }
                  transition={
                    isCuttingAnim
                      ? { duration: 0.5 }
                      : { repeat: Infinity, duration: 2, ease: "easeInOut" }
                  }
                  className="absolute z-40 text-amber-300 filter drop-shadow-[0_12px_15px_rgba(0,0,0,0.6)] pointer-events-auto cursor-pointer"
                  onClick={handleCutRibbon}
                  title="Click or press Spacebar to cut!"
                >
                  <div className="bg-slate-900/90 border-2 border-amber-400 rounded-full p-3.5 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition">
                    <Scissors className={`w-9 h-9 ${isCuttingAnim ? "animate-spin text-amber-400" : ""}`} />
                  </div>
                </motion.div>

              </div>
            )}
          </AnimatePresence>
        </div>

        {/* SPACEBAR PROMPT BUTTON */}
        {!isCut && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex flex-col items-center gap-3"
          >
            <button
              onClick={handleCutRibbon}
              className={`group relative inline-flex items-center gap-3 p-[2px] rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 shadow-2xl shadow-red-900/50 hover:shadow-red-500/40 transition transform hover:-translate-y-0.5 active:translate-y-0 ${
                pressedKey ? "scale-95" : ""
              }`}
            >
              <div className="bg-slate-950 hover:bg-slate-900 rounded-[14px] px-7 py-3.5 flex items-center gap-3 text-white transition">
                <Scissors className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition duration-300" />
                <span className="font-bold text-sm tracking-wide">
                  PRESS <kbd className="mx-1 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-amber-300 font-mono text-xs shadow-inner">SPACEBAR</kbd> TO CUT RIBBON
                </span>
              </div>
            </button>

            <p className="text-xs text-slate-500">
              Or click anywhere on the scissors / ribbon
            </p>
          </motion.div>
        )}

        {/* FEATURE CARDS */}
        <div className="w-full max-w-4xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Student Portal</h4>
              <p className="text-xs text-slate-400">Team registration & project submissions</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Faculty Portal</h4>
              <p className="text-xs text-slate-400">Advisor approvals & evaluations</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Analytics & Deadlines</h4>
              <p className="text-xs text-slate-400">Real-time reports & statistics</p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        © 2026 ECHO Inauguration 2026 • SEPS 2.0 - The Ultimate Project Portal
      </footer>
    </div>
  );
}
