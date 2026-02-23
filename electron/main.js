/**
 * 🔨🔐 HammerLock AI — Electron main process
 * Your AI. Your Data. Your Rules.
 *
 * Lifecycle:
 *   1. Show cinematic splash screen instantly (no server dependency)
 *   2. Start the OpenClaw gateway as a child process (localhost-only)
 *   3. Start the Next.js dev/production server
 *   4. Crossfade from splash to vault once Next.js is ready
 *   5. On quit: kill both child processes
 *
 * Security hardening:
 *   - Gateway bound to 127.0.0.1 only (no remote exposure)
 *   - contextIsolation + sandbox enabled on renderer
 *   - No nodeIntegration in renderer
 */

import { app, BrowserWindow, shell, Menu, session, systemPreferences } from "electron";
import { spawn, exec as execCb } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import net from "net";
import os from "os";
import { config as dotenvConfig } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Load .env from multiple locations (first found wins per key).
// Skip files that look encrypted (start with HAMMERLOCK_ENC:).
import fs from "fs";
import crypto from "crypto";

function loadEnvIfPlaintext(envPath) {
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    if (content.startsWith("HAMMERLOCK_ENC:")) {
      console.log(`[hammerlock] Skipping encrypted env: ${envPath}`);
      return;
    }
    dotenvConfig({ path: envPath });
  } catch {
    // File doesn't exist — that's fine
  }
}

// 1. ~/.hammerlock/.env — user's own config (highest priority)
loadEnvIfPlaintext(path.join(os.homedir(), ".hammerlock", ".env"));
// 2. App bundle root .env.local — bundled with the build
loadEnvIfPlaintext(path.join(ROOT, ".env.local"));
// 3. Source checkout — fallback for local dev
loadEnvIfPlaintext(path.join(ROOT, ".env"));
const IS_DEV = false; // Production mode — use pre-built Next.js for speed

// Set app name early — before menus are built. Without this,
// Electron defaults to "Electron" in the menu bar and Dock during dev.
app.name = "HammerLock AI";
if (process.platform === "darwin") {
  // Also set the CFBundleName equivalent for macOS Dock/About
  app.setName("HammerLock AI");
}

// Set user agent globally so all windows include "Electron" and "HammerLock"
// for reliable client-side detection (isElectron() checks).
app.userAgentFallback = app.userAgentFallback.includes("Electron")
  ? app.userAgentFallback
  : app.userAgentFallback + " Electron HammerLockAI";

const NEXT_PORT = 3100; // Use a different port from dev to avoid conflicts
const GATEWAY_PORT = 18789;
const GATEWAY_PROFILE = "hammerlock";

// ---------------------------------------------------------------------------
// Resolve OpenClaw path: bundled (node_modules) > system (/opt/homebrew/bin)
// ---------------------------------------------------------------------------
function getOpenClawBin() {
  // 1. Bundled in node_modules (production DMG)
  const bundled = path.join(ROOT, "node_modules", "openclaw", "openclaw.mjs");
  if (fs.existsSync(bundled)) {
    return { command: process.execPath, args: [bundled], isBundled: true };
  }
  // 2. System-installed (dev / fallback)
  return { command: "openclaw", args: [], isBundled: false };
}

let mainWindow = null;
let gatewayProcess = null;
let nextProcess = null;

// ---------------------------------------------------------------------------
// Single instance lock — prevent 20 windows from spawning
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Another instance is already running — quit this one immediately
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to open a second instance — focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ---------------------------------------------------------------------------
// Port check
// ---------------------------------------------------------------------------
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port, "127.0.0.1");
  });
}

