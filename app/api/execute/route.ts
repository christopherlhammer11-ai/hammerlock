import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";

const execAsync = promisify(exec);
const personaPath = path.join(os.homedir(), "vault", "persona-chris.md");
const planPath = path.join(os.homedir(), "vault", "vaultai-plan.md");
const vaultJsonPath = path.join(process.cwd(), "vault.json");

async function readFileSafe(target: string) {
  return await fs.readFile(target, "utf8");
}

async function runStatus() {
  const vaultExists = await fs
    .access(vaultJsonPath)
    .then(() => true)
    .catch(() => false);
  const lines = [
    `Vault path: ${vaultJsonPath}`,
    `Persona path: ${personaPath}`,
    `Vault.json ${vaultExists ? "found" : "missing"}`,
    `Status: ${vaultExists ? "healthy" : "needs setup"}`
  ];
  try {
    const { stdout } = await execAsync("node ./bin/vaultai.js status");
    lines.push("\nCLI status:", stdout.trim());
  } catch (error) {
    lines.push(`\nCLI status unavailable: ${(error as Error).message}`);
  }
  return lines.join("\n");
}

function sanitizePath(raw: string) {
  const trimmed = raw.replace(/^['"]|['"]$/g, "");
  if (path.isAbsolute(trimmed)) return trimmed;
  return path.join(process.cwd(), trimmed);
}

export async function POST(req: Request) {
  const { command } = await req.json();
  if (!command || typeof command !== "string") {
    return NextResponse.json({ response: "No command received." }, { status: 400 });
  }

  const normalized = command.trim();
  const lowered = normalized.toLowerCase();

  try {
    if (lowered.includes("status")) {
      const status = await runStatus();
      return NextResponse.json({ response: status });
    }

    if (lowered.includes("load persona") || lowered.includes("tell me about myself")) {
      const persona = await readFileSafe(personaPath);
      return NextResponse.json({ response: persona });
    }

    if (lowered.startsWith("read file")) {
      const match = normalized.match(/read file\s+(.+)/i);
      if (!match) throw new Error("Provide a file path after 'read file'.");
      const target = sanitizePath(match[1].trim());
      const content = await readFileSafe(target);
      return NextResponse.json({ response: `### ${target}\n\n${content}` });
    }

    const planMatch = lowered.match(/load plan/);
    if (planMatch) {
      const plan = await readFileSafe(planPath);
      return NextResponse.json({ response: plan });
    }

    return NextResponse.json({ response: `Executed: ${normalized}` });
  } catch (error) {
    return NextResponse.json(
      { response: `Error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
