import React, { useRef } from "react";

/*
  BrandLogo: Original mark for MegaMind_X
  - Left skew (skew-x-6)
  - Entrance animation (mmxFadeIn ~520ms)
  - Teal glow on hover (#22d3ee), adjustable via glowMode: "soft" | "medium" | "strong"
  - Optional parallax on hover (small tilt)
*/
export default function BrandLogo({ className = "", size = 22, label = "MegaMind_X", glowMode = "strong", parallax = true }) {
  const glowClass = {
    soft: "group-hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.35)] group-hover:scale-[1.03]",
    medium: "group-hover:drop-shadow-[0_0_14px_rgba(34,211,238,0.5)] group-hover:scale-[1.045]",
    strong: "group-hover:drop-shadow-[0_0_18px_rgba(34,211,238,0.7)] group-hover:scale-[1.06]",
  }[glowMode] || "";

  const wrapRef = useRef(null);
  const onMove = (e) => {
    if (!parallax) return;
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) / r.width; const dy = (e.clientY - cy) / r.height;
    el.style.transform = `skewX(-6deg) rotateY(${dx * 4}deg) rotateX(${dy * -4}deg)`;
  };
  const onLeave = () => { const el = wrapRef.current; if (el) el.style.transform = "skewX(-6deg)"; };

  return (
    <div
      ref={wrapRef}
      className={`group inline-flex items-center select-none -skew-x-6 ${className}`}
      aria-label={label}
      style={{ animation: "mmxFadeIn 520ms ease-out both" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={`mr-2 transition-[filter,transform] duration-300 ${glowClass}`}
        aria-hidden
      >
        <path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z" fill="#22d3ee" opacity="0.92" />
        <circle cx="12" cy="12" r="4.2" fill="currentColor" opacity="0.18" />
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