import React from "react";

/**
 * LoadingSpinner component recreating the Lottie animation "loading-WEOp0qe5kL":
 * 5 concentric rings of pulsating, rotating circular beads in vibrant Yellow and Blueish tones.
 * Each ring features its own distinct saturated hue to eliminate optical color blending/grey wash,
 * with orbital counter-rotations and traveling light-wave breathing pulses.
 * 100% lightweight SVG, GPU-accelerated 60 FPS, with zero external dependencies.
 */
export default function LoadingSpinner({
  size = "md",
  color = null, // If specified, applies monochromatic tint (with opacity gradients)
  text = "",
  fullScreen = false,
  className = "",
}) {
  // Dimension presets
  const sizeMap = {
    xs: 18,
    sm: 24,
    md: 48,
    lg: 72,
    xl: 96,
    "2xl": 120,
  };

  // When fullScreen, default to prominent size (96px) unless an explicit size was provided
  const pixelSize =
    typeof size === "number"
      ? size
      : fullScreen && size === "md"
      ? 96
      : sizeMap[size] || 48;

  // 5 concentric rings with pure, unmixed Yellow and Blueish tones
  // Rings have distinct radii and alternating orbital rotations
  const rings = [
    {
      radius: 42,
      dots: 22,
      dotR: 2.7,
      duration: 5.6,
      reverse: false,
      color: "#007DFF", // Electric Royal Blue
      opacity: 1.0,
    },
    {
      radius: 34,
      dots: 18,
      dotR: 2.5,
      duration: 4.8,
      reverse: true,
      color: "#FFC700", // Sunlight Gold Yellow
      opacity: 0.95,
    },
    {
      radius: 26,
      dots: 14,
      dotR: 2.3,
      duration: 4.0,
      reverse: false,
      color: "#00B4D8", // Cyan Sky Blue
      opacity: 0.9,
    },
    {
      radius: 18,
      dots: 10,
      dotR: 2.1,
      duration: 3.2,
      reverse: true,
      color: "#FF9E00", // Warm Honey Amber Yellow
      opacity: 0.85,
    },
    {
      radius: 10,
      dots: 6,
      dotR: 1.9,
      duration: 2.4,
      reverse: false,
      color: "#3A86FF", // Radiant Deep Indigo Blue
      opacity: 0.8,
    },
  ];

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center gap-3.5 ${className}`}>
      <style>
        {`
          @keyframes lottieRingOrbitCW {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes lottieRingOrbitCCW {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
          }
          @keyframes lottieDotBreathe {
            0%, 100% { transform: scale(0.85); opacity: 0.6; }
            50% { transform: scale(1.18); opacity: 1; }
          }
          @keyframes lottieCenterBead {
            0%, 100% { transform: scale(0.85); filter: drop-shadow(0 0 2px rgba(255, 199, 0, 0.4)); }
            50% { transform: scale(1.25); filter: drop-shadow(0 0 6px rgba(255, 199, 0, 0.9)); }
          }
        `}
      </style>

      <div
        style={{
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
        }}
        className="relative flex items-center justify-center flex-shrink-0"
        role="status"
        aria-label="Loading..."
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
        >
          {rings.map((ring, rIdx) => {
            const dots = [];
            for (let i = 0; i < ring.dots; i++) {
              const angle = (i * 2 * Math.PI) / ring.dots;
              const cx = 50 + ring.radius * Math.cos(angle);
              const cy = 50 + ring.radius * Math.sin(angle);
              const dotFill = color || ring.color;
              const delay = -((i / ring.dots) * 2).toFixed(2);

              dots.push(
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={ring.dotR}
                  fill={dotFill}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: `lottieDotBreathe 2.4s ease-in-out infinite`,
                    animationDelay: `${delay}s`,
                  }}
                  opacity={ring.opacity}
                />
              );
            }

            return (
              <g
                key={rIdx}
                style={{
                  transformBox: "view-box",
                  transformOrigin: "50px 50px",
                  animation: `${ring.reverse ? "lottieRingOrbitCCW" : "lottieRingOrbitCW"} ${
                    ring.duration
                  }s linear infinite`,
                }}
              >
                {dots}
              </g>
            );
          })}

          {/* Central Pulsating Golden Bead */}
          <circle
            cx={50}
            cy={50}
            r={2.6}
            fill={color || "#FFD000"}
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: "lottieCenterBead 1.8s ease-in-out infinite",
            }}
          />
        </svg>
      </div>

      {text && (
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <p className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wide">
            {text}
          </p>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md p-8 sm:p-12 rounded-3xl border-2 border-slate-900 shadow-2xl flex flex-col items-center max-w-sm w-full mx-auto">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return spinnerContent;
}
