"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ACCENT = "#00E5A0";
const BG = "#0A0E17";

export default function AlliancePage() {
  const router = useRouter();
  const [knocks, setKnocks] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [shieldPulse, setShieldPulse] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const rippleId = useRef(0);

  // Show hint after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // After unlock, redirect to /partners
  useEffect(() => {
    if (unlocked) {
      const t = setTimeout(() => router.push("/partners"), 2200);
      return () => clearTimeout(t);
    }
  }, [unlocked, router]);

  const handleKnock = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleId.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 800);

    setShieldPulse(true);
    setTimeout(() => setShieldPulse(false), 300);

    const next = knocks + 1;
    setKnocks(next);
    if (next >= 3) {
      setTimeout(() => setUnlocked(true), 400);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        userSelect: "none",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}08 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          transition: "all 1s ease",
          opacity: unlocked ? 1 : 0.4,
        }}
      />

      {/* Shield / knock target */}
      <div
        onClick={handleKnock}
        style={{
          position: "relative",
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: unlocked
            ? `radial-gradient(circle, ${ACCENT}30, ${ACCENT}10)`
            : "rgba(255,255,255,0.03)",
          border: `2px solid ${unlocked ? ACCENT : "rgba(255,255,255,0.08)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.6s cubic-bezier(.4,0,.2,1)",
          transform: shieldPulse ? "scale(0.93)" : unlocked ? "scale(1.1)" : "scale(1)",
          boxShadow: unlocked
            ? `0 0 60px ${ACCENT}40, 0 0 120px ${ACCENT}15`
            : knocks > 0
            ? `0 0 ${knocks * 15}px ${ACCENT}${knocks * 10}`
            : "none",
          overflow: "hidden",
        }}
      >
        {/* Ripples */}
        {ripples.map((r) => (
          <div
            key={r.id}
            style={{
              position: "absolute",
              left: r.x - 20,
              top: r.y - 20,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `2px solid ${ACCENT}`,
              animation: "rippleOut 0.8s ease-out forwards",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Shield icon */}
        <svg
          width={unlocked ? 56 : 48}
          height={unlocked ? 56 : 48}
          viewBox="0 0 24 24"
          fill="none"
          stroke={unlocked ? ACCENT : "rgba(255,255,255,0.25)"}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "all 0.6s ease" }}
        >
          {unlocked ? (
            // Unlocked shield with check
            <>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" stroke={ACCENT} strokeWidth={2} />
            </>
          ) : (
            // Locked shield
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          )}
        </svg>
      </div>

      {/* Progress dots */}
      {!unlocked && (
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: knocks > i ? ACCENT : "rgba(255,255,255,0.1)",
                border: `1px solid ${knocks > i ? ACCENT : "rgba(255,255,255,0.15)"}`,
                transition: "all 0.3s ease",
                boxShadow: knocks > i ? `0 0 8px ${ACCENT}60` : "none",
              }}
            />
          ))}
        </div>
      )}

      {/* Text */}
      <div style={{ marginTop: 32, textAlign: "center" }}>
        {unlocked ? (
          <div style={{ animation: "fadeUp 0.6s ease forwards" }}>
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: ACCENT,
                margin: "0 0 8px",
                letterSpacing: -0.5,
              }}
            >
              Access Granted
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>
              Entering the Alliance...
            </p>
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                margin: "0 0 8px",
                letterSpacing: -0.3,
              }}
            >
              {knocks === 0
                ? "You found something..."
                : knocks === 1
                ? "Keep going..."
                : "One more..."}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.2)",
                margin: 0,
                transition: "opacity 0.5s ease",
                opacity: showHint ? 1 : 0,
              }}
            >
              knock knock knock
            </p>
          </>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes rippleOut {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
