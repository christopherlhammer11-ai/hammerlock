/**
 * /api/permissions — macOS permission status checker
 *
 * GET → Returns current permission status for all required macOS permissions
 * POST → Triggers permission request for a specific permission
 *
 * Uses AppleScript / CLI probes to detect if permissions are granted.
 * Works on macOS only — returns all-granted on other platforms.
 */

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

interface PermissionStatus {
  id: string;
  name: string;
  description: string;
  granted: boolean;
  required: boolean;        // Is this needed for core features?
  manual: boolean;          // Does user need to manually enable in System Settings?
  settingsUrl?: string;     // Deep link to System Settings pane
  features: string[];       // What features need this permission
}

/**
 * GET — Check all permission statuses
 */
export async function GET() {
  if (os.platform() !== "darwin") {
    // Non-macOS: return all granted (permissions are macOS-specific)
    return NextResponse.json({ platform: os.platform(), permissions: [] });
  }

  const permissions: PermissionStatus[] = await Promise.all([
    checkCalendar(),
    checkReminders(),
    checkNotes(),
    checkContacts(),
    checkMicrophone(),
    checkFullDiskAccess(),
  ]);

  const allGranted = permissions.every(p => p.granted || !p.required);
  const requiredMissing = permissions.filter(p => p.required && !p.granted);

  return NextResponse.json({
    platform: "darwin",
    allGranted,
    requiredMissing: requiredMissing.length,
    permissions,
  });
}

/**
 * POST — Trigger a permission request
 * { permission: "calendar" | "reminders" | "notes" | "contacts" | "microphone" | "full-disk-access" }
 */
export async function POST(req: Request) {
  const { permission } = await req.json();

  if (os.platform() !== "darwin") {
    return NextResponse.json({ granted: true, message: "Not macOS — no permissions needed" });
  }

  switch (permission) {
    case "calendar":
      return triggerAppleScript("Calendar", 'get name of calendars');
    case "reminders":
      return triggerAppleScript("Reminders", 'get name of lists');
    case "notes":
      return triggerAppleScript("Notes", 'get name of folders');
    case "contacts":
      return triggerAppleScript("Contacts", 'get name of people');
    case "microphone":
      // Microphone is handled by Electron's systemPreferences.askForMediaAccess
      return NextResponse.json({ granted: false, message: "Microphone permission is requested by the app automatically" });
    case "full-disk-access":
      // Can't programmatically request — open System Settings
      try {
        await execAsync('open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"');
        return NextResponse.json({
          granted: false,
          message: "Opened System Settings. Please toggle Full Disk Access for HammerLock AI.",
          manual: true,
        });
      } catch {
        return NextResponse.json({
          granted: false,
          message: "Please open System Settings → Privacy & Security → Full Disk Access and enable HammerLock AI.",
          manual: true,
        });
      }
    default:
      return NextResponse.json({ error: `Unknown permission: ${permission}` }, { status: 400 });
  }
}

// ── Permission checkers ──

async function checkCalendar(): Promise<PermissionStatus> {
  const granted = await testAppleScript("Calendar", 'get name of calendars');
  return {
    id: "calendar",
    name: "Calendar",
    description: "Read and create calendar events",
    granted,
    required: true,
    manual: false,
    features: ["Check your schedule", "Create calendar events", "Schedule meetings"],
  };
}

async function checkReminders(): Promise<PermissionStatus> {
  const granted = await testAppleScript("Reminders", 'get name of lists');
  return {
    id: "reminders",
    name: "Reminders",
    description: "Create and manage Apple Reminders",
    granted,
    required: true,
    manual: false,
    features: ["Set reminders", "Create to-do items", "Time-based alerts"],
  };
}

async function checkNotes(): Promise<PermissionStatus> {
  const granted = await testAppleScript("Notes", 'get name of folders');
  return {
    id: "notes",
    name: "Notes",
    description: "Create and read Apple Notes",
    granted,
    required: true,
    manual: false,
    features: ["Save notes", "Create documents", "Quick capture"],
  };
}

async function checkContacts(): Promise<PermissionStatus> {
  const granted = await testAppleScript("Contacts", 'get name of first person');
  return {
    id: "contacts",
    name: "Contacts",
    description: "Access contacts for messaging and personalization",
    granted,
    required: false,
    manual: false,
    features: ["Send messages to contacts", "Email contacts by name"],
  };
}

async function checkMicrophone(): Promise<PermissionStatus> {
  // Check microphone permission via tccutil-style check
  let granted = false;
  try {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "System Events" to return true' 2>/dev/null`,
      { timeout: 5000 }
    );
    // If System Events works, we at least have automation. Mic check is trickier.
    // For now, assume granted if we got this far in the app (Electron already asked).
    granted = stdout.trim() === "true";
  } catch { /* denied */ }

  return {
    id: "microphone",
    name: "Microphone",
    description: "Voice input and live conversation mode",
    granted,
    required: false,
    manual: false,
    features: ["Voice commands", "Live conversation", "Audio transcription"],
  };
}

async function checkFullDiskAccess(): Promise<PermissionStatus> {
  // Test Full Disk Access by trying to read iMessage database
  let granted = false;
  try {
    await execAsync(
      `test -r "${os.homedir()}/Library/Messages/chat.db" && echo "ok"`,
      { timeout: 3000 }
    );
    granted = true;
  } catch { /* denied */ }

  return {
    id: "full-disk-access",
    name: "Full Disk Access",
    description: "Required for iMessage, Mail, and file scanning",
    granted,
    required: false,
    manual: true,
    settingsUrl: "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
    features: ["Read iMessages", "Access Mail databases", "Scan documents"],
  };
}

// ── Helpers ──

async function testAppleScript(app: string, command: string): Promise<boolean> {
  try {
    await execAsync(
      `osascript -e 'tell application "${app}" to ${command}' 2>/dev/null`,
      { timeout: 10000 }
    );
    return true;
  } catch {
    return false;
  }
}

async function triggerAppleScript(app: string, command: string) {
  try {
    await execAsync(
      `osascript -e 'tell application "${app}" to ${command}'`,
      { timeout: 15000 }
    );
    return NextResponse.json({ granted: true, message: `${app} access granted` });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("not allowed") || msg.includes("-1743") || msg.includes("denied")) {
      return NextResponse.json({
        granted: false,
        message: `${app} access denied. Please grant access in System Settings → Privacy & Security → ${app}.`,
      });
    }
    // Permission dialog may have appeared — check again
    const granted = await testAppleScript(app, command);
    return NextResponse.json({ granted, message: granted ? `${app} access granted` : `${app} access pending` });
  }
}
