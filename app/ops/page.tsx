"use client";

import { useState, useEffect, useCallback } from "react";

const ACCENT = "#00E5A0";
const BG = "#0A0E17";
const CARD_BG = "rgba(17,24,39,0.7)";
const BORDER = "#1F2937";
const TEXT = "#E5E7EB";
const TEXT_DIM = "#9CA3AF";
const FONT = "'Inter', -apple-system, sans-serif";

const GRADE_COLORS: Record<string, string> = {
  A: "#00E5A0",
  B: "#3B82F6",
  C: "#FBBF24",
  D: "#F97316",
  F: "#FF4D6A",
  "N/A": "#6B7280",
};

const AGENTS = [
  { name: "The General", role: "conductor", id: "fe0f1a80" },
  { name: "Ghostwriter", role: "composer", id: "ef0d69ef" },
  { name: "The Closer", role: "followup", id: "7ca8f5f9" },
  { name: "Night Owl", role: "overnight", id: "da552375" },
  { name: "The Spy", role: "intelmon", id: "032a0ecd" },
  { name: "Pulse Check", role: "analytics", id: "a6018f49" },
  { name: "War Room", role: "debrief", id: "ce25ce87" },
  { name: "Thread Sniper", role: "prospector", id: "949eb8c7" },
  { name: "Quick Draw", role: "responder", id: "4cae2483" },
  { name: "The Judge", role: "evaluator", id: "96d7d3a6" },
];

interface OpsData {
  ok: boolean;
  report: string;
  history: Array<{
    date: string;
    teamGrade: string;
    healthy: number;
    total: number;
    critical: string[];
    topPerformer: string;
  }>;
  reports: Array<{ date: string; file: string }>;
  generatedAt: string;
}

function parseGrades(report: string): Record<string, { grade: string; status: string; notes: string }> {
  const grades: Record<string, { grade: string; status: string; notes: string }> = {};
  const lines = report.split("\n");
  for (const line of lines) {
    if (line.includes("|") && !line.includes("---") && !line.includes("Agent")) {
      const parts = line.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 4) {
        const name = parts[0];
        const grade = parts[1].replace(/\*/g, "").trim();
        const status = parts[2];
        const notes = parts[3];
        if (AGENTS.some((a) => name.includes(a.name))) {
          grades[name] = { grade, status, notes };
        }
      }
    }
  }
  return grades;
}

function parseTeamGrade(report: string): { grade: string; healthy: number } {
  const match = report.match(/Team Health:\s*\**([A-F])\**.*?(\d+)\/9/i);
  if (match) return { grade: match[1], healthy: parseInt(match[2]) };
  const match2 = report.match(/(\d+)\/9 agents? healthy/i);
  if (match2) return { grade: "?", healthy: parseInt(match2[1]) };
  return { grade: "?", healthy: 0 };
}

function parseSections(report: string): { critical: string[]; warnings: string[]; top: string[]; recommendations: string[] } {
  const sections = { critical: [] as string[], warnings: [] as string[], top: [] as string[], recommendations: [] as string[] };
  let current = "";
  for (const line of report.split("\n")) {
    if (line.includes("CRITICAL") || line.includes("🔴")) current = "critical";
    else if (line.includes("WARNING") || line.includes("🟡")) current = "warnings";
    else if (line.includes("TOP PERFORMER") || line.includes("🟢")) current = "top";
    else if (line.includes("RECOMMENDATION") || line.includes("💡")) current = "recommendations";
    else if (line.startsWith("- ") && current) {
      (sections as Record<string, string[]>)[current].push(line.slice(2));
    }
  }
  return sections;
}

