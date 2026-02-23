/**
 * /api/google-auth — Google OAuth flow for HammerLock AI
 *
 * GET  → Check Google auth status (which accounts are connected)
 * POST → Initiate or complete Google OAuth flow via gog CLI
 *
 * Uses the `gog` CLI (Google Workspace CLI from OpenClaw) for OAuth.
 * The OAuth client credentials are bundled with the app.
 */

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import { promises as fs } from "fs";

const execAsync = promisify(exec);

/**
 * Sanitize a string for safe use in shell single-quoted arguments.
 * Escapes single quotes and rejects dangerous characters.
 */
function shellSafe(input: string): string {
  // Reject inputs containing shell metacharacters that shouldn't appear in emails/IDs
  if (/[;&|`$(){}[\]\\!\n\r]/.test(input)) {
    throw new Error("Input contains invalid characters");
  }
  // Escape any remaining single quotes: replace ' with '\''
  return input.replace(/'/g, "'\\''");
}

/**
 * Validate email format (basic check to prevent injection)
 */
function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email) && email.length < 254;
}

// Path to bundled OAuth client credentials
const CREDENTIALS_DIR = path.join(os.homedir(), ".hammerlock", "google");
const CLIENT_CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "oauth-client.json");

/**
 * GET — Check Google auth status
 * Returns: { connected: boolean, accounts: string[], services: string[] }
 */
export async function GET() {
  try {
    // Check if gog is available
    const gogPath = await findGog();
    if (!gogPath) {
      return NextResponse.json({
        connected: false,
        accounts: [],
        services: [],
        error: "Google Workspace CLI (gog) not found",
        needsSetup: true,
      });
    }

    // Check if OAuth client credentials exist
    const hasCredentials = await hasOAuthCredentials(gogPath);
    if (!hasCredentials) {
      return NextResponse.json({
        connected: false,
        accounts: [],
        services: [],
        needsCredentials: true,
      });
    }

    // Check auth status — gog returns { account: { email, client, ... }, ... }
    const { stdout } = await execAsync(`${gogPath} auth status --json 2>/dev/null`, { timeout: 10000 });
    const status = JSON.parse(stdout);

    // Extract connected account (gog returns single account object, not array)
    const email = status.account?.email || "";
    const connected = !!email;

    return NextResponse.json({
      connected,
      accounts: connected ? [email] : [],
      services: ["gmail", "calendar", "drive", "contacts", "tasks", "docs", "sheets"],
    });
  } catch {
    // gog auth status may fail if no accounts — that's fine
    return NextResponse.json({
      connected: false,
      accounts: [],
      services: [],
    });
  }
}

/**
 * POST — Manage Google OAuth
 * Actions:
 *   { action: "setup-credentials", clientId, clientSecret }
 *   { action: "connect", email }
 *   { action: "disconnect", email }
 *   { action: "status" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;
    const gogPath = await findGog();

    if (!gogPath) {
      return NextResponse.json({
        error: "Google Workspace CLI (gog) not found. Make sure OpenClaw is installed.",
      }, { status: 500 });
    }

    switch (action) {
      case "setup-credentials": {
        // Store OAuth client credentials for the app
        const { clientId, clientSecret } = body;
        if (!clientId || !clientSecret) {
          return NextResponse.json({ error: "clientId and clientSecret required" }, { status: 400 });
        }

        // Sanitize inputs to prevent shell injection
        let safeClientId: string, safeClientSecret: string;
        try {
          safeClientId = shellSafe(clientId);
          safeClientSecret = shellSafe(clientSecret);
        } catch {
          return NextResponse.json({ error: "Invalid characters in credentials" }, { status: 400 });
        }

        // Save credentials to gog
        const result = await execAsync(
          `${gogPath} auth credentials add --client-id '${safeClientId}' --client-secret '${safeClientSecret}' --name hammerlock 2>&1`,
          { timeout: 15000 }
        );

        // Also save to our own storage for reference
        await fs.mkdir(CREDENTIALS_DIR, { recursive: true });
        await fs.writeFile(CLIENT_CREDENTIALS_FILE, JSON.stringify({
          clientId,
          clientName: "hammerlock",
          savedAt: new Date().toISOString(),
        }, null, 2));

        return NextResponse.json({
          success: true,
          message: "OAuth credentials saved",
          output: result.stdout,
        });
      }

      case "connect": {
        // Initiate OAuth flow for a Google account
        // This opens a browser for the user to authorize
        const { email } = body;
        if (!email) {
          return NextResponse.json({ error: "email required" }, { status: 400 });
        }

        // Validate email format to prevent shell injection
        if (!isValidEmail(email)) {
          return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Start OAuth flow — this opens the browser
        const safeEmail = shellSafe(email);
        const { stdout, stderr } = await execAsync(
          `${gogPath} auth add '${safeEmail}' --client hammerlock 2>&1`,
          { timeout: 120000 } // 2 min timeout for user to complete browser auth
        );

        return NextResponse.json({
          success: true,
          message: `Google account ${email} connected`,
          output: stdout || stderr,
        });
      }

      case "disconnect": {
        const { email } = body;
        if (!email) {
          return NextResponse.json({ error: "email required" }, { status: 400 });
        }

        // Validate email format to prevent shell injection
        if (!isValidEmail(email)) {
          return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        const safeDisconnectEmail = shellSafe(email);
        await execAsync(`${gogPath} auth remove '${safeDisconnectEmail}' --force 2>&1`, { timeout: 10000 });
        return NextResponse.json({ success: true, message: `Disconnected ${email}` });
      }

      case "status": {
        return GET();
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = (err as Error).message || "Unknown error";
    console.error("[google-auth]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Helpers ──

async function findGog(): Promise<string | null> {
  const isMac = process.platform === "darwin";
  const isWin = process.platform === "win32";

  // Check common locations per platform
  const candidates: string[] = [];
  if (isMac) {
    candidates.push("/opt/homebrew/bin/gog", "/usr/local/bin/gog");
  } else if (isWin) {
    candidates.push(
      path.join(os.homedir(), "AppData", "Roaming", "npm", "gog.cmd"),
      path.join(os.homedir(), "AppData", "Roaming", "npm", "gog.exe"),
    );
  } else {
    // Linux
    candidates.push("/usr/local/bin/gog", "/usr/bin/gog");
  }
  candidates.push(path.join(os.homedir(), ".local", "bin", isWin ? "gog.exe" : "gog"));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch { /* not found */ }
  }

  // Try PATH
  try {
    const whichCmd = isWin ? "where gog 2>nul" : "which gog 2>/dev/null";
    const { stdout } = await execAsync(whichCmd, { timeout: 3000 });
    const p = stdout.trim().split("\n")[0];
    if (p) return p;
  } catch { /* not in PATH */ }

  return null;
}

async function hasOAuthCredentials(gogPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`${gogPath} auth credentials list --json 2>/dev/null`, { timeout: 5000 });
    const data = JSON.parse(stdout);
    return (data.clients || []).length > 0;
  } catch {
    return false;
  }
}