// ---------------------------------------------------------------------------
// Wait for a port to accept connections
// ---------------------------------------------------------------------------
function waitForPort(port, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket
        .on("connect", () => {
          socket.destroy();
          resolve();
        })
        .on("timeout", () => {
          socket.destroy();
          retry();
        })
        .on("error", () => {
          retry();
        });
      socket.connect(port, "127.0.0.1");
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Port ${port} did not become available within ${timeoutMs}ms`));
      } else {
        setTimeout(check, 300);
      }
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Ensure hammerlock profile config exists (auto-create for new installs)
// ---------------------------------------------------------------------------
function ensureHammerlockProfile() {
  const hammerlockProfileDir = path.join(os.homedir(), ".openclaw-hammerlock");
  const hammerlockConfig = path.join(hammerlockProfileDir, "openclaw.json");
  const baseConfig = path.join(os.homedir(), ".openclaw", "openclaw.json");

  // Already exists — nothing to do
  if (fs.existsSync(hammerlockConfig)) {
    console.log("[hammerlock] Profile config found:", hammerlockConfig);
    return;
  }

  // Read token from the base OpenClaw profile, or generate a fresh one
  let token = null;
  try {
    const baseData = JSON.parse(fs.readFileSync(baseConfig, "utf-8"));
    token = baseData?.gateway?.auth?.token || baseData?.gateway?.remote?.token;
    if (token) {
      console.log("[hammerlock] Borrowing gateway token from base OpenClaw profile");
    }
  } catch {
    // Base profile doesn't exist or is invalid — that's ok
  }

  if (!token) {
    // Generate a random 24-byte hex token
    token = crypto.randomBytes(24).toString("hex");
    console.log("[hammerlock] Generated fresh gateway token");
  }

  // Create the profile directory and config
  try {
    fs.mkdirSync(hammerlockProfileDir, { recursive: true });
    const profileConfig = {
      gateway: {
        mode: "local",
        auth: { mode: "token", token },
        remote: { token },
      },
    };
    fs.writeFileSync(hammerlockConfig, JSON.stringify(profileConfig, null, 2) + "\n");
    console.log("[hammerlock] Created hammerlock profile config:", hammerlockConfig);
  } catch (err) {
    console.warn("[hammerlock] Could not create profile config:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Start OpenClaw dedicated browser (for browser automation skills)
// ---------------------------------------------------------------------------
async function startBrowser() {
  try {
    const ocBin = getOpenClawBin();
    // Check if browser is already running
    const checkArgs = [...ocBin.args, "browser", "status", "--json"];
    const status = await new Promise((resolve) => {
      execCb(
        `${ocBin.command} ${checkArgs.join(" ")}`,
        { timeout: 5000 },
        (err, stdout) => {
          if (err) return resolve(null);
          try { resolve(JSON.parse(stdout)); } catch { resolve(null); }
        }
      );
    });

    if (status?.running) {
      console.log("[hammerlock] Browser already running");
      return;
    }

    // Start the browser (uses default profile — "openclaw" driver)
    console.log("[hammerlock] Starting OpenClaw browser for web automation...");
    const startArgs = [...ocBin.args, "browser", "start"];
    await new Promise((resolve, reject) => {
      execCb(
        `${ocBin.command} ${startArgs.join(" ")}`,
        { timeout: 15000 },
        (err, stdout, stderr) => {
          if (err) {
            console.warn("[hammerlock] Browser start failed (non-critical):", err.message);
            resolve(); // Non-critical — app works without browser automation
          } else {
            console.log("[hammerlock] Browser ready for web automation");
            resolve();
          }
        }
      );
    });
  } catch (err) {
    console.warn("[hammerlock] Browser start failed (non-critical):", err.message);
  }
}

// ---------------------------------------------------------------------------
// Start OpenClaw gateway (if not already running)
// ---------------------------------------------------------------------------
async function startGateway() {
  const inUse = await isPortInUse(GATEWAY_PORT);
  if (inUse) {
    console.log(`[hammerlock] Gateway already running on port ${GATEWAY_PORT}`);
    return;
  }

  try {
    const ocBin = getOpenClawBin();
    console.log(`[hammerlock] Starting OpenClaw gateway on port ${GATEWAY_PORT}...`);
    console.log(`[hammerlock] OpenClaw: ${ocBin.isBundled ? "bundled" : "system"} (${ocBin.command})`);

    // Read the gateway token from profile config for env passthrough
    let gatewayToken;
    try {
      const profileData = JSON.parse(
        fs.readFileSync(path.join(os.homedir(), ".openclaw-hammerlock", "openclaw.json"), "utf-8")
      );
      gatewayToken = profileData?.gateway?.auth?.token;
    } catch { /* ok */ }

    const gatewayArgs = [...ocBin.args, "--profile", GATEWAY_PROFILE, "gateway", "--port", String(GATEWAY_PORT)];
    gatewayProcess = spawn(ocBin.command, gatewayArgs, {
      cwd: ROOT,
      stdio: "pipe",
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        ...(gatewayToken ? { OPENCLAW_GATEWAY_TOKEN: gatewayToken } : {}),
      },
    });

    gatewayProcess.stdout?.on("data", (d) => console.log(`[gateway] ${d.toString().trim()}`));
    gatewayProcess.stderr?.on("data", (d) => console.error(`[gateway] ${d.toString().trim()}`));
    gatewayProcess.on("exit", (code) => {
      console.log(`[gateway] exited with code ${code}`);
      gatewayProcess = null;
    });

    await waitForPort(GATEWAY_PORT);
    console.log("[hammerlock] Gateway ready.");
  } catch (err) {
    console.warn("[hammerlock] Gateway failed to start (optional):", err.message);
    console.warn("[hammerlock] App will still work with cloud LLM providers.");
    gatewayProcess = null;
  }
}

// ---------------------------------------------------------------------------
// Start Next.js
// ---------------------------------------------------------------------------
async function startNext() {
  const inUse = await isPortInUse(NEXT_PORT);
  if (inUse) {
    console.log(`[hammerlock] Next.js already running on port ${NEXT_PORT}`);
    return;
  }

  if (IS_DEV) {
    // Dev mode: spawn npx next dev
    console.log(`[hammerlock] Starting Next.js (dev) on port ${NEXT_PORT}...`);
    nextProcess = spawn("npx", ["next", "dev", "-p", String(NEXT_PORT)], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, PORT: String(NEXT_PORT) },
    });

    nextProcess.stdout?.on("data", (d) => console.log(`[next] ${d.toString().trim()}`));
    nextProcess.stderr?.on("data", (d) => console.error(`[next] ${d.toString().trim()}`));
    nextProcess.on("exit", (code) => {
      console.log(`[next] exited with code ${code}`);
      nextProcess = null;
    });
  } else {
    // Production: use Next.js programmatic server (no child process needed)
    console.log(`[hammerlock] Starting Next.js (production) on port ${NEXT_PORT}...`);
    try {
      const nextModule = await import(path.join(ROOT, "node_modules", "next", "dist", "server", "next.js"));
      const NextServer = nextModule.default?.default || nextModule.default;
      const nextApp = NextServer({
        dev: false,
        dir: ROOT,
        port: NEXT_PORT,
        hostname: "127.0.0.1",
      });
      await nextApp.prepare();
      const handler = nextApp.getRequestHandler();

      const { createServer } = await import("http");
      const server = createServer((req, res) => handler(req, res));
      await new Promise((resolve, reject) => {
        server.listen(NEXT_PORT, "127.0.0.1", () => resolve());
        server.on("error", reject);
      });
      console.log(`[hammerlock] Next.js production server listening on port ${NEXT_PORT}`);
      return; // skip waitForPort — already listening
    } catch (err) {
      console.error("[hammerlock] Programmatic Next.js failed, falling back to CLI:", err.message);
      // Fallback: spawn the next binary directly
      const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
      nextProcess = spawn(process.execPath, [nextBin, "start", "-p", String(NEXT_PORT)], {
        cwd: ROOT,
        stdio: "pipe",
        env: { ...process.env, PORT: String(NEXT_PORT) },
      });
      nextProcess.stdout?.on("data", (d) => console.log(`[next] ${d.toString().trim()}`));
      nextProcess.stderr?.on("data", (d) => console.error(`[next] ${d.toString().trim()}`));
      nextProcess.on("exit", (code) => {
        console.log(`[next] exited with code ${code}`);
        nextProcess = null;
      });
    }
  }

  await waitForPort(NEXT_PORT);
  console.log("[hammerlock] Next.js ready.");
}

// ---------------------------------------------------------------------------
// Create window — show splash instantly, then transition to vault
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: "HammerLock AI",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 14, y: 20 },
    backgroundColor: "#050505",
    show: false, // Don't show until splash is painted
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Load the splash screen instantly (static HTML, no server needed)
  const splashPath = path.join(__dirname, "splash.html");
  mainWindow.loadFile(splashPath);

  // Show window as soon as splash is painted — feels instant
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in system browser (target="_blank" / window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Catch ALL navigation away from the app (regular <a href> clicks)
  // Any link pointing outside our local Next.js server opens in system browser
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${NEXT_PORT}`) && !url.startsWith(`http://localhost:${NEXT_PORT}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Transition from splash to vault with a smooth crossfade
// ---------------------------------------------------------------------------
async function transitionToVault() {
  if (!mainWindow) return;

  // License gate: check tier on startup, redirect to /activate if no license
  let targetPath = "/vault";
  try {
    const checkRes = await fetch(`http://127.0.0.1:${NEXT_PORT}/api/license/check`);
    const checkData = await checkRes.json();
    if (checkData.needsActivation) {
      targetPath = "/activate";
    } else if (checkData.tier) {
      // Store tier for in-app use
      global.licenseTier = checkData.tier;
    }
  } catch (err) {
    console.warn("[license] Check failed, defaulting to vault:", err.message);
  }

  const targetURL = `http://127.0.0.1:${NEXT_PORT}${targetPath}`;

  // Inject fade-out animation on the splash, then navigate
  await mainWindow.webContents.executeJavaScript(`
    document.body.style.transition = 'opacity 0.4s ease';
    document.body.style.opacity = '0';
    new Promise(r => setTimeout(r, 400));
  `);

  // Navigate to target (vault or activate page)
  mainWindow.loadURL(targetURL);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
