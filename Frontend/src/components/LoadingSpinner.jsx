import React from "react";

/**
 * LoadingSpinner component inspired by the Lottie animation "loading-WEOp0qe5kL":
 * 5 concentric rings of pulsating, rotating circular beads in vibrant Yellow and Blueish tones.
 * Ultra-smooth, GPU-accelerated SVG with zero external dependencies and 60fps rendering.
 */
export default function LoadingSpinner({
  size = "md",
  color = null, // If null, renders in radiant yellow & blueish tones
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
  };

  const pixelSize = typeof size === "number" ? size : sizeMap[size] || 48;

  // 5 concentric rings with yellow and blueish tones
  // Alternating and orbital counter-rotations
  const rings = [
    {
      radius: 40,
      dots: 16,
      dotR: 2.8,
      duration: 3.2,
      reverse: false,
      colors: ["#007DFF", "#FFC700"], // Electric Blue & Sunlight Gold Yellow
      opacity: 1.0,
    },
    {
      radius: 31,
      dots: 12,
      dotR: 2.5,
      duration: 2.6,
      reverse: true,
      colors: ["#F59E0B", "#0284C7"], // Warm Amber Gold & Deep Sky Blue
      opacity: 0.9,
    },
    {
      radius: 22,
      dots: 8,
      dotR: 2.3,
      duration: 2.1,
      reverse: false,
      colors: ["#0EA5E9", "#FACC15"], // Cyan Blue & Bright Sun Yellow
      opacity: 0.82,
    },
    {
      radius: 14,
      dots: 6,
      dotR: 2.0,
      duration: 1.6,
      reverse: true,
      colors: ["#FFD000", "#2563EB"], // Radiant Yellow & Royal Indigo Blue
      opacity: 0.72,
    },
    {
      radius: 6,
      dots: 4,
      dotR: 1.8,
      duration: 1.2,
      reverse: false,
      colors: ["#38BDF8", "#F59E0B"], // Soft Sky Blue & Honey Yellow
      opacity: 0.65,
    },
  ];

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <style>
        {`
          @keyframes lottieConcentricSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes lottiePulseRing {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
          @keyframes lottieCenterPulse {
            0%, 100% { transform: scale(0.85); opacity: 0.75; }
            50% { transform: scale(1.25); opacity: 1; }
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
          style={{
            animation: "lottiePulseRing 3s ease-in-out infinite",
            transformOrigin: "50% 50%",
          }}
        >
          {rings.map((ring, rIdx) => {
            const dots = [];
            for (let i = 0; i < ring.dots; i++) {
              const angle = (i * 2 * Math.PI) / ring.dots;
              const cx = 50 + ring.radius * Math.cos(angle);
              const cy = 50 + ring.radius * Math.sin(angle);
              const dotColor = color
                ? color
                : ring.colors[i % ring.colors.length];

              dots.push(
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={ring.dotR}
                  fill={dotColor}
                  opacity={ring.opacity}
                />
              );
            }

            return (
              <g
                key={rIdx}
                style={{
                  transformOrigin: "50px 50px",
                  animation: `lottieConcentricSpin ${ring.duration}s linear infinite ${
                    ring.reverse ? "reverse" : "normal"
                  }`,
                }}
              >
                {dots}
              </g>
            );
          })}

          {/* Central Pulsing Bead (Yellow Core) */}
          <circle
            cx={50}
            cy={50}
            r={2.2}
            fill={color || "#FFD000"}
            style={{
              animation: "lottieCenterPulse 1.6s ease-in-out infinite",
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
      </div>

      {text && (
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
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
        <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl border-2 border-slate-900 shadow-2xl flex flex-col items-center">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return spinnerContent;
}
