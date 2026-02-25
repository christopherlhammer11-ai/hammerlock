import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "logs", "agents");
const HISTORY_FILE = path.join(LOGS_DIR, "report-card-history.jsonl");

export async function GET() {
  try {
    // Read latest report card markdown
    const todayReport = path.join(LOGS_DIR, "report-card-today.md");
    let reportContent = "";
    if (fs.existsSync(todayReport)) {
      reportContent = fs.readFileSync(todayReport, "utf-8");
    }

    // Read history (last 30 entries)
    let history: Record<string, unknown>[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
      const lines = fs.readFileSync(HISTORY_FILE, "utf-8").trim().split("\n").filter(Boolean);
      history = lines
        .slice(-30)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Record<string, unknown>[];
    }

    // Scan for all report card files for historical data
    let reports: { date: string; file: string }[] = [];
    if (fs.existsSync(LOGS_DIR)) {
      const files = fs.readdirSync(LOGS_DIR).filter((f) => f.startsWith("report-card-") && f.endsWith(".md"));
      reports = files.map((f) => ({
        date: f.replace("report-card-", "").replace(".md", ""),
        file: f,
      }));
    }

    return NextResponse.json({
      ok: true,
      report: reportContent,
      history,
      reports,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