let appReady = false;

async function ensureServersAndCreateWindow() {
  // 1. Show splash screen immediately
  createWindow();

  // 2. Ensure hammerlock profile config exists (creates if missing)
  ensureHammerlockProfile();

  // 3. Start servers in parallel while user sees splash
  await Promise.all([startGateway(), startNext()]);

  // 4. Start the dedicated browser for web automation (non-blocking)
  //    Runs after gateway is up since it relies on gateway services
  startBrowser().catch(() => {}); // Fire-and-forget — not critical for app startup
  appReady = true;

  // 5. Minimum splash duration (let the animation play)
  // The splash animations take ~2s, and servers may start faster
  const MIN_SPLASH_MS = 3000;
  const elapsed = Date.now() - splashStart;
  if (elapsed < MIN_SPLASH_MS) {
    await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
  }

  // 6. Crossfade to vault
  await transitionToVault();
}

// ---------------------------------------------------------------------------
// Create a new window pointing at the vault (for "New Window" menu item)
// ---------------------------------------------------------------------------
function createNewWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: "HammerLock AI",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 14, y: 20 },
    backgroundColor: "#050505",
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(`http://127.0.0.1:${NEXT_PORT}/vault`);
  win.once("ready-to-show", () => { win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${NEXT_PORT}`) && !url.startsWith(`http://localhost:${NEXT_PORT}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  return win;
}

// ---------------------------------------------------------------------------
// Application menu
// ---------------------------------------------------------------------------
function buildAppMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    // macOS app menu
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        }]
      : []),
    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            if (appReady) {
              createNewWindow();
            }
          },
        },
        {
          label: "New Chat",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent("hammerlock:new-chat"));`
              );
            }
          },
        },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent("hammerlock:open-settings"));`
              );
            }
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    // View menu
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: "CmdOrCtrl+B",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent("hammerlock:toggle-sidebar"));`
              );
            }
          },
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(IS_DEV
          ? [
              { type: "separator" },
              { role: "reload" },
              { role: "forceReload" },
              { role: "toggleDevTools" },
            ]
          : []),
      ],
    },
    // Window menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]),
      ],
    },
    // Help menu
    {
      label: "Help",
      submenu: [
        {
          label: "HammerLock AI Documentation",
          click: () => {
            shell.openExternal("https://hammerlock.ai/docs");
          },
        },
        {
          label: "Report an Issue",
          click: () => {
            shell.openExternal("https://github.com/nicholasychua/hammerlock/issues");
          },
        },
        { type: "separator" },
        {
          label: `Version ${app.getVersion()}`,
          enabled: false,
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let splashStart = 0;

app.whenReady().then(async () => {
  buildAppMenu();

  // ---- Microphone / media permissions for voice input ----
  // Without these handlers, Electron silently denies getUserMedia() requests.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ["media", "mediaKeySystem", "geolocation", "notifications"];
    callback(allowed.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ["media", "mediaKeySystem", "geolocation", "notifications"];
    return allowed.includes(permission);
  });

  // On macOS, proactively request permissions so the OS dialogs
  // appear on first launch rather than silently failing later.
  if (process.platform === "darwin") {
    systemPreferences.askForMediaAccess("microphone").catch(() => {});

    // Trigger Calendar, Reminders, and Contacts permission dialogs.
    // AppleScript access triggers the native macOS permission prompt automatically.
    // These run in the background — if already granted, they're instant no-ops.
    // Calendar — triggers "HammerLock AI wants to access your Calendar"
    execCb(`osascript -e 'tell application "Calendar" to get name of calendars' 2>/dev/null`, { timeout: 10000 }, () => {});
    // Reminders — triggers "HammerLock AI wants to access your Reminders"
    execCb(`osascript -e 'tell application "Reminders" to get name of lists' 2>/dev/null`, { timeout: 10000 }, () => {});
    // Notes — triggers "HammerLock AI wants to access Notes"
    execCb(`osascript -e 'tell application "Notes" to get name of folders' 2>/dev/null`, { timeout: 10000 }, () => {});
    // Contacts — triggers via AppleScript too
    execCb(`osascript -e 'tell application "Contacts" to get name of people' 2>/dev/null`, { timeout: 10000 }, () => {});
  }

  splashStart = Date.now();
  try {
    await ensureServersAndCreateWindow();
  } catch (err) {
    console.error("[hammerlock] Startup failed:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!appReady) {
      splashStart = Date.now();
      try {
        await ensureServersAndCreateWindow();
      } catch (err) {
        console.error("[hammerlock] Re-launch failed:", err);
      }
    } else {
      // Skip license gate — go straight to vault
      let reactivatePath = "/vault";
      mainWindow = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 800,
        minHeight: 600,
        title: "HammerLock AI",
        titleBarStyle: "hidden",
        trafficLightPosition: { x: 14, y: 20 },
        backgroundColor: "#050505",
        show: false,
        webPreferences: {
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
        },
      });
      mainWindow.loadURL(`http://127.0.0.1:${NEXT_PORT}${reactivatePath}`);
      mainWindow.once("ready-to-show", () => { mainWindow.show(); });
      mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
      });
      mainWindow.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith(`http://127.0.0.1:${NEXT_PORT}`) && !url.startsWith(`http://localhost:${NEXT_PORT}`)) {
          event.preventDefault();
          shell.openExternal(url);
        }
      });
      mainWindow.on("closed", () => { mainWindow = null; });
    }
  }
});

app.on("before-quit", () => {
  if (gatewayProcess) {
    console.log("[hammerlock] Stopping gateway...");
    gatewayProcess.kill("SIGTERM");
  }
  if (nextProcess) {
    console.log("[hammerlock] Stopping Next.js...");
    nextProcess.kill("SIGTERM");
  }
  // Stop the dedicated browser (best-effort, non-blocking)
  try {
    const ocBin = getOpenClawBin();
    execCb(`${ocBin.command} ${[...ocBin.args, "browser", "stop"].join(" ")}`, { timeout: 3000 }, () => {});
  } catch { /* ignore */ }
});