export default function OpsPage() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/ops");
      const json = await res.json();
      if (json.ok) setData(json);
    } catch (err) {
      console.error("Failed to fetch ops data:", err);
    }
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const grades = data?.report ? parseGrades(data.report) : {};
  const teamHealth = data?.report ? parseTeamGrade(data.report) : { grade: "?", healthy: 0 };
  const sections = data?.report ? parseSections(data.report) : { critical: [], warnings: [], top: [], recommendations: [] };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: TEXT,
        fontFamily: FONT,
        padding: "24px",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5 }}>
              HammerLock <span style={{ color: ACCENT }}>Ops Center</span>
            </h1>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0 }}>
              Agent Performance Dashboard &middot; Last refresh: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "8px 16px",
              color: TEXT,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: TEXT_DIM }}>Loading ops data...</div>
        ) : !data?.report ? (
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 40,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>No Report Card Yet</h2>
            <p style={{ color: TEXT_DIM, fontSize: 14, margin: 0 }}>
              The Judge runs daily at 7:30am PT. First report card will appear after the next run.
              <br />
              You can also trigger it manually from the OpenClaw dashboard.
            </p>
          </div>
        ) : (
          <>
            {/* Team Health Score */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr",
                gap: 24,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  padding: 28,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Team Health
                </div>
                <div
                  style={{
                    fontSize: 72,
                    fontWeight: 900,
                    color: GRADE_COLORS[teamHealth.grade] || TEXT_DIM,
                    lineHeight: 1,
                    marginBottom: 8,
                  }}
                >
                  {teamHealth.grade}
                </div>
                <div style={{ fontSize: 14, color: TEXT_DIM }}>
                  <span style={{ color: ACCENT, fontWeight: 700 }}>{teamHealth.healthy}</span>/9 agents healthy
                </div>
              </div>

              {/* Quick Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div style={{ background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.2)", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#FF4D6A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Critical</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#FF4D6A" }}>{sections.critical.length}</div>
                  <div style={{ fontSize: 12, color: TEXT_DIM }}>needs intervention</div>
                </div>
                <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#FBBF24", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Warnings</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#FBBF24" }}>{sections.warnings.length}</div>
                  <div style={{ fontSize: 12, color: TEXT_DIM }}>degraded</div>
                </div>
                <div style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}33`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 12, color: ACCENT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Healthy</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: ACCENT }}>{sections.top.length}</div>
                  <div style={{ fontSize: 12, color: TEXT_DIM }}>top performers</div>
                </div>
              </div>
            </div>

            {/* Agent Grid */}
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Agent Roster</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
              {AGENTS.map((agent) => {
                const g = Object.entries(grades).find(([k]) => k.includes(agent.name));
                const grade = g ? g[1].grade : "?";
                const status = g ? g[1].status : "unknown";
                const notes = g ? g[1].notes : "No data yet";
                const gradeColor = GRADE_COLORS[grade] || TEXT_DIM;

                return (
                  <div
                    key={agent.id}
                    style={{
                      background: CARD_BG,
                      border: `1px solid ${grade === "F" ? "rgba(255,77,106,0.3)" : grade === "A" ? `${ACCENT}30` : BORDER}`,
                      borderRadius: 12,
                      padding: 20,
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: `${gradeColor}15`,
                        border: `2px solid ${gradeColor}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        fontWeight: 900,
                        color: gradeColor,
                        flexShrink: 0,
                      }}
                    >
                      {grade}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{agent.name}</span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background:
                              status.includes("ok") || status.includes("idle")
                                ? `${ACCENT}15`
                                : status.includes("error")
                                ? "rgba(255,77,106,0.15)"
                                : "rgba(255,255,255,0.05)",
                            color:
                              status.includes("ok") || status.includes("idle")
                                ? ACCENT
                                : status.includes("error")
                                ? "#FF4D6A"
                                : TEXT_DIM,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 4 }}>{agent.role}</div>
                      <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.4 }}>{notes}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Issues & Recommendations */}
            {sections.critical.length > 0 && (
              <div style={{ background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.2)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FF4D6A", margin: "0 0 12px" }}>
                  🔴 Critical Issues — Needs Your Attention
                </h3>
                {sections.critical.map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: TEXT, marginBottom: 8, paddingLeft: 16, borderLeft: "2px solid rgba(255,77,106,0.3)" }}>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {sections.recommendations.length > 0 && (
              <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: ACCENT, margin: "0 0 12px" }}>
                  💡 Recommendations
                </h3>
                {sections.recommendations.map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 8, paddingLeft: 16, borderLeft: `2px solid ${ACCENT}30` }}>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {data.history.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Grade History</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {data.history.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        background: CARD_BG,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: "8px 16px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, color: TEXT_DIM, marginBottom: 4 }}>{h.date}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: GRADE_COLORS[h.teamGrade] || TEXT_DIM }}>{h.teamGrade}</div>
                      <div style={{ fontSize: 10, color: TEXT_DIM }}>
                        {h.healthy}/{h.total}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Report (collapsible) */}
            <details style={{ marginTop: 32 }}>
              <summary style={{ fontSize: 14, fontWeight: 600, color: TEXT_DIM, cursor: "pointer", marginBottom: 12 }}>
                View Raw Report Card
              </summary>
              <pre
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 20,
                  fontSize: 12,
                  color: TEXT_DIM,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.6,
                  maxHeight: 500,
                  overflow: "auto",
                }}
              >
                {data.report}
              </pre>
            </details>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "40px 0 20px", fontSize: 12, color: "#374151" }}>
          HammerLock Ops Center &middot; Powered by The Judge &middot; OpenClaw
        </div>
      </div>
    </div>
  );
}
