/**
 * OpenClaw path resolution for HammerLock
 *
 * Resolves paths to the OpenClaw CLI and bundled tools.
 * Priority: bundled (node_modules/openclaw) > system (/opt/homebrew/bin/openclaw)
 *
 * In production DMG: OpenClaw is bundled in node_modules/openclaw/
 * In dev: Falls back to system-installed openclaw
 */

import path from "path";
import os from "os";
import { existsSync } from "fs";

// ── Platform detection ──
export const isMacOS = process.platform === "darwin";
export const isWindows = process.platform === "win32";
export const isLinux = process.platform === "linux";

// Detect if we're running inside an Electron app bundle
const isPackaged = typeof process !== "undefined" && (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath !== undefined;

// Root of the project (works in both dev and packaged Electron)
function getAppRoot(): string {
  if (isPackaged) {
    // In packaged app: resources/app/ (electron-builder with asar: false)
    return path.join((process as NodeJS.Process & { resourcesPath?: string }).resourcesPath || "", "app");
  }
  // In dev / Next.js: process.cwd() is set to the project root by Next.js
  // This is more reliable than import.meta.url which can break after bundling
  return process.cwd();
}

/**
 * Get the path to the openclaw CLI entry point.
 * Returns the node command + script path for spawning.
 */
export function getOpenClawPath(): { command: string; args: string[] } {
  const root = getAppRoot();

  // 1. Bundled in node_modules (production DMG)
  const bundled = path.join(root, "node_modules", "openclaw", "openclaw.mjs");
  if (existsSync(bundled)) {
    return { command: process.execPath, args: [bundled] };
  }

  // 2. System-installed (dev / fallback)
  return { command: "openclaw", args: [] };
}

/**
 * Build the full openclaw command string for execAsync.
 * Includes --profile hammerlock by default.
 */
export function openclawCommand(subcommand: string, profile = "hammerlock"): string {
  const { command, args } = getOpenClawPath();

  if (command === "openclaw") {
    // System install — just use directly
    return `openclaw --profile ${profile} ${subcommand}`;
  }

  // Bundled — run via node
  const scriptPath = args[0];
  return `"${command}" "${scriptPath}" --profile ${profile} ${subcommand}`;
}

/**
 * Get the path to a bundled binary tool (e.g., remindctl).
 * Falls back to system PATH if not bundled.
 */
export function getBinPath(name: string): string {
  const root = getAppRoot();
  // On Windows, append .exe if not already present
  const binName = isWindows && !name.endsWith(".exe") ? `${name}.exe` : name;

  // Platform-specific arch folder: darwin-arm64, darwin-x64, linux-x64, win32-x64, etc.
  const platformArch = `${process.platform}-${process.arch}`;

  // 1. Bundled in bin/<platform-arch>/
  const bundled = path.join(root, "bin", platformArch, binName);
  if (existsSync(bundled)) {
    return bundled;
  }

  // 2. Legacy macOS paths (backwards compat)
  if (isMacOS) {
    const legacyArch = process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
    const legacyBundled = path.join(root, "bin", legacyArch, name);
    if (existsSync(legacyBundled)) {
      return legacyBundled;
    }
  }

  // 3. Bundled without arch (universal)
  const bundledFlat = path.join(root, "bin", binName);
  if (existsSync(bundledFlat)) {
    return bundledFlat;
  }

  // 4. System PATH fallback
  return binName;
}

/**
 * Get the path to OpenClaw's bundled skills directory.
 */
export function getSkillsPath(): string {
  const root = getAppRoot();

  const bundled = path.join(root, "node_modules", "openclaw", "skills");
  if (existsSync(bundled)) {
    return bundled;
  }

  // System fallback — platform-aware
  if (isMacOS) {
    const brewPath = "/opt/homebrew/lib/node_modules/openclaw/skills";
    if (existsSync(brewPath)) return brewPath;
    const usrLocal = "/usr/local/lib/node_modules/openclaw/skills";
    if (existsSync(usrLocal)) return usrLocal;
  }
  if (isLinux) {
    const usrLocal = "/usr/local/lib/node_modules/openclaw/skills";
    if (existsSync(usrLocal)) return usrLocal;
    const usrLib = "/usr/lib/node_modules/openclaw/skills";
    if (existsSync(usrLib)) return usrLib;
  }
  if (isWindows) {
    const appData = path.join(os.homedir(), "AppData", "Roaming", "npm", "node_modules", "openclaw", "skills");
    if (existsSync(appData)) return appData;
  }
  // Global npm fallback
  return path.join(os.homedir(), ".local", "lib", "node_modules", "openclaw", "skills");
}
