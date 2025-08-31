import React from "react";

/*
  BrandLogo: Original mark for MegaMind_X
  - Left skew
  - Subtle entrance animation
  - Teal glow on hover
*/
export default function BrandLogo({ className = "", size = 22 }) {
  return (
    <div
      className={`group inline-flex items-center select-none -skew-x-6 ${className}`}
      style={{
        animation: "mmxFadeIn 700ms ease-out both",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="mr-2 drop-shadow-[0_0_0_rgba(0,0,0,0)] group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-[filter,transform] duration-300"
        aria-hidden
      >
        {/* Cyan seed spark */}
        <path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z" fill="#22d3ee" opacity="0.85" />
        {/* Inner cutout */}
        <circle cx="12" cy="12" r="4.2" fill="currentColor" opacity="0.15" />
      </svg>
      <div className="tracking-tight font-extrabold">
        <span className="text-cyan-500">Mega</span>
        <span className="text-foreground">Mind</span>
        <span className="text-cyan-500">_X</span>
      </div>
      <style>{`
        @keyframes mmxFadeIn { from { opacity: 0; transform: translateY(-6px) skewX(-6deg);} to { opacity: 1; transform: translateY(0) skewX(-6deg);} }
      `}</style>
    </div>
  );
}