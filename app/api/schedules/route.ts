// 🔨🔐 HammerLock AI — Schedule Executor API
// Called by the client-side poller to check and fire scheduled agent tasks.
// GET: returns tasks that should fire now
// POST: marks a task as fired + executes the agent prompt

import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { decryptFromFile, encryptForFile, hasServerSessionKey, isEncrypted } from "@/lib/server-crypto";
import { type ScheduledTask, shouldFireNow, markFired } from "@/lib/schedules";

const schedulesPath = path.join(os.homedir(), ".hammerlock", "schedules.json");

async function readSchedules(): Promise<ScheduledTask[]> {
  try {
    const raw = await fs.readFile(schedulesPath, "utf8");
    const content = isEncrypted(raw) ? (decryptFromFile(raw) || "[]") : raw;
    return JSON.parse(content) as ScheduledTask[];
  } catch { return []; }
}

async function writeSchedules(tasks: ScheduledTask[]): Promise<void> {
  await fs.mkdir(path.dirname(schedulesPath), { recursive: true });
  const json = JSON.stringify(tasks, null, 2);
  const toWrite = hasServerSessionKey() ? encryptForFile(json) : json;
  await fs.writeFile(schedulesPath, toWrite, "utf8");
}

/**
 * GET /api/schedules — Check which tasks should fire right now.
 * Returns { due: ScheduledTask[] }
 */
export async function GET() {
  try {
    const tasks = await readSchedules();
    const now = new Date();
    const due = tasks.filter(t => shouldFireNow(t, now));
    return NextResponse.json({ due, total: tasks.length });
  } catch (err) {
    return NextResponse.json({ due: [], total: 0, error: (err as Error).message });
  }
}

/**
 * POST /api/schedules — Mark a task as fired (update lastFiredAt).
 * Body: { taskId: string }
 */
export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const tasks = await readSchedules();
    const now = new Date();
    let firedTask: ScheduledTask | null = null;

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const fired = markFired(t, now);
        firedTask = fired;
        return fired;
      }
      return t;
    });

    if (!firedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await writeSchedules(updated);
    return NextResponse.json({ success: true, task: firedTask });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
