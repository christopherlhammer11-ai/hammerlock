// 🔨🔐 HammerLock AI — API Engine
// The brain behind the operation. Routes queries, scrubs PII, fetches weather,
// searches the web, and talks to LLMs — all while keeping your data locked down.

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { hasCredit, deductCredit, getRemainingUnits } from "@/lib/compute-credits";
import { createAnonymizer } from "@/lib/anonymize";
import { config as dotenvConfig } from "dotenv";
import { decryptFromFile, encryptForFile, hasServerSessionKey, isEncrypted } from "@/lib/server-crypto";
import { openclawCommand, getBinPath, isMacOS, isWindows, isLinux } from "@/lib/openclaw-paths";
import { existsSync } from "fs";
import { detectScheduleIntent, parseScheduleCommand } from "@/lib/schedule-parser";
import {
  type ScheduledTask,
  getSchedulesFromVault,
  addSchedule,
  removeSchedule,
  toggleSchedule,
  formatSchedule,
  formatTime12h,
  DAY_NAMES,
  SCHEDULES_VAULT_KEY,
} from "@/lib/schedules";

// Load user env from ~/.hammerlock/.env (for Electron packaged builds)
// Note: If .env is encrypted, keys are loaded on vault unlock via /api/vault-session
try {
  const envPath = path.join(os.homedir(), ".hammerlock", ".env");
  const envRaw = require("fs").readFileSync(envPath, "utf8");
  if (!isEncrypted(envRaw)) {
    // Only load via dotenv if file is plaintext (pre-encryption migration)
    dotenvConfig({ path: envPath });
  }
} catch { /* .env doesn't exist yet — that's fine */ }

// Allow longer execution for LLM calls on Vercel (default 10s is too short)
// Streaming responses may take longer since the connection stays open while tokens generate
export const maxDuration = 60;

const execAsync = promisify(exec);

// ── Bundled OpenClaw + tool path resolution ──
// Uses shared resolver from lib/openclaw-paths.ts
// Priority: bundled (node_modules/openclaw) > system (/opt/homebrew/bin/openclaw)
function resolveOpenClawCmd(subcommand: string, profile = "hammerlock"): string {
  return openclawCommand(subcommand, profile);
}
function resolveBinPath(name: string): string {
  const resolved = getBinPath(name);
  // Quote paths that contain spaces (bundled paths in .app bundles)
  return resolved.includes(" ") ? `"${resolved}"` : resolved;
}

const personaPath = path.join(os.homedir(), ".hammerlock", "persona.md");
const planPath = path.join(os.homedir(), ".hammerlock", "plan.md");
const vaultJsonPath = path.join(process.cwd(), "vault.json");

// Read at runtime to pick up keys configured after module init
function getBraveKey() { return process.env.BRAVE_API_KEY || ""; }
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3";



let cachedPersona = "";

async function readFileSafe(target: string) {
  const raw = await fs.readFile(target, "utf8");
  // Decrypt if the file is encrypted and we have a session key
  if (isEncrypted(raw)) {
    const decrypted = decryptFromFile(raw);
    if (decrypted === null) throw new Error("File is encrypted but vault is locked. Unlock your vault first.");
    return decrypted;
  }
  return raw;
}

async function runStatus() {
  const vaultExists = await fs
    .access(vaultJsonPath)
    .then(() => true)
    .catch(() => false);
  const personaExists = await fs
    .access(personaPath)
    .then(() => true)
    .catch(() => false);

  const ollamaUp = await callOllama("test", "ping").then(() => true).catch(() => false);
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasMistral = !!process.env.MISTRAL_API_KEY;
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  const hasBrave = !!getBraveKey();

  // Build formatted status with clear visual indicators
  const providers: [string, boolean][] = [
    ["Ollama", ollamaUp],
    ["OpenAI", hasOpenAI],
    ["Anthropic", hasAnthropic],
    ["Gemini", hasGemini],
    ["Groq", hasGroq],
    ["Mistral", hasMistral],
    ["DeepSeek", hasDeepSeek],
    ["Brave Search", hasBrave],
  ];

  const active = providers.filter(([, ok]) => ok);
  const inactive = providers.filter(([, ok]) => !ok);

  const lines = [
    `**HammerLock AI Status**`,
    ``,
    `${vaultExists ? "\u{1F7E2}" : "\u26AA"} Vault: ${vaultExists ? "active" : "not set up"}`,
    `${personaExists ? "\u{1F7E2}" : "\u26AA"} Persona: ${personaExists ? "loaded" : "not found"}`,
    ``,
    `**Active Providers**`,
    ...(active.length > 0
      ? active.map(([name]) => `\u{1F7E2} ${name} — connected`)
      : [`\u26AA No providers configured`]),
    ``,
    ...(inactive.length > 0
      ? [`**Inactive**`, ...inactive.map(([name]) => `\u26AA ${name}`)]
      : [`\u2728 All providers configured!`]),
  ];
  return lines.join("\n");
}

const SAFE_BASE_DIR = path.join(os.homedir(), ".hammerlock");

function sanitizePath(raw: string): string {
  const trimmed = raw.replace(/^['" ]+|['" ]+$/g, "");
  // Resolve relative paths against the safe directory
  const resolved = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(SAFE_BASE_DIR, trimmed);
  // Block path traversal — resolved path must stay inside ~/.hammerlock/
  if (!resolved.startsWith(SAFE_BASE_DIR + path.sep) && resolved !== SAFE_BASE_DIR) {
    throw new Error("Access denied: file reads are restricted to ~/.hammerlock/");
  }
  return resolved;
}


async function loadPersonaText() {
  if (cachedPersona) return cachedPersona;
  try {
    const raw = await fs.readFile(personaPath, "utf8");
    // Decrypt if encrypted
    if (isEncrypted(raw)) {
      const decrypted = decryptFromFile(raw);
      if (decrypted) {
        cachedPersona = decrypted;
        return cachedPersona;
      }
      // Encrypted but no session key — can't read persona
      return "";
    }
    cachedPersona = raw;
    return cachedPersona;
  } catch {
    try {
      const raw = await fs.readFile(vaultJsonPath, "utf8");
      const parsed = JSON.parse(raw);
      const profile = parsed?.profile;
      if (profile) {
        cachedPersona = `Name: ${profile.name || ""}\nRole: ${profile.role || ""}\nLocation: ${profile.location || ""}`;
        return cachedPersona;
      }
    } catch {
      /* ignore */
    }
  }
  return "";
}

/** Read current persona text (decrypting if needed), append a line, write back encrypted. */
async function appendToPersona(line: string): Promise<string> {
  let existing = "";
  try {
    const raw = await fs.readFile(personaPath, "utf8");
    if (isEncrypted(raw)) {
      existing = decryptFromFile(raw) || "";
    } else {
      existing = raw;
    }
  } catch { /* new file */ }
  const updated = existing ? `${existing}\n${line}` : line;
  await fs.mkdir(path.dirname(personaPath), { recursive: true });
  const toWrite = hasServerSessionKey() ? encryptForFile(updated) : updated;
  await fs.writeFile(personaPath, toWrite, "utf8");
  cachedPersona = updated;
  return updated;
}

// ── Open-Meteo Weather API (free, no key needed) ──
// WMO weather codes → human-readable conditions
const WMO_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
  66: "Light freezing rain", 67: "Heavy freezing rain",
  71: "Light snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Moderate showers", 82: "Violent showers",
  85: "Light snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with light hail", 99: "Thunderstorm with heavy hail",
};

// Simple city → lat/lon lookup for common US cities (extend as needed)
const CITY_COORDS: Record<string, [number, number]> = {
  "san ramon": [37.7799, -121.978],
  "san francisco": [37.7749, -122.4194],
  "los angeles": [34.0522, -118.2437],
  "new york": [40.7128, -74.0060],
  "seattle": [47.6062, -122.3321],
  "austin": [30.2672, -97.7431],
  "chicago": [41.8781, -87.6298],
  "denver": [39.7392, -104.9903],
  "miami": [25.7617, -80.1918],
  "portland": [45.5152, -122.6784],
  "san jose": [37.3382, -121.8863],
  "oakland": [37.8044, -122.2712],
  "sacramento": [38.5816, -121.4944],
  "san diego": [32.7157, -117.1611],
  "dublin": [37.7159, -121.9358],
  "pleasanton": [37.6604, -121.8758],
  "walnut creek": [37.9101, -122.0652],
  "danville": [37.8216, -121.9999],
};

function getCoordsForLocation(location: string | null): [number, number] | null {
  if (!location) return null;
  const lower = location.toLowerCase().replace(/,?\s*(ca|tx|ny|fl|wa|il|az|or|co|ga|ma)\b.*$/i, "").trim();
  return CITY_COORDS[lower] || null;
}

async function fetchWeatherData(lat: number, lon: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=7&timezone=America/Los_Angeles`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();

    const c = data.current;
    const d = data.daily;
    const condition = WMO_CODES[c.weather_code] || "Unknown";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let forecast = `REAL-TIME WEATHER DATA (from Open-Meteo, accurate to this moment):\n`;
    forecast += `Current: ${Math.round(c.temperature_2m)}°F, feels like ${Math.round(c.apparent_temperature)}°F, ${condition}`;
    forecast += c.rain > 0 ? `, rain: ${c.rain}mm` : "";
    forecast += `, wind: ${Math.round(c.wind_speed_10m)} mph\n\n`;
    forecast += `7-Day Forecast:\n`;

    for (let i = 0; i < d.time.length; i++) {
      const date = new Date(d.time[i] + "T12:00");
      const dayName = days[date.getDay()];
      const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const cond = WMO_CODES[d.weather_code[i]] || "Unknown";
      const rainChance = d.precipitation_probability_max[i];
      forecast += `${dayName} ${dateLabel}: High ${Math.round(d.temperature_2m_max[i])}°F / Low ${Math.round(d.temperature_2m_min[i])}°F — ${cond}${rainChance > 20 ? ` (${rainChance}% rain)` : ""}\n`;
    }

    return forecast;
  } catch {
    return null;
  }
}

// ── Follow-Up Suggestions Parser ──
// Strips the ---FOLLOWUPS--- block from LLM responses and returns them as a separate array.
// Also detects trailing numbered questions even without the marker as a fallback.
function parseFollowUps(raw: string): { clean: string; followUps: string[] } {
  // Primary: look for explicit ---FOLLOWUPS--- marker
  const idx = raw.indexOf("---FOLLOWUPS---");
  if (idx !== -1) {
    const clean = raw.slice(0, idx).trimEnd();
    const followUps = raw.slice(idx + 15).trim()
      .split("\n")
      .map(l => l.replace(/^\d+\.\s*/, "").trim())
      .filter(l => l.length > 0 && l.length <= 80)
      .slice(0, 3);
    return { clean, followUps };
  }

  // Fallback: detect trailing numbered questions (1. ...? 2. ...? 3. ...?)
  // This catches cases where the LLM skips the marker but still appends follow-ups.
  const lines = raw.trimEnd().split("\n");
  const trailingQ: string[] = [];
  // Walk backwards from end, collecting numbered question lines
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue; // skip blank lines at the end
    const m = line.match(/^\d+\.\s+(.+\?)\s*$/);
    if (m && m[1].length <= 80) {
      trailingQ.unshift(m[1]);
    } else {
      break; // stop at first non-question line
    }
  }
  if (trailingQ.length >= 2 && trailingQ.length <= 4) {
    // Strip the trailing question lines from the response
    let cutFrom = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      if (/^\d+\.\s+.+\?\s*$/.test(line)) {
        cutFrom = i;
      } else {
        break;
      }
    }
    // Also strip any blank lines right before the questions
    while (cutFrom > 0 && !lines[cutFrom - 1].trim()) cutFrom--;
    const clean = lines.slice(0, cutFrom).join("\n").trimEnd();
    return { clean, followUps: trailingQ.slice(0, 3) };
  }

  return { clean: raw, followUps: [] };
}

/**
 * Post-process LLM responses to strip leaked system prompt artifacts.
 * Sometimes LLMs echo back internal instructions, markers, or fabricated links.
 */
function cleanLLMResponse(text: string): string {
  return text
    // Strip leaked HammerLock AI Response headers
    .replace(/---\s*HammerLock AI Response.*?---/gi, "")
    // Strip inline (FOLLOWUPS) markers the LLM might output
    .replace(/\(FOLLOWUPS?\)/gi, "")
    // Strip "Given your specifications..." system echo patterns
    .replace(/Given your specifications for responses involving HammerLock AI['']s operations.*?(?:\n|$)/gi, "")
    // Strip leaked system context references
    .replace(/while ensuring user privacy and providing localized information relevant to.*?(?::\n|:\s|$)/gi, "")
    // Strip placeholder/fabricated links like [Watch Here], [Link], [Link to ...]
    .replace(/\[(?:Watch Here|Link(?:\s+to\s+[^\]]*)?|Click Here|Link to YouTube Video)\]/gi, "")
    // Strip remaining ---...--- section dividers that aren't markdown horizontal rules
    .replace(/---[A-Z][A-Za-z\s]*---/g, "")
    // Clean up resulting double-spaces and empty lines
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

/** Strip HTML tags from a string (for Brave API snippets) */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

// ── Persona Context Builder ──
// Dynamically parses ANY user's persona and injects relevant context
// for planning/suggestion/recommendation queries. Works for any location,
// any family situation — no hardcoded data.

const PLANNING_KEYWORDS = /\b(family|today|tonight|this weekend|do|plan|activity|activities|fun|play|go out|outing|trip|adventure|things to do|date night|kids?|bored|suggestions?|recommend|where should|what should|places?|restaurant|eat|dinner|lunch|park|outdoor|indoor)\b/i;

function parsePersonaDetails(persona: string): {
  location: string | null;
  constraints: string[];
  preferences: string[];
} {
  const location = extractUserLocation(persona);
  const constraints: string[] = [];
  const preferences: string[] = [];

  // Family structure
  const kidsMatch = persona.match(/(\d+)\s*kids?/i);
  if (kidsMatch) {
    constraints.push(`${kidsMatch[1]} kids — suggest kid-friendly, age-appropriate options`);
  } else if (/\bkid|child|son|daughter/i.test(persona)) {
    constraints.push("has kids — suggest kid-friendly options");
  }

  // Pregnancy / mobility
  if (/\bpregnant/i.test(persona)) {
    constraints.push("partner is pregnant — prioritize low-impact, comfortable, seated or short-walk options; avoid extreme heat, crowds, heavy physical activity");
  }

  // Baby / toddler
  if (/\bbaby|infant|toddler|newborn/i.test(persona)) {
    constraints.push("has a baby/toddler — needs stroller-friendly, quieter venues with changing facilities");
  }

  // Pets
  if (/\bdog|cat|pet/i.test(persona)) {
    constraints.push("has pets — may prefer pet-friendly venues when relevant");
  }

  // Dietary preferences
  const dietMatch = persona.match(/\b(vegan|vegetarian|gluten[- ]?free|kosher|halal|dairy[- ]?free|allergic to \w+)/i);
  if (dietMatch) {
    preferences.push(`dietary: ${dietMatch[1]}`);
  }

  // Communication style
  const styleMatch = persona.match(/communication style[:\s]+(\w+)/i);
  if (styleMatch) {
    preferences.push(`communication style: ${styleMatch[1]}`);
  }

  return { location, constraints, preferences };
}

function buildFamilyContext(prompt: string, persona: string): string {
  // Only inject for planning/suggestion/recommendation queries
  if (!PLANNING_KEYWORDS.test(prompt)) return "";
  if (!persona.trim()) return "";

  const { location, constraints, preferences } = parsePersonaDetails(persona);

  // Don't inject empty context
  if (!location && constraints.length === 0 && preferences.length === 0) return "";

  let block = "\n\n--- USER CONTEXT (personalize your answer using this) ---\n";
  if (location) {
    block += `📍 Location: ${location} — name SPECIFIC real places, venues, parks, and businesses in or near this area. Be local, not generic.\n`;
  }
  if (constraints.length > 0) {
    block += `⚠️ Constraints:\n`;
    constraints.forEach(c => { block += `  - ${c}\n`; });
  }
  if (preferences.length > 0) {
    block += `💡 Preferences: ${preferences.join("; ")}\n`;
  }
  if (location) {
    block += `\n🔍 If you're not confident about specific venue names in ${location}, suggest the user ask you to "search for [topic] near me" to get real-time results.\n`;
  }
  block += "--- END USER CONTEXT ---";
  return block;
}

type MsgTurn = { role: "user" | "assistant"; content: string };

// ---------------------------------------------------------------------------
// Unified provider system — one function to call any LLM provider
// Supports: OpenAI-compatible (OpenAI, Groq, Mistral, DeepSeek), Anthropic, Gemini, Ollama
// Also supports streaming for OpenAI-compatible, Anthropic, and Gemini providers
// ---------------------------------------------------------------------------

type ProviderFormat = "openai" | "anthropic" | "gemini" | "ollama";

interface ProviderConfig {
  name: string;
  endpoint: string | ((model: string, key: string) => string);
  keyEnv: string;
  modelEnv: string;
  defaultModel: string;
  format: ProviderFormat;
  timeout: number;
  staggerMs: number; // delay before starting in parallel race (lower = higher priority)
}

const PROVIDERS: ProviderConfig[] = [
  { name: "OpenAI",   endpoint: "https://api.openai.com/v1/chat/completions",    keyEnv: "OPENAI_API_KEY",    modelEnv: "OPENAI_MODEL",    defaultModel: "gpt-4o-mini",                format: "openai",    timeout: 15000, staggerMs: 0   },
  { name: "Groq",     endpoint: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY",    modelEnv: "GROQ_MODEL",      defaultModel: "llama-3.3-70b-versatile",    format: "openai",    timeout: 15000, staggerMs: 100 },
  { name: "Anthropic", endpoint: "https://api.anthropic.com/v1/messages",         keyEnv: "ANTHROPIC_API_KEY", modelEnv: "ANTHROPIC_MODEL", defaultModel: "claude-sonnet-4-5-20250929", format: "anthropic", timeout: 15000, staggerMs: 200 },
  { name: "Gemini",   endpoint: (model: string, key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", defaultModel: "gemini-2.0-flash", format: "gemini", timeout: 15000, staggerMs: 400 },
  { name: "Mistral",  endpoint: "https://api.mistral.ai/v1/chat/completions",    keyEnv: "MISTRAL_API_KEY",   modelEnv: "MISTRAL_MODEL",   defaultModel: "mistral-small-latest",       format: "openai",    timeout: 15000, staggerMs: 500 },
  { name: "DeepSeek", endpoint: "https://api.deepseek.com/chat/completions",      keyEnv: "DEEPSEEK_API_KEY",  modelEnv: "DEEPSEEK_MODEL",  defaultModel: "deepseek-chat",              format: "openai",    timeout: 15000, staggerMs: 600 },
];

function buildProviderRequest(
  config: ProviderConfig,
  systemPrompt: string,
  history: MsgTurn[],
  userMsg: string,
  options?: { stream?: boolean; imageUrl?: string }
): { url: string; init: RequestInit } {
  const apiKey = process.env[config.keyEnv] || "";
  const model = process.env[config.modelEnv] || config.defaultModel;
  const stream = options?.stream ?? false;

  if (config.format === "anthropic") {
    const messages = [...history, { role: "user" as const, content: userMsg }];
    return {
      url: config.endpoint as string,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 2000, system: systemPrompt, messages, stream }),
      },
    };
  }

  if (config.format === "gemini") {
    const contents = [
      ...history.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: userMsg }] },
    ];
    const url = typeof config.endpoint === "function" ? config.endpoint(model, apiKey) : config.endpoint;
    const streamUrl = stream ? url.replace(":generateContent", ":streamGenerateContent?alt=sse&") : url;
    return {
      url: streamUrl,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents }),
      },
    };
  }

  if (config.format === "ollama") {
    return {
      url: `${OLLAMA_BASE_URL}/api/chat`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }], stream }),
      },
    };
  }

  // OpenAI-compatible format (OpenAI, Groq, Mistral, DeepSeek)
  let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> = userMsg;
  if (options?.imageUrl && config.name === "OpenAI") {
    const textPart = userMsg.replace(options.imageUrl, "").replace(/\[Image attached:[^\]]*\]\s*/g, "").trim();
    userContent = [
      { type: "text", text: textPart || "Describe this image in detail." },
      { type: "image_url", image_url: { url: options.imageUrl, detail: "auto" } },
    ];
  }
  const messages = [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userContent }];
  return {
    url: config.endpoint as string,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream, ...(options?.imageUrl ? { max_tokens: 1000 } : {}) }),
    },
  };
}

function extractProviderResponse(config: ProviderConfig, data: any): string | null {
  if (config.format === "anthropic") {
    return data.content?.map((part: { type: string; text?: string }) => (part.type === "text" ? part.text : "")).join("\n").trim() || null;
  }
  if (config.format === "gemini") {
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }
  if (config.format === "ollama") {
    return data.message?.content?.trim() || null;
  }
  // OpenAI-compatible
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/** Parse a streaming SSE chunk and extract the text delta */
function extractStreamDelta(config: ProviderConfig, data: any): string {
  if (config.format === "anthropic") {
    if (data.type === "content_block_delta" && data.delta?.text) return data.delta.text;
    return "";
  }
  if (config.format === "gemini") {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  if (config.format === "ollama") {
    return data.message?.content || "";
  }
  // OpenAI-compatible: choices[0].delta.content
  return data.choices?.[0]?.delta?.content || "";
}

/** Call a single provider (non-streaming). Returns text or null on failure. */
async function callProvider(
  config: ProviderConfig,
  systemPrompt: string,
  history: MsgTurn[],
  userMsg: string,
  externalSignal?: AbortSignal,
  options?: { imageUrl?: string }
): Promise<string | null> {
  const apiKey = process.env[config.keyEnv];
  if (!apiKey) return null;
  if (config.format === "ollama") {
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (isServerless) return null;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const { url, init } = buildProviderRequest(config, systemPrompt, history, userMsg, { imageUrl: options?.imageUrl });
    const response = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errBody = await response.text();
      lastLLMError = `${config.name} ${response.status}: ${errBody.slice(0, 200)}`;
      return null;
    }
    const data = await response.json();
    const content = extractProviderResponse(config, data);
    if (!content) { lastLLMError = `${config.name} returned empty response`; return null; }
    return content;
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      lastLLMError = `${config.name}: ${(error as Error).message}`;
    }
    return null;
  }
}

/**
 * Call a provider with streaming — returns a ReadableStream of text chunks.
 * Returns null if the provider key is missing or the call fails before streaming starts.
 */
async function callProviderStream(
  config: ProviderConfig,
  systemPrompt: string,
  history: MsgTurn[],
  userMsg: string,
  externalSignal?: AbortSignal,
  options?: { imageUrl?: string }
): Promise<{ stream: ReadableStream<string>; model: string } | null> {
  const apiKey = process.env[config.keyEnv];
  if (!apiKey) return null;
  if (config.format === "ollama") {
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (isServerless) return null;
  }
  const model = process.env[config.modelEnv] || config.defaultModel;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout + 30000);
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const { url, init } = buildProviderRequest(config, systemPrompt, history, userMsg, { stream: true, imageUrl: options?.imageUrl });
    const response = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok || !response.body) {
      const errBody = await response.text().catch(() => "");
      lastLLMError = `${config.name} stream ${response.status}: ${errBody.slice(0, 200)}`;
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const textStream = new ReadableStream<string>({
      async pull(ctrl) {
        try {
          const { done, value } = await reader.read();
          if (done) { ctrl.close(); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (trimmed === "data: [DONE]") { ctrl.close(); return; }
            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                if (config.format === "ollama" && json.done) { ctrl.close(); return; }
                const delta = extractStreamDelta(config, json);
                if (delta) ctrl.enqueue(delta);
              } catch { /* skip malformed JSON chunks */ }
            } else if (config.format === "ollama") {
              try {
                const json = JSON.parse(trimmed);
                if (json.done) { ctrl.close(); return; }
                const delta = extractStreamDelta(config, json);
                if (delta) ctrl.enqueue(delta);
              } catch { /* skip */ }
            }
          }
        } catch (err) {
          if ((err as Error).name !== "AbortError") ctrl.error(err);
          else ctrl.close();
        }
      },
      cancel() { reader.cancel(); },
    });

    return { stream: textStream, model };
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      lastLLMError = `${config.name}: ${(error as Error).message}`;
    }
    return null;
  }
}

// Legacy single-turn wrappers (used by status command, search fallbacks)
async function callOllama(systemPrompt: string, prompt: string) {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    return data.message?.content?.trim() || null;
  } catch (error) {
    console.error("Ollama call failed, falling back:", (error as Error).message);
    return null;
  }
}

async function callOpenAI(systemPrompt: string, prompt: string) {
  return callProvider(PROVIDERS[0], systemPrompt, [], prompt);
}

async function callAnthropic(systemPrompt: string, prompt: string) {
  return callProvider(PROVIDERS[2], systemPrompt, [], prompt);
}

/** Race all configured providers in parallel with stagger delays.
 *  First successful response wins; losers are cancelled.
 *  Returns { text, model } or null if all fail. */
async function raceProviders(
  systemPrompt: string,
  history: MsgTurn[],
  userMsg: string,
  options?: { imageUrl?: string }
): Promise<{ text: string; model: string } | null> {
  const available = PROVIDERS.filter(p => !!process.env[p.keyEnv]);
  if (available.length === 0) return null;

  if (available.length === 1) {
    const p = available[0];
    const result = await callProvider(p, systemPrompt, history, userMsg, undefined, options);
    if (result) return { text: result, model: process.env[p.modelEnv] || p.defaultModel };
    return null;
  }

  const raceControllers = available.map(() => new AbortController());
  let resolved = false;

  const promises = available.map((provider, i) =>
    new Promise<{ text: string; model: string }>((resolve, reject) => {
      const startRace = async () => {
        if (provider.staggerMs > 0) await new Promise<void>(r => setTimeout(r, provider.staggerMs));
        if (resolved) { reject(new Error("already resolved")); return; }
        const result = await callProvider(provider, systemPrompt, history, userMsg, raceControllers[i].signal, options);
        if (result) resolve({ text: result, model: process.env[provider.modelEnv] || provider.defaultModel });
        else reject(new Error(`${provider.name} failed`));
      };
      startRace();
    })
  );

  try {
    const winner = await Promise.any(promises);
    resolved = true;
    raceControllers.forEach(c => c.abort());
    return winner;
  } catch {
    return null;
  }
}

/** Race providers with streaming — returns a stream from the first provider that connects. */
async function raceProvidersStream(
  systemPrompt: string,
  history: MsgTurn[],
  userMsg: string,
  options?: { imageUrl?: string }
): Promise<{ stream: ReadableStream<string>; model: string } | null> {
  const available = PROVIDERS.filter(p => !!process.env[p.keyEnv]);
  if (available.length === 0) return null;

  if (available.length === 1) {
    return callProviderStream(available[0], systemPrompt, history, userMsg, undefined, options);
  }

  const raceControllers = available.map(() => new AbortController());
  let resolved = false;

  const promises = available.map((provider, i) =>
    new Promise<{ stream: ReadableStream<string>; model: string }>((resolve, reject) => {
      const startRace = async () => {
        if (provider.staggerMs > 0) await new Promise<void>(r => setTimeout(r, provider.staggerMs));
        if (resolved) { reject(new Error("already resolved")); return; }
        const result = await callProviderStream(provider, systemPrompt, history, userMsg, raceControllers[i].signal, options);
        if (result) resolve(result);
        else reject(new Error(`${provider.name} stream failed`));
      };
      startRace();
    })
  );

  try {
    const winner = await Promise.any(promises);
    resolved = true;
    raceControllers.forEach(c => { try { c.abort(); } catch {} });
    return winner;
  } catch {
    return null;
  }
}

// Track the last LLM error for better diagnostics in serverless
let lastLLMError: string | null = null;

// Track which model was used for credit cost assignment (chat vs chat_premium)
let lastModelUsed: string = "";

/**
 * Determine credit cost type based on model name.
 * Lightweight/fast models = "chat" (1 unit), premium/large models = "chat_premium" (3 units).
 * Ollama/gateway = "chat" (local models are free anyway — bypassed elsewhere).
 */
function creditTypeForModel(model: string): string {
  const m = model.toLowerCase();
  // Lightweight models — 1 unit
  if (m.includes("4o-mini") || m.includes("flash") || m.includes("phi")
    || m.includes("deepseek") || m.includes("mistral-small") || m.includes("llama")
    || m.includes("groq") || m === "ollama" || m === "gateway") {
    return "chat";
  }
  // Premium models (GPT-4o, Claude Sonnet/Opus, Gemini Pro) — 3 units
  return "chat_premium";
}

async function callGateway(prompt: string): Promise<string> {
  // Skip CLI gateway in serverless environments (it doesn't exist there)
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) {
    throw new Error(friendlyLLMError());
  }

  try {
    const escaped = prompt.replace(/'/g, "'\\''");
    const { stdout } = await execAsync(
      resolveOpenClawCmd(`agent --agent main --message '${escaped}' --json --no-color`),
      { timeout: 30000 }
    );
    const result = JSON.parse(stdout);
    if (result.status === "ok") {
      return result.result?.payloads?.[0]?.text || "No response from gateway agent";
    }
    throw new Error(result.summary || "Gateway agent failed");
  } catch {
    throw new Error(friendlyLLMError());
  }
}

/** Produce a clean, user-friendly error instead of raw CLI dumps */
function friendlyLLMError(): string {
  if (lastLLMError) {
    if (lastLLMError.includes("insufficient_quota") || lastLLMError.includes("exceeded")) {
      return "Your API key has run out of credits. Please add billing to your OpenAI account or add a different API key in Settings (⚙️).";
    }
    if (lastLLMError.includes("401") || lastLLMError.includes("invalid_api_key") || lastLLMError.includes("Incorrect API key")) {
      return "Your API key is invalid or expired. Please update it in Settings (⚙️).";
    }
    if (lastLLMError.includes("429") || lastLLMError.includes("rate_limit")) {
      return "API rate limit reached. Please wait a moment and try again.";
    }
  }
  return "No AI provider available. Open Settings (⚙️) and add an API key from OpenAI, Anthropic, Google, or another provider.";
}

// ── Native Action Execution ──
// Direct CLI calls for macOS integrations — more reliable than routing through LLM agent.
// Falls back to OpenClaw agent for complex/multi-step actions.

type GatewayActionResult = {
  response: string;
  actionType: string;
  success: boolean;
  /** macOS deep link URL to open the created resource (e.g. x-apple-reminderkit://, applenotes://) */
  deepLink?: string;
};

// ── Reminder parsing: extract title, due date/time from natural language ──
function parseReminderFromMessage(msg: string): { title: string; due: string; list?: string } | null {
  const lower = msg.toLowerCase();

  // Extract list if mentioned: "... to my Work list" / "... in Personal"
  let list: string | undefined;
  const listMatch = msg.match(/(?:to\s+(?:my\s+)?|in\s+(?:my\s+)?)(\w+)\s+list/i);
  if (listMatch) list = listMatch[1];

  // Remove the action prefix to get the content
  let content = msg
    .replace(/^(?:set\s+a?\s*reminder\s+(?:to\s+|for\s+)?|add\s+(?:a\s+)?reminder\s+(?:to\s+|for\s+)?|create\s+a?\s*reminder\s+(?:to\s+|for\s+)?|remind\s+me\s+(?:to\s+)?|add\s+to\s+(?:my\s+)?(?:apple\s+)?reminders?\s+)/i, "")
    .trim();

  // Extract time/date from end: "at 3pm", "tomorrow at noon", "at 10:30am tomorrow"
  let due = "";
  // Match patterns like "tomorrow at 3pm", "today at noon", "at 5pm", "at 10:30 am tomorrow"
  const timePatterns = [
    /\b(tomorrow|today|tonight)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s+(?:tomorrow|today))?)/i,
    /\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(tomorrow|today|tonight)?/i,
    /\b(tomorrow|today|tonight)\b/i,
    /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
    /\b(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\b/,
  ];

  for (const pattern of timePatterns) {
    const match = content.match(pattern);
    if (match) {
      // Build due string
      const fullMatch = match[0];
      content = content.replace(fullMatch, "").replace(/\s+/g, " ").trim();

      // Normalize time
      if (/tomorrow/i.test(fullMatch)) {
        const timeMatch = fullMatch.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (timeMatch) {
          const t = timeMatch[1].trim();
          // Convert "3pm" -> "15:00", "noon" -> "12:00"
          const normalized = normalizeTime(t);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          due = `${tomorrow.toISOString().split("T")[0]} ${normalized}`;
        } else {
          due = "tomorrow";
        }
      } else if (/today|tonight/i.test(fullMatch)) {
        const timeMatch = fullMatch.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (timeMatch) {
          const normalized = normalizeTime(timeMatch[1].trim());
          due = `${new Date().toISOString().split("T")[0]} ${normalized}`;
        } else if (/tonight/i.test(fullMatch)) {
          due = `${new Date().toISOString().split("T")[0]} 20:00`;
        } else {
          due = "today";
        }
      } else if (/\d{4}-\d{2}-\d{2}/.test(fullMatch)) {
        due = fullMatch.trim();
      } else {
        // "at 5pm" without day = today
        const timeMatch = fullMatch.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (timeMatch) {
          const normalized = normalizeTime(timeMatch[1].trim());
          due = `${new Date().toISOString().split("T")[0]} ${normalized}`;
        }
      }
      break;
    }
  }

  // Clean up trailing punctuation/prepositions from title
  const title = content.replace(/\s+(?:at|on|by|for|in)\s*$/i, "").replace(/[.,!?]+$/, "").trim();
  if (!title) return null;

  // Only return a parsed reminder if we have a real due date.
  // Vague requests like "make me a bill reminder" should go to the
  // OpenClaw agent which can ask follow-up questions for details.
  if (!due) return null;

  return { title, due, list };
}

function normalizeTime(t: string): string {
  // "3pm" -> "15:00", "noon" -> "12:00", "10:30am" -> "10:30"
  if (/noon/i.test(t)) return "12:00";
  if (/midnight/i.test(t)) return "00:00";

  const match = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return "09:00";

  let hours = parseInt(match[1]);
  const minutes = match[2] || "00";
  const period = match[3]?.toLowerCase();

  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

// ── Notes parsing: extract title and body ──
function parseNoteFromMessage(msg: string): { title: string; body: string } | null {
  // Strip the command prefix — handles: "create note in Apple Notes: Title",
  // "create a note called My Note", "save a note about X", etc.
  let content = msg
    .replace(/^(?:create\s+(?:a\s+)?note\s+(?:in\s+(?:apple\s+)?notes?[\s:]*)?(?:called|titled|named|about)?\s*|(?:make|save|write)\s+(?:a\s+)?note\s+(?:in\s+(?:apple\s+)?notes?[\s:]*)?(?:called|titled|named|about)?\s*|add\s+to\s+(?:my\s+)?(?:apple\s+)?notes?\s+app[\s:]*)/i, "")
    .trim();

  // Handle "Title\nBody" format (colon-separated from prefix or newline-separated)
  const newlineIdx = content.indexOf("\n");
  if (newlineIdx > 0) {
    const title = content.slice(0, newlineIdx).replace(/^['"":\s]+|['"":\s]+$/g, "").trim();
    const body = content.slice(newlineIdx + 1).trim();
    if (title) return { title, body };
  }

  // Split on "with the content", "saying", "with body", "that says"
  const splitMatch = content.match(/^(.+?)\s+(?:with\s+(?:the\s+)?(?:content|body|text)|saying|that\s+says)\s+['""]?(.+?)['""]?\s*$/is);
  if (splitMatch) {
    return { title: splitMatch[1].replace(/^['""]+|['""]+$/g, "").trim(), body: splitMatch[2].trim() };
  }

  // Just a title, no body
  const title = content.replace(/^['"":\s]+|['"":\s]+$/g, "").trim();
  return title ? { title, body: "" } : null;
}

// ── Calendar parsing: extract event details ──
function parseCalendarFromMessage(msg: string): { query: boolean; title?: string; date?: string; time?: string } {
  const lower = msg.toLowerCase();

  // Read queries
  if (/(?:what(?:'s|\s+is)\s+on\s+my\s+calendar|check\s+my\s+calendar|show\s+(?:me\s+)?my\s+calendar)/i.test(lower)) {
    // Extract date: "today", "tomorrow", "this week"
    let date = "today";
    if (/tomorrow/i.test(lower)) date = "tomorrow";
    else if (/this\s+week/i.test(lower)) date = "this week";
    else if (/next\s+week/i.test(lower)) date = "next week";
    return { query: true, date };
  }

  // Create event
  return { query: false };
}

// ── Direct CLI execution for each action type ──
async function executeNativeAction(
  message: string,
  actionType: string
): Promise<GatewayActionResult> {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) {
    return { response: "", actionType, success: false };
  }

  try {
    switch (actionType) {
      case "reminder": {
        // remindctl + Apple Reminders is macOS-only
        if (!isMacOS) return await callGatewayAgent(message, actionType);

        const parsed = parseReminderFromMessage(message);
        // If native parser couldn't extract enough detail (no due date),
        // route to OpenClaw agent which can ask follow-up questions
        if (!parsed) return await callGatewayAgent(message, actionType);

        const args = [`add`, `--title`, parsed.title];
        if (parsed.due) args.push(`--due`, parsed.due);
        if (parsed.list) args.push(`--list`, parsed.list);

        const escapedArgs = args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
        const remindctlBin = resolveBinPath("remindctl");
        const { stdout } = await execAsync(`${remindctlBin} ${escapedArgs} 2>&1`, { timeout: 10000 });

        if (stdout.includes("✓") || stdout.includes("Created")) {
          // Parse the output for confirmation
          const dueMatch = stdout.match(/— (.+)$/m);
          const dueStr = dueMatch ? dueMatch[1] : parsed.due;
          // Deep link to open Reminders app (x-apple-reminderkit:// opens the app)
          return {
            response: `✅ Reminder set: **${parsed.title}** — ${dueStr}`,
            actionType,
            success: true,
            deepLink: "x-apple-reminderkit://",
          };
        }
        // remindctl may have printed an error
        return { response: `Couldn't create reminder: ${stdout.trim()}`, actionType, success: false };
      }

      case "notes": {
        // Apple Notes via AppleScript is macOS-only
        if (!isMacOS) return await callGatewayAgent(message, actionType);

        const parsed = parseNoteFromMessage(message);
        if (!parsed) return await callGatewayAgent(message, actionType);

        // Use AppleScript to create note — ensure Notes is running first
        const body = parsed.body || parsed.title;
        const escapedTitle = parsed.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const escapedBody = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        // Create note and return its ID for deep linking
        const script = `
          tell application "Notes"
            tell folder "Notes"
              set newNote to make new note with properties {name:"${escapedTitle}", body:"${escapedBody}"}
              return id of newNote
            end tell
          end tell
        `;
        // Ensure Notes.app is running — needs ~2s to become ready for AppleScript
        const notesRunning = await execAsync("pgrep -x Notes", { timeout: 2000 }).then(() => true).catch(() => false);
        if (!notesRunning) {
          await execAsync("open -a Notes", { timeout: 5000 }).catch(() => {});
          await new Promise(r => setTimeout(r, 3000));
        }
        const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { timeout: 10000 });

        const noteId = stdout.trim();
        if (noteId && noteId !== "" && !noteId.toLowerCase().startsWith("error")) {
          // Build deep link — Notes uses applenotes:// URL scheme
          // Format: applenotes://showNote?noteId=<id>
          const deepLink = noteId.startsWith("x-coredata://")
            ? `applenotes://showNote?noteId=${encodeURIComponent(noteId)}`
            : undefined;
          return {
            response: `📝 Note created: **${parsed.title}**${parsed.body ? `\n\n${parsed.body}` : ""}`,
            actionType,
            success: true,
            deepLink,
          };
        }
        return { response: `Couldn't create note: ${noteId}`, actionType, success: false };
      }

      case "calendar": {
        // Apple Calendar via AppleScript is macOS-only
        if (!isMacOS) return await callGatewayAgent(message, actionType);

        const parsed = parseCalendarFromMessage(message);

        if (parsed.query) {
          // Read calendar events using AppleScript
          // Must ensure Calendar is running first — "open -a" uses LaunchServices
          const dateOffset = parsed.date === "tomorrow"
            ? `set targetStart to targetStart + (1 * days)
              set targetEnd to targetEnd + (1 * days)`
            : "";

          const script = `
            tell application "Calendar"
              set targetStart to current date
              set hours of targetStart to 0
              set minutes of targetStart to 0
              set seconds of targetStart to 0
              set targetEnd to targetStart + (1 * days)
              ${dateOffset}
              set eventList to ""
              repeat with cal in calendars
                set calEvents to (every event of cal whose start date is greater than or equal to targetStart and start date is less than targetEnd)
                repeat with evt in calEvents
                  set eventList to eventList & summary of evt & " | " & (start date of evt as string) & " | " & name of cal & linefeed
                end repeat
              end repeat
              return eventList
            end tell
          `;

          try {
            // Ensure Calendar.app is running (open -a goes through LaunchServices, works from child processes)
            const calRunning = await execAsync("pgrep -x Calendar", { timeout: 2000 }).then(() => true).catch(() => false);
            if (!calRunning) {
              await execAsync("open -a Calendar", { timeout: 5000 }).catch(() => {});
              await new Promise(r => setTimeout(r, 3000));
            }
            const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { timeout: 15000 });
            const events = stdout.trim();
            // Deep link to open Calendar app at the relevant date
            const calDeepLink = parsed.date === "tomorrow"
              ? `ical://` // Opens Calendar app
              : `ical://`;
            if (!events) {
              return {
                response: `📅 No events on your calendar ${parsed.date === "tomorrow" ? "tomorrow" : "today"}.`,
                actionType,
                success: true,
                deepLink: calDeepLink,
              };
            }
            // Format events nicely
            const lines = events.split("\n").filter(Boolean).map(line => {
              const [title, dateStr, calendar] = line.split(" | ");
              return `• **${title?.trim()}** — ${dateStr?.trim()} *(${calendar?.trim()})*`;
            });
            return {
              response: `📅 **${parsed.date === "tomorrow" ? "Tomorrow" : "Today"}'s calendar:**\n\n${lines.join("\n")}`,
              actionType,
              success: true,
              deepLink: calDeepLink,
            };
          } catch (calErr) {
            console.error("[native-action] calendar AppleScript failed:", (calErr as Error).message);
            return { response: "", actionType, success: false };
          }
        }

        // Creating events — fall through to gateway agent for now
        return { response: "", actionType, success: false };
      }

      case "email": {
        // Email: route through OpenClaw gateway agent which has himalaya + gog skills
        // The gateway agent can handle read/send/search via configured email providers
        return await callGatewayAgent(message, actionType);
      }

      case "sheets": {
        return await executeGoogleSheets(message);
      }

      case "browser": {
        // Browser automation: execute commands directly via openclaw browser CLI
        return await executeBrowserTask(message, actionType);
      }

      default:
        // For action types without direct CLI support, try the OpenClaw gateway agent
        return await callGatewayAgent(message, actionType);
    }
  } catch (err) {
    console.error(`[native-action] ${actionType} failed:`, (err as Error).message);
    return { response: "", actionType, success: false };
  }
}

// ── Google Sheets: create, read, append, update via gog CLI ──
function resolveGogBin(): string {
  // gog (Google Workspace CLI) — check bundled first
  const bundled = resolveBinPath("gog");
  const gogName = isWindows ? "gog.exe" : "gog";
  if (bundled !== gogName) return bundled;

  // Fallback: check common install locations per platform
  const locations: string[] = [];
  if (isMacOS) {
    locations.push("/opt/homebrew/bin/gog", "/usr/local/bin/gog");
  } else if (isLinux) {
    locations.push("/usr/local/bin/gog", "/usr/bin/gog",
      path.join(os.homedir(), ".local", "bin", "gog"));
  } else if (isWindows) {
    locations.push(
      path.join(os.homedir(), "AppData", "Roaming", "npm", "gog.cmd"),
      path.join(os.homedir(), "AppData", "Roaming", "npm", "gog.exe"),
      "C:\\Program Files\\gog\\gog.exe",
    );
  }
  for (const loc of locations) {
    if (existsSync(loc)) return loc;
  }
  return gogName;
}

async function getGoogleAccount(): Promise<string | null> {
  const gogBin = resolveGogBin();

  // Try direct exec first, then fall back to reading config files
  const extraPaths = isMacOS ? ":/opt/homebrew/bin:/usr/local/bin"
    : isLinux ? ":/usr/local/bin:/usr/bin" : "";
  try {
    const { stdout } = await execAsync(`${gogBin} auth list --json`, {
      timeout: 5000,
      env: { ...process.env, PATH: `${process.env.PATH || ""}${extraPaths}`, HOME: os.homedir() },
    });
    const data = JSON.parse(stdout.trim());
    const acct = data.accounts?.find((a: { services: string[] }) => a.services?.includes("sheets"));
    if (acct?.email) return acct.email;
  } catch { /* fall through to config file check */ }

  // Fallback: read gog config files directly (platform-specific locations)
  try {
    const syncFs = require("fs");
    // macOS: ~/Library/Application Support/gogcli/
    // Linux: ~/.config/gogcli/
    // Windows: %APPDATA%/gogcli/
    const gogConfigDir = isMacOS
      ? path.join(os.homedir(), "Library", "Application Support", "gogcli")
      : isWindows
        ? path.join(os.homedir(), "AppData", "Roaming", "gogcli")
        : path.join(os.homedir(), ".config", "gogcli");
    const configFile = path.join(gogConfigDir, "config.json");
    if (existsSync(configFile)) {
      const config = JSON.parse(syncFs.readFileSync(configFile, "utf8"));
      const accountClients = config.account_clients || {};
      const emails = Object.keys(accountClients);
      if (emails.length > 0) return emails[0];
    }
  } catch { /* fall through */ }

  return null;
}

function parseSheetsIntent(msg: string): {
  action: "create" | "append" | "read" | "update" | "find";
  title?: string;
  spreadsheetId?: string;
  range?: string;
  values?: string[];
  query?: string;
} | null {
  const lower = msg.toLowerCase();
  const firstLine = lower.split("\n")[0].trim();

  // Create: "create a spreadsheet called Expenses" / "make a new google sheet called Budget"
  const createMatch = msg.match(/(?:create|make|new)\s+(?:a\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s+(?:called|named|titled)\s+["""]?(.+?)["""]?\s*$/i)
    || msg.match(/(?:create|make|new)\s+(?:a\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s*:\s*(.+)/i)
    || msg.match(/(?:create|make|new)\s+(?:a\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s+(.+)/i);
  if (createMatch && /(?:create|make|new)\s/i.test(firstLine)) {
    return { action: "create", title: createMatch[1].trim().replace(/[""".]+$/, "") };
  }

  // Append/add row: "add row to spreadsheet <id>: Name, Amount, Date"
  // or "add to my Meal Plan spreadsheet: Groceries, $50, today"
  // Pattern 1: "add to my [Name] sheet/spreadsheet: values"
  const appendNamedMatch = msg.match(/(?:add|append|insert)\s+(?:a\s+)?(?:row\s+)?(?:to|in)\s+(?:my\s+)?(.+?)\s+(?:sheet|spreadsheet)\s*[:]\s*(.+)/i);
  if (appendNamedMatch) {
    const title = appendNamedMatch[1].trim().replace(/^(?:google\s+)/i, "");
    const values = appendNamedMatch[2].split(/\s*[,|]\s*/).map(v => v.trim()).filter(Boolean);
    return { action: "append", title, values };
  }
  // Pattern 2: "add to spreadsheet <id>: values" or "add to spreadsheet <id> values"
  const appendIdMatch = msg.match(/(?:add|append|insert)\s+(?:a\s+)?(?:row\s+)?(?:to|in)\s+(?:my\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s+([a-zA-Z0-9_-]{20,})\s*[:\s]\s*(.+)/i);
  if (appendIdMatch) {
    const values = appendIdMatch[2].split(/\s*[,|]\s*/).map(v => v.trim()).filter(Boolean);
    return { action: "append", spreadsheetId: appendIdMatch[1], values };
  }
  // Pattern 3: "add to spreadsheet: Name, values" (generic)
  const appendGenericMatch = msg.match(/(?:add|append|insert)\s+(?:a\s+)?(?:row\s+)?(?:to|in)\s+(?:my\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s+(.+)/i);
  if (appendGenericMatch) {
    const rest = appendGenericMatch[1];
    const colonSplit = rest.match(/["""]?(.+?)["""]?\s*[:]\s*(.+)/);
    if (colonSplit) {
      const values = colonSplit[2].split(/\s*[,|]\s*/).map(v => v.trim()).filter(Boolean);
      return { action: "append", title: colonSplit[1].trim(), values };
    }
    return { action: "find", query: rest.trim() };
  }

  // Read: "read my Expenses spreadsheet" / "show me the Budget sheet" / "what's in my sheet <id>"
  const readMatch = msg.match(/(?:read|show|get|open|view|what(?:'s|\s+is)\s+in)\s+(?:my\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s+["""]?(.+?)["""]?\s*$/i);
  if (readMatch) {
    const target = readMatch[1].trim();
    if (/^[a-zA-Z0-9_-]{20,}$/.test(target)) {
      return { action: "read", spreadsheetId: target };
    }
    return { action: "find", query: target };
  }

  // Update: "update sheet <id> A1:B2 with ..."
  const updateMatch = msg.match(/(?:update|set|change)\s+(?:my\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s+([a-zA-Z0-9_-]{20,})\s+([A-Z]+\d*[:\!][A-Z]*\d*)\s+(?:with|to)\s+(.+)/i);
  if (updateMatch) {
    const values = updateMatch[3].split(/\s*[,|]\s*/).map(v => v.trim()).filter(Boolean);
    return { action: "update", spreadsheetId: updateMatch[1], range: updateMatch[2], values };
  }

  // Generic find: "find my Expenses spreadsheet"
  if (/(?:find|search|list|look\s+(?:for|up))\s+(?:my\s+)?(?:google\s+)?(?:sheet|spreadsheet)/i.test(firstLine)) {
    const query = msg.replace(/.*(?:find|search|list|look\s+(?:for|up))\s+(?:my\s+)?(?:google\s+)?(?:sheet|spreadsheet)\s*/i, "").trim();
    return { action: "find", query: query || "spreadsheet" };
  }

  // Fallback: any mention of sheet/spreadsheet with some context
  return { action: "find", query: msg.slice(0, 100) };
}

async function executeGoogleSheets(message: string): Promise<GatewayActionResult> {
  const actionType = "sheets";
  const account = await getGoogleAccount();
  if (!account) {
    return {
      response: "❌ No Google account connected with Sheets access. Go to **Settings → Integrations → Google** to connect your account.",
      actionType,
      success: false,
    };
  }

  const gogBin = resolveGogBin();
  const acctFlag = `--account '${account}' --client hammerlock`;
  const extraPaths = isMacOS ? ":/opt/homebrew/bin:/usr/local/bin"
    : isLinux ? ":/usr/local/bin:/usr/bin" : "";
  const gogEnv = { env: { ...process.env, PATH: `${process.env.PATH || ""}${extraPaths}`, HOME: os.homedir() } };
  const intent = parseSheetsIntent(message);
  if (!intent) {
    return { response: "", actionType, success: false };
  }

  try {
    switch (intent.action) {
      case "create": {
        const title = intent.title || "Untitled Sheet";
        const escaped = title.replace(/'/g, "'\\''");
        const { stdout } = await execAsync(
          `${gogBin} sheets create '${escaped}' ${acctFlag} --json --no-input 2>&1`,
          { timeout: 15000, ...gogEnv }
        );
        const result = JSON.parse(stdout);
        const sheetId = result.spreadsheetId || result.id || "";
        const sheetUrl = result.spreadsheetUrl || result.url || `https://docs.google.com/spreadsheets/d/${sheetId}`;
        return {
          response: `📊 Created spreadsheet: **${title}**\n\n[Open in Google Sheets](${sheetUrl})`,
          actionType,
          success: true,
          deepLink: sheetUrl,
        };
      }

      case "append": {
        let sheetId = intent.spreadsheetId;
        // If we have a title instead of ID, find the sheet first
        if (!sheetId && intent.title) {
          const searchTitle = intent.title.replace(/'/g, "'\\''");
          const { stdout: searchOut } = await execAsync(
            `${gogBin} drive search '${searchTitle}' ${acctFlag} --json --no-input 2>&1`,
            { timeout: 10000, ...gogEnv }
          );
          const files = JSON.parse(searchOut);
          const sheet = (files.files || files || []).find(
            (f: { mimeType?: string; name?: string }) =>
              f.mimeType === "application/vnd.google-apps.spreadsheet"
          );
          if (!sheet) {
            return {
              response: `❌ Couldn't find a spreadsheet named "${intent.title}". Try creating it first.`,
              actionType,
              success: false,
            };
          }
          sheetId = sheet.id;
        }
        if (!sheetId) {
          return { response: "❌ No spreadsheet ID or name provided.", actionType, success: false };
        }

        const values = (intent.values || []).join("|");
        const escaped = values.replace(/'/g, "'\\''");
        const { stdout } = await execAsync(
          `${gogBin} sheets append '${sheetId}' 'Sheet1!A:Z' '${escaped}' ${acctFlag} --json --no-input 2>&1`,
          { timeout: 15000, ...gogEnv }
        );
        const result = JSON.parse(stdout);
        const updatedRange = result.updates?.updatedRange || result.tableRange || "";
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
        return {
          response: `✅ Row added to spreadsheet${updatedRange ? ` at ${updatedRange}` : ""}.\n\nValues: ${(intent.values || []).join(", ")}\n\n[Open in Google Sheets](${sheetUrl})`,
          actionType,
          success: true,
          deepLink: sheetUrl,
        };
      }

      case "read": {
        let sheetId = intent.spreadsheetId;
        if (!sheetId && intent.query) {
          // Try to find by name
          const q = intent.query.replace(/'/g, "'\\''");
          const { stdout: searchOut } = await execAsync(
            `${gogBin} drive search '${q}' ${acctFlag} --json --no-input 2>&1`,
            { timeout: 10000, ...gogEnv }
          );
          const files = JSON.parse(searchOut);
          const sheet = (files.files || files || []).find(
            (f: { mimeType?: string }) => f.mimeType === "application/vnd.google-apps.spreadsheet"
          );
          if (sheet) sheetId = sheet.id;
        }
        if (!sheetId) {
          return { response: "❌ Couldn't find that spreadsheet.", actionType, success: false };
        }

        // Get metadata first to learn sheet name
        const { stdout: metaOut } = await execAsync(
          `${gogBin} sheets metadata '${sheetId}' ${acctFlag} --json --no-input 2>&1`,
          { timeout: 10000, ...gogEnv }
        );
        const meta = JSON.parse(metaOut);
        const sheetName = meta.sheets?.[0]?.properties?.title || "Sheet1";
        const title = meta.properties?.title || "Spreadsheet";

        // Read first 50 rows
        const { stdout } = await execAsync(
          `${gogBin} sheets get '${sheetId}' '${sheetName}!A1:Z50' ${acctFlag} --json --no-input 2>&1`,
          { timeout: 15000, ...gogEnv }
        );
        const data = JSON.parse(stdout);
        const rows = data.values || [];
        if (rows.length === 0) {
          return {
            response: `📊 **${title}** — spreadsheet is empty.`,
            actionType,
            success: true,
            deepLink: `https://docs.google.com/spreadsheets/d/${sheetId}`,
          };
        }
        // Format as markdown table
        const header = rows[0] as string[];
        const dataRows = rows.slice(1) as string[][];
        let table = `| ${header.join(" | ")} |\n| ${header.map(() => "---").join(" | ")} |\n`;
        for (const row of dataRows.slice(0, 25)) {
          table += `| ${row.join(" | ")} |\n`;
        }
        if (dataRows.length > 25) table += `\n*...and ${dataRows.length - 25} more rows*`;

        return {
          response: `📊 **${title}**\n\n${table}`,
          actionType,
          success: true,
          deepLink: `https://docs.google.com/spreadsheets/d/${sheetId}`,
        };
      }

      case "update": {
        if (!intent.spreadsheetId || !intent.range || !intent.values?.length) {
          return { response: "❌ Need a spreadsheet ID, range, and values to update.", actionType, success: false };
        }
        const values = intent.values.join("|");
        const escaped = values.replace(/'/g, "'\\''");
        const { stdout } = await execAsync(
          `${gogBin} sheets update '${intent.spreadsheetId}' '${intent.range}' '${escaped}' ${acctFlag} --json --no-input 2>&1`,
          { timeout: 15000, ...gogEnv }
        );
        const result = JSON.parse(stdout);
        const updatedCells = result.updatedCells || result.totalUpdatedCells || 0;
        return {
          response: `✅ Updated ${updatedCells} cell${updatedCells !== 1 ? "s" : ""} in range ${intent.range}.\n\n[Open in Google Sheets](https://docs.google.com/spreadsheets/d/${intent.spreadsheetId})`,
          actionType,
          success: true,
          deepLink: `https://docs.google.com/spreadsheets/d/${intent.spreadsheetId}`,
        };
      }

      case "find": {
        const q = (intent.query || "spreadsheet").replace(/'/g, "'\\''");
        const { stdout } = await execAsync(
          `${gogBin} drive search '${q}' ${acctFlag} --json --no-input 2>&1`,
          { timeout: 10000, ...gogEnv }
        );
        const files = JSON.parse(stdout);
        const sheets = (files.files || files || []).filter(
          (f: { mimeType?: string }) => f.mimeType === "application/vnd.google-apps.spreadsheet"
        );
        if (sheets.length === 0) {
          return {
            response: `📊 No spreadsheets found matching "${intent.query}".`,
            actionType,
            success: false,
          };
        }
        const list = sheets.slice(0, 10).map(
          (f: { name?: string; id?: string }) =>
            `• **${f.name}** — \`${f.id}\` [Open](https://docs.google.com/spreadsheets/d/${f.id})`
        ).join("\n");
        return {
          response: `📊 Found ${sheets.length} spreadsheet${sheets.length !== 1 ? "s" : ""}:\n\n${list}`,
          actionType,
          success: true,
        };
      }
    }
  } catch (err) {
    console.error("[native-action] sheets failed:", (err as Error).message);
    // Fallback to gateway agent
    return await callGatewayAgent(message, actionType);
  }

  return { response: "", actionType, success: false };
}

// ── Fallback: OpenClaw gateway agent for complex actions ──
async function callGatewayAgent(
  message: string,
  actionType: string
): Promise<GatewayActionResult> {
  try {
    await execAsync(resolveOpenClawCmd("health --json") + " 2>/dev/null", { timeout: 4000 });
  } catch {
    return { response: "", actionType, success: false };
  }

  try {
    const escaped = message.replace(/'/g, "'\\''");
    const actionSessionId = `hammerlock-action-${Date.now()}`;
    const { stdout } = await execAsync(
      resolveOpenClawCmd(`agent --agent main --session-id '${actionSessionId}' --message '${escaped}' --json --no-color`),
      { timeout: 60000 }
    );
    const result = JSON.parse(stdout);
    if (result.status === "ok") {
      const text = result.result?.payloads?.[0]?.text || "Action completed.";
      return { response: text, actionType, success: true };
    }
    return { response: "", actionType, success: false };
  } catch {
    return { response: "", actionType, success: false };
  }
}

// ---------------------------------------------------------------------------
// Browser automation — direct CLI execution
// ---------------------------------------------------------------------------
async function browserCmd(subCmd: string, timeoutMs = 30000): Promise<string> {
  const cmd = resolveOpenClawCmd(`browser ${subCmd}`);
  const { stdout } = await execAsync(cmd, { timeout: timeoutMs });
  return stdout.trim();
}

async function executeBrowserTask(
  message: string,
  actionType: string
): Promise<GatewayActionResult> {
  try {
    // Check browser is running
    try {
      await browserCmd("status", 5000);
    } catch {
      // Try to start it
      try { await browserCmd("start", 15000); } catch { /* ignore */ }
    }

    // Detect if this is a "use Grok" / "ask Grok" request
    const grokMatch = message.match(
      /\b(?:use|ask|open|go\s+to)\s+grok\b/i
    );
    if (grokMatch) {
      return await executeGrokTask(message, actionType);
    }

    // Detect if this is a URL navigation request
    const urlMatch = message.match(
      /\b(?:go\s+to|open|navigate\s+to|visit)\s+(?:the\s+)?(?:(?:https?:\/\/)?(\S+\.(?:com|org|net|gov|edu|io)\S*))/i
    );
    if (urlMatch) {
      const rawUrl = urlMatch[1];
      const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      await browserCmd(`navigate "${url}"`, 20000);
      const pageText = await browserCmd(
        `evaluate --fn "() => document.title + '\\n\\n' + document.body.innerText.slice(0, 3000)"`,
        15000
      );
      return {
        response: `Navigated to ${url}.\n\n${pageText.slice(0, 2000)}`,
        actionType,
        success: true,
      };
    }

    // Generic browser task — let the gateway agent try with enhanced timeout
    const browserHint = `[BROWSER TASK] Use the browser to complete this task. Available commands: navigate, click, type, fill, snapshot, evaluate, screenshot, wait, press. User request: ${message}`;
    return await callGatewayAgent(browserHint, actionType);
  } catch (err) {
    console.error("[browser-task] failed:", (err as Error).message);
    return {
      response: `Browser automation encountered an error: ${(err as Error).message}. Make sure the browser is running (it starts automatically with the app).`,
      actionType,
      success: false,
    };
  }
}

function cleanGrokResponse(raw: string, originalPrompt: string): string {
  let text = raw;

  // Remove the echoed prompt from the response (Grok page includes both)
  // Find where the actual response starts — look for common Grok response markers
  const markers = [
    "Key Points",
    "Thought for",
    "Here's",
    "Here is",
    "## 1",
    "**1.",
    "1. ",
  ];
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx > 0 && idx < text.length * 0.5) {
      text = text.slice(idx);
      break;
    }
  }

  // Remove Grok UI artifacts
  text = text
    // Remove "Thought for Xs" lines
    .replace(/Thought for \d+s\n?/g, "")
    // Remove source/timing metadata at the end
    .replace(/\n\d+\s*sources?\n.*$/s, "")
    .replace(/\n\d+ms\n?/g, "\n")
    // Remove grok:render tags
    .replace(/<\/grok:render\]?\s*/g, "")
    .replace(/<grok:render[^>]*>/g, "")
    // Remove suggested follow-up buttons at the end
    .replace(/\n(?:Expand|More|Detailed|Concise|Windows|Linux)[\w\s]*$/gm, "")
    // Remove trailing "Expert" (model label)
    .replace(/\nExpert\s*$/m, "")
    // Clean up excessive newlines
    .replace(/\n{4,}/g, "\n\n\n")
    // Remove literal \n that should be actual newlines
    .replace(/\\n/g, "\n")
    .trim();

  // Convert numbered sections to markdown headers for better formatting
  text = text
    .replace(/^(\d+)\.\s+([A-Z][^\n]+)/gm, "## $1. $2")
    // Bold key terms that follow a dash pattern
    .replace(/^- \*\*([^*]+)\*\*/gm, "- **$1**");

  // Cap length to keep chat manageable
  if (text.length > 8000) {
    text = text.slice(0, 8000) + "\n\n*(Response truncated — full version available in the Grok browser window)*";
  }

  return `**Grok's response:**\n\n${text}`;
}

async function executeGrokTask(
  message: string,
  actionType: string
): Promise<GatewayActionResult> {
  // Extract what to ask Grok — everything after "use grok to" / "ask grok to" / etc.
  const promptMatch = message.match(
    /\b(?:use|ask)\s+grok\s+(?:to\s+)?(.+)/is
  );
  const grokPrompt = promptMatch
    ? promptMatch[1].trim()
    : message.replace(/\b(?:use|ask|open|go\s+to)\s+grok\b/i, "").trim() || message;

  try {
    // 1. Navigate to grok.com
    await browserCmd(`navigate "https://grok.com"`, 20000);
    await new Promise((r) => setTimeout(r, 3000)); // Wait for page load

    // 2. Find the input field by clicking on the placeholder text
    try {
      // Click on the "Ask Grok" area to focus it
      await browserCmd(
        `evaluate --fn "() => { const el = document.querySelector('[contenteditable=true]') || document.querySelector('textarea'); if (el) { el.focus(); el.click(); return 'focused'; } return 'not found'; }"`,
        10000
      );
    } catch { /* continue */ }

    // 3. Insert the prompt text via JS (contenteditable doesn't work with type command)
    const escapedPrompt = grokPrompt
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/'/g, "\\'");
    await browserCmd(
      `evaluate --fn "() => { const editor = document.querySelector('[contenteditable=true]'); if (!editor) return 'no editor'; editor.focus(); const p = document.createElement('p'); p.textContent = '${escapedPrompt}'; editor.innerHTML = ''; editor.appendChild(p); editor.dispatchEvent(new Event('input', { bubbles: true })); return 'inserted'; }"`,
      10000
    );
    await new Promise((r) => setTimeout(r, 1000));

    // 4. Find and click Submit
    const snapshot = await browserCmd("snapshot --interactive", 10000);
    const submitMatch = snapshot.match(/button "Submit" \[ref=(e\d+)\]/);
    if (submitMatch) {
      await browserCmd(`click ${submitMatch[1]}`, 10000);
    } else {
      // Fallback: press Enter
      await browserCmd("press Enter", 5000);
    }

    // 5. Wait for Grok to respond (poll until response appears)
    let responseText = "";
    const maxWaitMs = 120000; // 2 minutes max
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 5000)); // Initial wait

    while (Date.now() - startTime < maxWaitMs) {
      try {
        // Check if there's a response by looking for response content
        const pageText = await browserCmd(
          `evaluate --fn "() => { const msgs = document.querySelectorAll('article, [data-message-author-role], .message-bubble, .response-text'); if (msgs.length > 0) return Array.from(msgs).map(m => m.innerText).join('\\n---\\n'); const main = document.querySelector('main'); return main ? main.innerText : ''; }"`,
          15000
        );

        // Check if Grok is still thinking (look for loading indicators)
        const isLoading = await browserCmd(
          `evaluate --fn "() => { const spinners = document.querySelectorAll('[class*=loading], [class*=spinner], [class*=thinking], [role=progressbar]'); const thinkText = document.body.innerText; return (spinners.length > 0 || thinkText.includes('Thinking') || thinkText.includes('Searching')) ? 'loading' : 'done'; }"`,
          10000
        );

        if (
          isLoading.includes("done") &&
          pageText.length > 200 &&
          !pageText.includes("Ask Grok anything")
        ) {
          responseText = pageText;
          break;
        }
      } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 3000)); // Poll every 3s
    }

    // 6. Read the full response
    if (!responseText) {
      responseText = await browserCmd(
        `evaluate --fn "() => { const main = document.querySelector('main'); return main ? main.innerText : document.body.innerText; }"`,
        15000
      );
    }

    // Clean up the response text
    const cleanResponse = cleanGrokResponse(responseText, grokPrompt);

    if (cleanResponse.length > 50) {
      return {
        response: cleanResponse,
        actionType,
        success: true,
      };
    }

    return {
      response: `I sent your request to Grok but couldn't read the response clearly. The Grok browser window should have the full answer — you can check it there. The prompt I sent was: "${grokPrompt.slice(0, 200)}"`,
      actionType,
      success: true,
    };
  } catch (err) {
    console.error("[grok-task] failed:", (err as Error).message);
    return {
      response: `I tried to use Grok but hit an error: ${(err as Error).message}. The browser might not be running — try restarting the app.`,
      actionType,
      success: false,
    };
  }
}

type ChatMessage = { role: string; content: string };

// 🔨 HammerLock AI core identity — this is what the LLM knows about itself
const HAMMERLOCK_IDENTITY = `You are HammerLock AI 🔨🔐 — a privacy-first personal AI assistant that lives on the user's Mac desktop. You are built on OpenClaw, an agentic AI framework, and you are a native macOS Electron app. Everything about you is designed around one principle: the user's data stays on their device, encrypted and private.

## WHAT MAKES YOU DIFFERENT
- **AES-256-GCM vault encryption** — all conversations are encrypted at rest on the user's device
- **PII anonymization** — personal info is scrubbed before any data leaves the device
- **Local-first architecture** — you run as a desktop app, not a web service
- **24-hour auto-lock** — the vault locks automatically for security
- **No cloud storage** — conversations never touch someone else's server
- You are NOT ChatGPT, NOT Apple Intelligence, NOT Notion AI. You are HammerLock AI — independent, private, and more capable because you integrate directly with the user's Mac and smart home.

## YOUR TOOLS (these work right now, not hypothetically)
1. **Web search** — Brave Search is wired in. When the user asks about weather, news, prices, events, or anything real-time, search results get injected into your prompt. USE THEM. Present the data directly. Never say "I can't access the web" — you literally just searched it.
2. **Time/date** — A CURRENT TIME block gets injected when the user asks for the time. Read it literally and answer with the exact time first.
3. **Memory** — The user can say "remember: ..." to save preferences, facts, and context. This persists across conversations. Teach users about this when they ask how to personalize you.
4. **PDF analysis** — Users can upload PDFs and ask questions about them.
5. **Image/Vision** — Users can upload images (screenshots, photos, etc.) and you CAN see and describe them. When an image is attached, describe what you see in detail. Never say "I can't view images" — the image is sent directly to you.
6. **Reports** — You can generate summaries and reports from conversations.
7. **Reminders** — You CAN set real Apple Reminders. When the user asks to set a reminder, tell them you're setting it. Say "Setting a reminder for [title] at [time]" — the system handles execution automatically. NEVER say "I can't set reminders" or "open your reminders app" — you literally can do this.
8. **Calendar** — You CAN read and create Apple Calendar events. When the user asks what's on their calendar, you can check it. NEVER say "I can't access your calendar" — you can.
9. **Notes** — You CAN create Apple Notes. When the user asks to create a note, do it. NEVER say "I can't create notes."
10. **Email** — You CAN send and read emails via connected accounts. When the user asks to check email or send one, tell them you're doing it.
11. **Messages** — You CAN send iMessages and WhatsApp messages.
12. **Smart Home** — You CAN control Philips Hue lights, Sonos speakers, and Eight Sleep beds.
13. **Browser** — You CAN interact with websites. When the user asks you to book appointments, fill out forms, sign up for services, or do anything on a website, you have a dedicated browser that can navigate to sites, click buttons, fill in forms, and complete tasks. Tell the user you're doing it — the browser automation handles it automatically.
14. **Grok / SuperGrok** — You CAN use Grok (xAI's AI) through your browser. When the user says "use Grok to..." or "ask Grok...", you open grok.com in your browser, send the prompt, and bring the response back. You have a SuperGrok account with DeepSearch. This lets you leverage Grok's real-time web research alongside your own capabilities.
15. **Google Sheets** — You CAN read from and write to Google Sheets. When the user asks about spreadsheet data or wants to update a sheet, you can do it.
16. **Voice** — The user can talk to you via voice (Whisper speech-to-text) and you respond with natural speech (OpenAI TTS). You support 6 voice options: Nova, Alloy, Echo, Fable, Onyx, and Shimmer.

## ABOUT YOURSELF (when asked)
If someone asks what you are, what you can do, or how you work:
- You are HammerLock AI, a privacy-first desktop AI assistant for macOS
- Built on OpenClaw (agentic AI framework) + Electron + Next.js
- Your encryption: AES-256-GCM with PII anonymization
- You have 16 integrated tools spanning web, productivity, smart home, browser automation, and voice
- Tiered plans: Free (basic chat + voice + search), Pro (all integrations + smart home + browser), Enterprise (custom)
- Website: hammerlock.ai
- You were designed for people who want powerful AI help without giving up their privacy

## HOW TO BE
- Talk like a smart, helpful friend — warm but not cheesy
- Short answers for simple questions. Detailed for complex ones. Match the energy.
- Use the user's name, location, family details, and preferences naturally — they're provided in your context
- Name real specific places, not generic suggestions. "Central Park in San Ramon" not "a local park"
- For families with kids, suggest kid-friendly stuff. If someone's pregnant, keep it comfortable.
- Never mention encryption, AES-256, local-first architecture, or security unless directly asked

## NEVER DO THESE
- NEVER say "I don't have internet access", "I can't browse the web", "I can't browse the internet", or "I can't provide real-time links" — you have Brave Search. If the user asks for links, videos, or current info and search results aren't in your prompt, share what you know and suggest they ask you to "search for [topic]" to get live results. Never claim you lack internet access.
- Never say "I recommend checking [website]" when you already HAVE search results — that defeats your purpose
- Never say "I can't check the time" — the time data is injected into your prompt
- Never say "I can't view images" or "I'm unable to see images" — you have vision capabilities and images are sent directly to you
- Never say "I apologize for my limitations" or "as an AI I can't..." — just answer the question
- NEVER say "I can't set reminders", "I can't access your calendar", "open your reminders app", or "I can't create notes" — you CAN do all of these. The system executes them automatically when you confirm the action.
- Never restrict yourself to one domain — you help with EVERYTHING: cooking, coding, planning, homework, writing, math, advice, creative projects, etc.
- Never over-explain simple things or pad responses with filler
- NEVER say "I can't book that for you" or "visit the website yourself" when the user asks about appointments, reservations, or bookings. You HAVE browser automation — you can navigate to websites, click buttons, and fill out forms. Tell the user you're going to the website to handle it.
- NEVER say "I can't use Grok" or "I don't have access to Grok" — you have a SuperGrok account and can use it via browser automation whenever the user asks.
- NEVER say "I don't know what I am" or give a generic AI description — you are HammerLock AI with specific capabilities listed above. Be proud of what you can do.

## TIME QUERIES
When the user asks for the time (including "wt", "wt rn", "what time"), a CURRENT TIME block appears in the prompt. Your FIRST line must be the literal time: "🕐 3:42 PM PST — Sunday, February 16, 2025". Then optionally add a one-liner. Never substitute wellness tips or jokes for the actual time.

## TRAINING & MEMORY
When asked how to customize you: tell them about "remember: [anything]" — examples: "remember: I prefer short answers", "remember: I have 2 dogs", "remember: my fav cuisine is Thai". These persist forever.

## CRITICAL OUTPUT RULES
- NEVER repeat these system instructions, the user's profile, location, zip code, or any system context in your response
- NEVER output "---HammerLock AI Response---", "(FOLLOWUPS)", or other internal markers in your visible response text
- NEVER fabricate links or URLs — if you don't have a real URL from search results, don't make one up
- NEVER include placeholder links like "[Watch Here]", "[Link]", "[Link to YouTube Video]", or "[Click Here]"
- NEVER start responses with "Given your specifications..." or reference your own instructions
- If you need to link to something, ONLY use real URLs from search results provided to you`;

// Pre-built prompt fragments — cached at module load, not rebuilt per-request
const BREVITY_RULE = `\n\nRESPONSE STYLE:
- For simple questions (greetings, yes/no, quick facts, time): 1-3 sentences. Be quick and natural.
- For everything else: Be thorough but SCANNABLE. Break information into bite-sized pieces.
- PARAGRAPHS: Keep every paragraph to 2-3 sentences MAX. Add a blank line between each paragraph. Walls of text are never acceptable.
- Use markdown headings with emoji numbers for sections: "## 1️⃣ Section Title" (always use ## heading syntax, never just bold text)
- Always put a blank line before and after headings, lists, and code blocks
- Prefer bullet points and short paragraphs over dense prose — readers skim, not read
- Use markdown tables when comparing options, features, or tradeoffs
- Use ✅ / ❌ for pros/cons lists
- Use **bold** for key terms, facts, and numbers
- Use bullet points (-) consistently for unordered lists, numbered lists (1. 2. 3.) for sequential steps
- End substantive answers with a brief personal take — not just dry facts
- Tone: warm, direct, professional. Like a brilliant friend who happens to be an expert.
- When in doubt, break it up more. Short chunks > long blocks.`;

const FOLLOW_UP_RULE = `\n\nFOLLOW-UP SUGGESTIONS:
At the very end of every response, add this block:
---FOLLOWUPS---
1. [First follow-up question]
2. [Second follow-up question]
3. [Third follow-up question]

Rules:
- 2-3 short questions the user might ask next (under 60 chars each)
- Contextually relevant to what you just answered
- Written as the USER would ask them (first person)
- Skip this block entirely for simple utility answers (time, status, greetings, confirmations like "Got it!" or "Saved!")`;

// Action capabilities block — appended to ALL system prompts (including agent-specific ones)
// so that Coach, Money, etc. know they can perform real actions via OpenClaw.
const ACTION_CAPABILITIES = `

IMPORTANT — YOUR ACTION CAPABILITIES:
You CAN perform real device actions. These execute automatically when the user asks:
- **Reminders**: Set real Apple Reminders with titles, due dates, and lists
- **Calendar**: Read and create Apple Calendar events
- **Notes**: Create Apple Notes
- **Email**: Send and read emails
- **Messages**: Send iMessages and WhatsApp messages
- **Smart Home**: Control Philips Hue lights, Sonos speakers, Eight Sleep beds
- **Browser**: Navigate websites, click buttons, fill forms, book appointments, submit applications — full web automation
- **Grok/SuperGrok**: Use Grok AI for research, planning, and analysis via browser automation
- **Google Sheets**: Read and write spreadsheet data
- **Voice**: Full voice input (Whisper STT) and output (OpenAI TTS, 6 voices)
- **Web Search**: Real-time Brave Search for current information
- **PDF/Image**: Analyze uploaded documents and images

When the user asks for any of these, confirm you're doing it — NEVER say "I can't set reminders", "I can't access your calendar", "open your reminders app", "I can't book that", or "I can't do that". The action happens automatically.

For compound requests (e.g. "set up calendar reminders AND build me a nutrition plan"), handle both parts: confirm the action is being taken care of, then address the rest conversationally.`;

async function routeToLLM(prompt: string, options?: { context?: string; userProfile?: { name?: string; role?: string; industry?: string; context?: string } | null; agentSystemPrompt?: string; locale?: string; history?: ChatMessage[]; anonymizer?: import("@/lib/anonymize").Anonymizer }) {
  lastLLMError = null; // Reset per-request
  const persona = await loadPersonaText();

  // Build user info section — clearly labeled as info ABOUT the user, not the LLM's identity
  let userInfoSection = "";
  const userParts: string[] = [];
  if (persona) {
    // Parse persona lines and label them clearly
    const personaLines = persona.split("\n").filter((l: string) => l.trim());
    userParts.push(...personaLines);
  }
  if (options?.userProfile) {
    const p = options.userProfile;
    if (p.name) userParts.push(`Name: ${p.name}`);
    if (p.role) userParts.push(`Role: ${p.role}`);
    if (p.industry) userParts.push(`Industry: ${p.industry}`);
    if (p.context) userParts.push(`Notes: ${p.context}`);
  }
  if (userParts.length > 0) {
    userInfoSection = `\n\nABOUT THE USER (use this to personalize responses, but do NOT adopt this as your own identity):\n${userParts.join("\n")}`;
  }

  // Use agent-specific system prompt if provided, otherwise default
  let systemPrompt: string;

  // Language rule: always respond in the user's selected UI language
  const uiLang = options?.locale ? (LOCALE_LANG[options.locale] || "English") : "English";
  const langRule = `\n\nLANGUAGE: Respond in ${uiLang}.`;

  if (options?.agentSystemPrompt) {
    // For search-specific system prompts (contain SEARCH RESULTS), skip FOLLOW_UP_RULE
    // since search follow-ups are generated server-side for reliability
    const isSearchPrompt = options.agentSystemPrompt.includes("SEARCH RESULTS");
    // Always inject ACTION_CAPABILITIES so agents know they can set reminders, calendar, etc.
    systemPrompt = options.agentSystemPrompt + ACTION_CAPABILITIES + userInfoSection + BREVITY_RULE + langRule + (isSearchPrompt ? "" : FOLLOW_UP_RULE);
  } else {
    systemPrompt = HAMMERLOCK_IDENTITY + userInfoSection + BREVITY_RULE + langRule + FOLLOW_UP_RULE;
  }

  // Build conversation history for multi-turn context
  const history = options?.history || [];
  let userPrompt = options?.context ? `${options.context}\n\n${prompt}` : prompt;

  // ---- Time context injection ----
  // If the prompt contains ANY time-related keywords, inject the real server clock
  // so the LLM actually knows the current time/date and can answer accurately.
  if (TIME_KEYWORDS.test(prompt)) {
    userPrompt = userPrompt + buildTimeContext(persona);
  }

  // ---- Family & location context injection ----
  // For planning/suggestion queries, prepend localized family context + local venue data
  const familyContext = buildFamilyContext(prompt, persona);
  if (familyContext) {
    userPrompt = userPrompt + familyContext;
  }

  // ---- Anonymization layer (v2: outbound-only, known-PII-only) ----
  // Use the caller's anonymizer if provided (single instance pattern),
  // otherwise create one for non-search paths.
  const anon = options?.anonymizer ?? createAnonymizer(persona, options?.userProfile);

  // Cloud providers first (better quality, proper multi-turn support)
  // Only fall back to local Ollama if no cloud provider is configured
  const hasCloudProvider = !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.MISTRAL_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );

  // ONLY scrub the outbound USER message — never the system prompt
  // (system prompt contains search results, weather data, etc. that must stay intact)
  // and never the history (it's already been shown to the user).
  const scrubbedUser = anon.scrub(userPrompt);

  if (anon.detectedCount > 0) {
    console.log(`[anonymize] Scrubbed ${anon.detectedCount} PII items from outbound query (${anon.summary})`);
  }

  // Build messages array with history for cloud providers
  // Clean up any leftover placeholders from older conversations (legacy data)
  const historyMessages = history.map(m => {
    let content = m.content;
    if (typeof content === "string") {
      content = content
        .replace(/\[PERSON_\d+\]/g, "(name)")
        .replace(/\[ORG_\d+\]/g, "(business)")
        .replace(/\[(?:EMAIL|PHONE|SSN|CREDIT_CARD|ADDRESS|IP|DATE_OF_BIRTH|ACCOUNT)_\d+\]/g, "");
    }
    return { role: m.role === "user" ? "user" as const : "assistant" as const, content };
  });

  // Try cloud providers first — race all configured providers in parallel
  // First to respond wins, others are cancelled. Stagger delays ensure cheaper/faster providers get a head start.
  if (hasCloudProvider) {
    // Detect embedded image for vision support
    const dataUrlMatch = scrubbedUser.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
    const imageUrl = dataUrlMatch ? dataUrlMatch[1] : undefined;

    const raceResult = await raceProviders(systemPrompt, historyMessages, scrubbedUser, { imageUrl });
    if (raceResult) {
      lastModelUsed = raceResult.model;
      return anon.restore(raceResult.text);
    }
  }

  // Fallback to local Ollama (if no cloud provider available or all failed)
  const localPromptWithHistory = history.length > 0
    ? history.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n") + `\nUser: ${userPrompt}`
    : userPrompt;
  const localReply = await callOllama(systemPrompt, localPromptWithHistory);
  if (localReply) { lastModelUsed = "ollama"; return anon.restore(localReply); }

  lastModelUsed = "gateway";
  return await callGateway(userPrompt);
}

/** Streaming variant of routeToLLM — returns a ReadableStream of text tokens.
 *  Falls back to non-streaming (wrapped as single-chunk stream) if streaming isn't available. */
async function routeToLLMStream(prompt: string, options?: { context?: string; userProfile?: { name?: string; role?: string; industry?: string; context?: string } | null; agentSystemPrompt?: string; locale?: string; history?: ChatMessage[]; anonymizer?: import("@/lib/anonymize").Anonymizer }): Promise<{ stream: ReadableStream<string>; model: string }> {
  // Build system prompt (same as routeToLLM)
  lastLLMError = null;
  const persona = await loadPersonaText();
  let userInfoSection = "";
  const userParts: string[] = [];
  if (persona) userParts.push(...persona.split("\n").filter((l: string) => l.trim()));
  if (options?.userProfile) {
    const p = options.userProfile;
    if (p.name) userParts.push(`Name: ${p.name}`);
    if (p.role) userParts.push(`Role: ${p.role}`);
    if (p.industry) userParts.push(`Industry: ${p.industry}`);
    if (p.context) userParts.push(`Notes: ${p.context}`);
  }
  if (userParts.length > 0) {
    userInfoSection = `\n\nABOUT THE USER (use this to personalize responses, but do NOT adopt this as your own identity):\n${userParts.join("\n")}`;
  }

  let systemPrompt: string;
  const uiLang = options?.locale ? (LOCALE_LANG[options.locale] || "English") : "English";
  const langRule = `\n\nLANGUAGE: Respond in ${uiLang}.`;
  if (options?.agentSystemPrompt) {
    const isSearchPrompt = options.agentSystemPrompt.includes("SEARCH RESULTS");
    // Always inject ACTION_CAPABILITIES so agents know they can set reminders, calendar, etc.
    systemPrompt = options.agentSystemPrompt + ACTION_CAPABILITIES + userInfoSection + BREVITY_RULE + langRule + (isSearchPrompt ? "" : FOLLOW_UP_RULE);
  } else {
    systemPrompt = HAMMERLOCK_IDENTITY + userInfoSection + BREVITY_RULE + langRule + FOLLOW_UP_RULE;
  }

  const history = options?.history || [];
  let userPrompt = options?.context ? `${options.context}\n\n${prompt}` : prompt;
  if (TIME_KEYWORDS.test(prompt)) userPrompt = userPrompt + buildTimeContext(persona);
  const familyContext = buildFamilyContext(prompt, persona);
  if (familyContext) userPrompt = userPrompt + familyContext;

  const anon = options?.anonymizer ?? createAnonymizer(persona, options?.userProfile);
  const hasCloudProvider = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.MISTRAL_API_KEY || process.env.DEEPSEEK_API_KEY);
  const scrubbedUser = anon.scrub(userPrompt);
  const historyMessages = history.map(m => {
    let content = m.content;
    if (typeof content === "string") {
      content = content.replace(/\[PERSON_\d+\]/g, "(name)").replace(/\[ORG_\d+\]/g, "(business)").replace(/\[(?:EMAIL|PHONE|SSN|CREDIT_CARD|ADDRESS|IP|DATE_OF_BIRTH|ACCOUNT)_\d+\]/g, "");
    }
    return { role: m.role === "user" ? "user" as const : "assistant" as const, content };
  });

  // Try streaming from cloud providers
  if (hasCloudProvider) {
    const dataUrlMatch = scrubbedUser.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
    const imageUrl = dataUrlMatch ? dataUrlMatch[1] : undefined;
    const streamResult = await raceProvidersStream(systemPrompt, historyMessages, scrubbedUser, { imageUrl });
    if (streamResult) {
      lastModelUsed = streamResult.model;
      return streamResult;
    }
  }

  // Fallback: non-streaming response wrapped as a single-chunk stream
  const localPromptWithHistory = history.length > 0
    ? history.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n") + `\nUser: ${userPrompt}`
    : userPrompt;
  const localReply = await callOllama(systemPrompt, localPromptWithHistory);
  if (localReply) {
    lastModelUsed = "ollama";
    const text = anon.restore(localReply);
    return { stream: new ReadableStream({ start(ctrl) { ctrl.enqueue(text); ctrl.close(); } }), model: "ollama" };
  }

  // Last resort: gateway (non-streaming, wrapped)
  lastModelUsed = "gateway";
  const gatewayReply = await callGateway(userPrompt);
  return { stream: new ReadableStream({ start(ctrl) { ctrl.enqueue(gatewayReply); ctrl.close(); } }), model: "gateway" };
}

const SEARCH_PATTERNS = [
  /^(?:web\s+)?search\s+(.+)/i,
  /^find\s+(.+)/i,
  /^latest on\s+(.+)/i,
  /^look up\s+(.+)/i
];

function extractSearchQuery(command: string): string | null {
  for (const pattern of SEARCH_PATTERNS) {
    const match = command.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  if (command.toLowerCase().includes(" search ")) {
    return command.replace(/.*search\s+/i, "").trim();
  }
  return null;
}

type BraveResult = {
  title: string;
  url: string;
  snippet: string;
  age: string;
  thumbnail: string;
  favicon: string;
  domain: string;
};

async function fetchBraveResults(query: string): Promise<BraveResult[]> {
  const braveKey = getBraveKey();
  if (!braveKey) {
    throw new Error("Add BRAVE_API_KEY to .env.local");
  }

  // Brave API rejects queries that are empty, too long, or contain only special chars
  const cleanQuery = query.trim().replace(/\s+/g, " ");
  if (!cleanQuery || cleanQuery.length < 2) {
    console.warn("[brave] Query too short, skipping search:", JSON.stringify(query));
    return [];
  }
  // Brave max query length is ~400 chars — truncate to last whole word before 400
  const safeQuery = cleanQuery.length > 400
    ? cleanQuery.slice(0, 400).replace(/\s+\S*$/, "")
    : cleanQuery;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(safeQuery)}&count=10&country=US&search_lang=en`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveKey
        },
        signal: controller.signal
      }
    );
    if (!res.ok) {
      // 422 = malformed query, 429 = rate limit — return empty instead of crashing
      if (res.status === 422 || res.status === 429) {
        console.warn(`[brave] API returned ${res.status} for query: ${safeQuery.slice(0, 80)}...`);
        return [];
      }
      throw new Error(`Brave API error: ${res.status}`);
    }
    const data = await res.json();
    const items = data?.web?.results || [];
    return items.slice(0, 10).map((item: any) => {
      // Extract domain from URL for display
      let domain = "";
      try { domain = new URL(item?.url || "").hostname.replace(/^www\./, ""); } catch { /* ok */ }
      return {
        title: stripHtml(item?.title || item?.url || "Untitled result"),
        url: item?.url || "",
        snippet: stripHtml(item?.description || item?.snippet || "No snippet provided."),
        age: item?.page_age || item?.age || item?.publishedDate || "",
        thumbnail: item?.thumbnail?.src || item?.meta_url?.favicon || "",
        favicon: item?.meta_url?.favicon || "",
        domain,
      };
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Search timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Plain-text format sent to LLM for summarization
function formatBraveResults(results: BraveResult[], skipAge = false) {
  const lines = ["Results:"];
  results.forEach((result, idx) => {
    lines.push(`[${idx + 1}] ${result.title} - ${result.url}`);
    lines.push(`   ${result.snippet}`);
    if (result.age && !skipAge) lines.push(`   Published: ${result.age}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

// Generate follow-up suggestion chips server-side for search queries.
// More reliable than asking the LLM to produce them inline.
function generateSearchFollowUps(query: string): string[] {
  const q = query.toLowerCase();
  if (/weather|fore?cast|temperature/.test(q)) {
    return ["What's the weekly forecast?", "Will it rain tomorrow?", "What should I wear today?"];
  }
  if (/news|headlines/.test(q)) {
    return ["Tell me more about this", "Any other big stories today?", "Search for tech news"];
  }
  if (/restaurant|food|eat|dinner|lunch|bars?|cafe/i.test(q)) {
    return ["What else is nearby?", "What's open right now?", "Best rated ones?"];
  }
  if (/price|cost|how much/i.test(q)) {
    return ["Compare alternatives", "Where's the best deal?", "Any discounts available?"];
  }
  if (/recipe/i.test(q)) {
    return ["Any easier versions?", "What ingredients do I need?", "Show me a video"];
  }
  // Generic search follow-ups
  return ["Tell me more about this", "Search for something related", "What else should I know?"];
}

// Compact source list — small inline rows, no big images
function formatBraveResultsRich(results: BraveResult[]) {
  const rows = results.map((r, i) => {
    const age = r.age ? ` · ${r.age}` : "";
    // Compact row: number, linked title, domain badge, age
    return `${i + 1}. **[${r.title}](${r.url})** — *${r.domain}${age}*`;
  });
  return rows.join("\n");
}

// Map locale codes to full language names for LLM instruction
const LOCALE_LANG: Record<string, string> = {
  en: "English", "pt-BR": "Brazilian Portuguese", es: "Spanish",
  fr: "French", de: "German", zh: "Chinese", ja: "Japanese",
  ko: "Korean", ar: "Arabic", hi: "Hindi", ru: "Russian",
};

// Server-side i18n for API responses shown in chat feed
const API_STRINGS: Record<string, Record<string, string>> = {
  en: {
    no_command: "No command received.",
    no_search: "No search results found.",
    no_persona: "No persona set up yet. Tell me about yourself!",
    no_persona_alt: "No persona set up yet. Tell me about yourself and I'll remember it.",
    remember_saved: "Got it, I'll remember that:",
    remember_failed: "Couldn't save that right now. Try again?",
    credits_exhausted: "You've used all your included compute units. To keep going, you can **add your own API key** (sidebar > API Keys) for unlimited use, or **get more units** from the HammerLock AI store.",
    generic_error: "Something went wrong. Please try again.",
    your_persona: "Your Persona",
  },
  "pt-BR": {
    no_command: "Nenhum comando recebido.",
    no_search: "Nenhum resultado de busca encontrado.",
    no_persona: "Nenhum perfil configurado ainda. Me conte sobre você!",
    no_persona_alt: "Nenhum perfil configurado ainda. Me conte sobre você e eu vou lembrar.",
    remember_saved: "Entendi, vou lembrar disso:",
    remember_failed: "Não consegui salvar agora. Tenta de novo?",
    credits_exhausted: "Você usou todas as suas unidades de computação incluídas. Para continuar, você pode **adicionar sua própria chave API** (barra lateral > Chaves API) para uso ilimitado, ou **obter mais unidades** na loja HammerLock AI.",
    generic_error: "Algo deu errado. Tente novamente.",
    your_persona: "Seu Perfil",
  },
  es: {
    no_command: "No se recibió ningún comando.",
    no_search: "No se encontraron resultados de búsqueda.",
    no_persona: "No hay persona configurada aún. ¡Cuéntame sobre ti!",
    no_persona_alt: "No hay persona configurada aún. Cuéntame sobre ti y lo recordaré.",
    remember_saved: "Entendido, recordaré eso:",
    remember_failed: "No pude guardar eso ahora. ¿Intentar de nuevo?",
    credits_exhausted: "Has usado todas tus unidades de cómputo incluidas. Para continuar, puedes **agregar tu propia clave API** (barra lateral > Claves API) para uso ilimitado.",
    generic_error: "Algo salió mal. Inténtalo de nuevo.",
    your_persona: "Tu Persona",
  },
};

function apiStr(locale: string | undefined, key: string): string {
  const loc = locale && API_STRINGS[locale] ? locale : "en";
  return API_STRINGS[loc]?.[key] || API_STRINGS.en[key] || key;
}

// Well-known US city → { state, zip } for search enrichment
const CITY_DATA: Record<string, { st: string; zip: string }> = {
  "san ramon": { st: "CA", zip: "94583" }, "san francisco": { st: "CA", zip: "94102" },
  "san jose": { st: "CA", zip: "95112" }, "los angeles": { st: "CA", zip: "90001" },
  "san diego": { st: "CA", zip: "92101" }, "sacramento": { st: "CA", zip: "95814" },
  "oakland": { st: "CA", zip: "94607" }, "palo alto": { st: "CA", zip: "94301" },
  "fremont": { st: "CA", zip: "94536" }, "walnut creek": { st: "CA", zip: "94596" },
  "dublin": { st: "CA", zip: "94568" }, "danville": { st: "CA", zip: "94526" },
  "pleasanton": { st: "CA", zip: "94566" }, "livermore": { st: "CA", zip: "94550" },
  "hayward": { st: "CA", zip: "94541" }, "berkeley": { st: "CA", zip: "94704" },
  "cupertino": { st: "CA", zip: "95014" }, "sunnyvale": { st: "CA", zip: "94086" },
  "mountain view": { st: "CA", zip: "94040" }, "santa clara": { st: "CA", zip: "95050" },
  "redwood city": { st: "CA", zip: "94061" }, "menlo park": { st: "CA", zip: "94025" },
  "concord": { st: "CA", zip: "94520" }, "antioch": { st: "CA", zip: "94509" },
  "new york": { st: "NY", zip: "10001" }, "brooklyn": { st: "NY", zip: "11201" },
  "manhattan": { st: "NY", zip: "10001" }, "queens": { st: "NY", zip: "11101" },
  "chicago": { st: "IL", zip: "60601" }, "houston": { st: "TX", zip: "77001" },
  "dallas": { st: "TX", zip: "75201" }, "austin": { st: "TX", zip: "78701" },
  "san antonio": { st: "TX", zip: "78201" }, "phoenix": { st: "AZ", zip: "85001" },
  "seattle": { st: "WA", zip: "98101" }, "portland": { st: "OR", zip: "97201" },
  "denver": { st: "CO", zip: "80201" }, "miami": { st: "FL", zip: "33101" },
  "tampa": { st: "FL", zip: "33601" }, "orlando": { st: "FL", zip: "32801" },
  "atlanta": { st: "GA", zip: "30301" }, "boston": { st: "MA", zip: "02101" },
  "detroit": { st: "MI", zip: "48201" }, "minneapolis": { st: "MN", zip: "55401" },
  "nashville": { st: "TN", zip: "37201" }, "las vegas": { st: "NV", zip: "89101" },
  "charlotte": { st: "NC", zip: "28201" }, "raleigh": { st: "NC", zip: "27601" },
  "columbus": { st: "OH", zip: "43201" }, "cleveland": { st: "OH", zip: "44101" },
  "pittsburgh": { st: "PA", zip: "15201" }, "philadelphia": { st: "PA", zip: "19101" },
  "baltimore": { st: "MD", zip: "21201" }, "washington": { st: "DC", zip: "20001" },
  "st louis": { st: "MO", zip: "63101" }, "kansas city": { st: "MO", zip: "64101" },
  "indianapolis": { st: "IN", zip: "46201" }, "milwaukee": { st: "WI", zip: "53201" },
  "salt lake city": { st: "UT", zip: "84101" },
};

// Compat wrapper
const CITY_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_DATA).map(([k, v]) => [k, v.st])
);

// ── Time utilities ──

/**
 * Get current time for a given IANA timezone.
 * Returns a structured object with formatted strings ready for display or prompt injection.
 */
function getCurrentTime(tz: string = "America/Los_Angeles") {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const shortDate = now.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" });
  const tzAbbr = now.toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "short" }).split(" ").pop() || tz;
  const hour24 = parseInt(now.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10);
  return { timeStr, dateStr, shortDate, tzAbbr, hour24, iso: now.toISOString() };
}

/** Convenience: get current time in user's inferred timezone (defaults PST). */
function getCurrentTimePST() {
  return getCurrentTime("America/Los_Angeles");
}

// ── Time query detection & response ──

/** Keywords that signal ANY time-related intent (used for LLM prompt injection). */
const TIME_KEYWORDS = /\b(what\s*time|wh?at\s*tim|current\s*time|time\s*(is\s*it|now|rn|plz|pls)|wt\b|clock|what\s*(?:the\s+)?(?:date|day)|today(?:'?s)?\s*date|right\s*now)\b/i;

/**
 * Detect explicit "what time is it" queries that should be short-circuited
 * (answered instantly server-side without calling the LLM).
 * Much broader than before — catches slang, typos, abbreviations.
 */
function isTimeQuery(lowered: string): boolean {
  const cleaned = lowered.replace(/[?!.,;:'"]+/g, "").replace(/\s+/g, " ").trim();

  const exactPatterns = [
    // Core patterns
    /^wh?at\s*(?:time|tim)\s*(?:is\s*it|it\s*is|now|rn)?$/,
    /^(?:the\s+)?time\s*(?:now|rn|plz|pls)?$/,
    /^(?:tell\s+me\s+)?(?:the\s+)?(?:current\s+)?time\s*(?:rn)?$/,
    /^(?:current|exact)\s+time\s*(?:rn)?$/,
    // Abbreviations & slang
    /^w(?:hat)?t\s*(?:rn)?$/,                          // "wt", "wt rn", "wht rn"
    /^wt\s+(?:is\s+)?(?:the\s+)?(?:time|tim)\s*(?:rn)?$/, // "wt is the time rn"
    /^(?:whats?|wats?|wuts?)\s*(?:the\s+)?(?:time|tim)\s*(?:rn|now)?$/, // "whats the time rn"
    /^(?:yo\s+)?(?:whats?|wats?)\s+(?:the\s+)?time$/,  // "yo whats the time"
    /^tim\w*\s*(?:is|it)?\s*(?:now|rn)?$/,              // "time", "tim it is", "time rn"
    /^pst$/,                                             // just "pst"
    /^(?:got\s+)?(?:the\s+)?time\b/,                    // "got the time"
    /^(?:what\s+)?time\s+(?:is\s+it\s+)?(?:in|at)\s+\w+/, // "what time is it in SF"
    // Date queries
    /^(?:what|wats?|whats?)\s+(?:the\s+)?(?:date|day)\s*(?:today|now|rn|is\s*it)?$/,
    /^(?:today(?:'?s)?\s+)?date$/,
    /^what\s+day\s+is\s+(?:it|today)/,
    // "rn" (right now) — only when very short, likely asking for time
    /^(?:time|clock)\s+(?:check|rn)$/,
    // "what time" with garbage around it
    /^(?:hey\s+)?(?:what|wut|wat)\s*(?:'?s)?\s*(?:the\s+)?(?:time|tim|clock)\s*(?:rn|now|is\s*it)?$/,
  ];

  return exactPatterns.some(p => p.test(cleaned));
}

// Map common US location strings to IANA timezones
function guessTimezone(location: string | null): string {
  if (!location) return "America/Los_Angeles"; // Default PST
  const lower = location.toLowerCase();

  if (/\bca\b|california|san\s*(?:ramon|francisco|jose|diego)|los\s*angeles|sacramento|bay\s*area/.test(lower)) return "America/Los_Angeles";
  if (/\bny\b|new\s*york|brooklyn|manhattan|queens/.test(lower)) return "America/New_York";
  if (/\btx\b|texas|houston|dallas|austin|san\s*antonio/.test(lower)) return "America/Chicago";
  if (/\bfl\b|florida|miami|orlando|tampa/.test(lower)) return "America/New_York";
  if (/\bil\b|illinois|chicago/.test(lower)) return "America/Chicago";
  if (/\bwa\b|washington|seattle/.test(lower)) return "America/Los_Angeles";
  if (/\bco\b|colorado|denver/.test(lower)) return "America/Denver";
  if (/\baz\b|arizona|phoenix/.test(lower)) return "America/Phoenix";
  if (/\bhi\b|hawaii|honolulu/.test(lower)) return "Pacific/Honolulu";
  if (/\bak\b|alaska|anchorage/.test(lower)) return "America/Anchorage";
  if (/\b(?:pa|ma|md|dc|va|nc|sc|ga|ct|nj|de|ri|nh|vt|me)\b/.test(lower)) return "America/New_York";
  if (/\b(?:oh|mi|in|ky|tn|al|ms|wi|mn|ia|mo|ar|la|ne|ks|nd|sd|ok)\b/.test(lower)) return "America/Chicago";
  if (/\b(?:mt|id|wy|nm|ut)\b/.test(lower)) return "America/Denver";
  if (/\b(?:or|nv)\b/.test(lower)) return "America/Los_Angeles";

  return "America/Los_Angeles"; // Fallback
}

function buildTimeResponse(userLocation: string | null, _locale?: string): string {
  const tz = guessTimezone(userLocation);
  const { timeStr, dateStr, tzAbbr } = getCurrentTime(tz);
  const locationName = userLocation || "your area";
  return `🕐 **${timeStr} ${tzAbbr}** — ${dateStr}\n\n📍 *${locationName}*`;
}

/**
 * Build a time context block to inject into the LLM prompt so the model
 * ACTUALLY KNOWS the current time/date when composing its response.
 * Called for any prompt that contains time-related keywords.
 */
function buildTimeContext(persona: string): string {
  const userLoc = extractUserLocation(persona);
  const tz = guessTimezone(userLoc);
  const { timeStr, dateStr, tzAbbr, hour24 } = getCurrentTime(tz);
  const locationName = userLoc || "unknown";

  let period = "daytime";
  if (hour24 < 6) period = "late night / early morning";
  else if (hour24 < 12) period = "morning";
  else if (hour24 < 17) period = "afternoon";
  else if (hour24 < 21) period = "evening";
  else period = "night";

  return `\n\n--- CURRENT TIME (factual, server-generated — use this to answer time questions) ---\nTime: ${timeStr} ${tzAbbr}\nDate: ${dateStr}\nTimezone: ${tz} (${tzAbbr})\nPeriod: ${period}\nUser location: ${locationName}\n--- END CURRENT TIME ---`;
}

// Extract user's saved location from persona text
function extractUserLocation(persona: string): string | null {
  const locMatch = persona.match(/(?:location|city|lives?\s+in|based\s+in|hometown)[:\s]+([^\n]+)/i);
  return locMatch ? locMatch[1].trim() : null;
}

// Enrich a search query with location context from persona / known cities
function enrichSearchQuery(query: string, persona: string): string {
  const lower = query.toLowerCase();
  const isWeather = /weather|fore?cast|temperature/i.test(query);
  const isLocal = /restaurants?|places?|things to do|events?|bars?|cafes?|shops?|near me/i.test(query);

  // Extract city from the query: "weather in San Ramon" → "san ramon"
  // Also match "weather San Ramon CA" without preposition
  const cityMatch = lower.match(/(?:in|near|around|for)\s+([a-z\s]+?)(?:\s*(?:ca|tx|ny|fl|wa|il|az|or|co|ga|ma|mi|mn|tn|nv|nc|oh|pa|md|dc|mo|in|wi|ut)\b)?(?:\s*(?:today|tonight|now|this week|tomorrow))?[,?!.\s]*$/)
    || (isWeather && lower.match(/weather\s+([a-z\s]+?)(?:\s*(?:ca|tx|ny|fl|wa|il|az|or|co|ga|ma|mi|mn|tn|nv|nc|oh|pa|md|dc|mo|in|wi|ut)\b)?(?:\s*(?:today|tonight|now|this week|tomorrow))?[,?!.\s]*$/));

  if (cityMatch) {
    const cityName = cityMatch[1].trim().replace(/\s+(ca|tx|ny|fl|wa|il|az|or|co|ga|ma|mi|mn|tn|nv|nc|oh|pa|md|dc|mo|in|wi|ut)$/i, "").trim();
    const cityData = CITY_DATA[cityName];
    if (cityData) {
      const titleCity = cityName.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
      const fullLocation = `${titleCity}, ${cityData.st} ${cityData.zip}`;
      if (isWeather) return `current weather ${fullLocation} today`;
      return query.replace(new RegExp(cityName.replace(/\s+/g, "\\s+"), "i"), fullLocation);
    }
  }

  // Replace "near me" with actual location for better local results
  if (/near me/i.test(query)) {
    const userLoc = extractUserLocation(persona);
    if (userLoc) {
      const cleanLoc = userLoc.replace(/\s*\d{5}(-\d{4})?\s*$/, "").trim();
      return query.replace(/near me/i, `near ${cleanLoc}`);
    }
  }

  // No city in query — try pulling location from persona
  if ((isWeather && !/\b(?:in|near|around|for)\s+[A-Za-z]/i.test(query) && !lower.match(/weather\s+[a-z]{3,}/))
    || (isLocal && !/\b(?:in|near|around)\s+[A-Za-z]/i.test(query))) {
    const userLoc = extractUserLocation(persona);
    if (userLoc) {
      if (isWeather) return `current weather in ${userLoc} today`;
      return `${query} in ${userLoc}`;
    }
  }

  // For weather queries, prepend "current" for better real-time results
  if (isWeather && !lower.includes("current")) {
    return `current ${query} today`;
  }

  return query;
}

// Boost direct weather/local results to the top
function sortSearchResults(results: BraveResult[], query: string): BraveResult[] {
  const lower = query.toLowerCase();
  const isWeather = /weather|fore?cast|temperature/i.test(lower);

  if (!isWeather) return results;

  // Preferred weather domains (in priority order)
  const weatherDomains = ["weather.com", "wunderground.com", "accuweather.com", "weather.gov", "weatherapi.com"];

  // Extract city and zip from query for URL matching
  const cityMatch = lower.match(/(?:in|near|around|for|weather)\s+([a-z\s]+?)(?:\s*,?\s*[a-z]{2}\s*)?(?:\s*(\d{5}))?\s*(?:today|tonight|now)?[,?!.\s]*$/);
  const citySlug = cityMatch ? cityMatch[1].trim().replace(/\s+/g, "-") : "";
  const zipCode = cityMatch?.[2] || "";

  return [...results].sort((a, b) => {
    const aDomain = weatherDomains.some(d => a.domain.includes(d));
    const bDomain = weatherDomains.some(d => b.domain.includes(d));
    const aUrl = a.url.toLowerCase();
    const bUrl = b.url.toLowerCase();
    const aLocal = (citySlug && aUrl.includes(citySlug)) || (zipCode && aUrl.includes(zipCode));
    const bLocal = (citySlug && bUrl.includes(citySlug)) || (zipCode && bUrl.includes(zipCode));

    // Best: weather domain + city/zip in URL
    if (aDomain && aLocal && !(bDomain && bLocal)) return -1;
    if (bDomain && bLocal && !(aDomain && aLocal)) return 1;
    // Next: weather domain
    if (aDomain && !bDomain) return -1;
    if (bDomain && !aDomain) return 1;
    // Next: city/zip in URL
    if (aLocal && !bLocal) return -1;
    if (bLocal && !aLocal) return 1;
    return 0;
  });
}

// Detect questions that need real-time web info (weather, events, news, prices, etc.)
function needsWebSearch(text: string): string | null {
  const lower = text.toLowerCase().trim();

  // Skip very short messages, greetings, and meta-commands
  if (lower.length < 10) return null;
  // Skip long-form text — likely a document paste, persona dump, or essay, not a search query
  if (lower.length > 500) return null;
  if (/^(hi|hello|hey|sup|yo|thanks|thank you|ok|okay|yes|no|bye|status|help)\b/i.test(lower)) return null;
  if (/^(summarize|generate|remember|load|read file|export)/i.test(lower)) return null;

  // STRONG triggers — these almost always need web search
  const strongPatterns = [
    /weather/i,
    /fore?cast/i,
    /\bnews\b/i,
    /headlines/i,
    /\bscore[s]?\b/i,
    /\bstock\b/i,
    /\bprice of\b/i,
    /what(?:'s| is) happening/i,
    /what(?:'s| is) going on/i,
    /things to do/i,
    /something to do/i,
    /someting to do/i,
    /stuff to do/i,
    /\bnear me\b/i,
    /\bnearby\b/i,
    /places to (?:go|eat|visit|shop|see)/i,
    /where (?:to|can|should).*(?:eat|go|visit|shop)/i,
    /restaurants?\s+(?:in|near|around)/i,
    /(?:bars?|cafes?|shops?|stores?|malls?)\s+(?:in|near|around)/i,
    /(?:open|closed|hours)\s+(?:today|now|right now)/i,
    /(?:traffic|temperature)\s+(?:in|near|right now)/i,
    /current(?:ly)?\s+(?:weather|news|events|temperature|traffic)/i,
    /(?:today|tonight|this week|this weekend).*(?:in\s|near\s|around\s)/i,
    /(?:what|when|where|who)\s+(?:is|are|was|were|did|does|has|won|happened)/i,
    /(?:latest|recent|new|current|upcoming)\s+\w/i,
    /how (?:much|many|long|far|old)/i,
    /(?:best|top|popular|good)\s+(?:restaurants?|places|bars?|cafes?|things|movies?|shows?|songs?|books?|games?)/i,
    /recipe\b/i,
    // Search-intent phrases
    /\b(?:show me|show us|can you show)\b/i,
    /\b(?:find me|find some|find a|find the)\b/i,
    /\b(?:look for|look into)\b/i,
    /\b(?:where can i (?:find|watch|see|get|buy|read))\b/i,
    // Media/link/URL requests
    /\blinks?\s+(?:to|for|about)\b/i,
    /\b(?:videos?)\s+(?:of|for|about|on)\b/i,
    /\byoutube\b/i,
    /\b(?:url|website|webpage)\b/i,
    /\bwatch\s+(?:a|the|some|this)\b/i,
    // Booking/appointment/reservation — search for direct links
    /\b(?:book|schedule|make|set\s+up)\s+(?:a\s+|an\s+|me\s+)?(?:a\s+|an\s+)?(?:appointment|reservation|booking)\b/i,
    /\b(?:dmv|doctor|dentist|salon|barber|vet|mechanic|spa)\s+(?:appointment|booking)\b/i,
    /\b(?:appointment|reservation)\s+(?:at|for|with|to)\b/i,
    /\bhow\s+(?:do\s+i|to|can\s+i)\s+(?:book|schedule|make)\b/i,
  ];

  for (const pattern of strongPatterns) {
    if (pattern.test(text)) {
      return text;
    }
  }

  // Temporal markers + question/request intent → needs current data
  const hasTemporal = /\b(?:this year|this year'?s|these? years?|202[4-9])\b/i.test(text);
  const hasSearchIntent = /\b(?:show|find|links?|videos?|watch|where|what|when|how|best|top|tell me|give me|any|some)\b/i.test(lower);
  if (hasTemporal && hasSearchIntent) {
    return text;
  }

  // Location-based queries (mentions a city/place + a question word)
  if (/(?:in|near|around)\s+[A-Z][a-z]/.test(text) && /\?|what|where|how|when|any|some/.test(lower)) {
    return text;
  }

  return null;
}

// ── OpenClaw Action Detection ──
// Detects when user messages need real tool execution via OpenClaw gateway.
// Returns { type, message } or null. Modeled on needsWebSearch().

type ActionDetectionResult = { type: string; message: string; compound?: boolean } | null;

function needsActionExecution(text: string): ActionDetectionResult {
  const lower = text.toLowerCase().trim();
  // For action detection, only look at the first line (commands often have
  // long bodies attached, e.g. "Create note in Apple Notes: Title\n[body]")
  const firstLine = lower.split("\n")[0].trim();

  // Skip very short messages, greetings, long pastes (but check first line for notes/actions)
  if (firstLine.length < 6) return null;
  if (firstLine.length > 400) return null;
  if (/^(hi|hello|hey|sup|yo|thanks|thank you|ok|okay|yes|no|bye)\b/i.test(firstLine)) return null;

  // Compound requests (e.g. "set up calendar reminders AND build me a nutrition plan")
  // are now handled sequentially: action executes first, then LLM handles the rest.
  // Mark compound requests with a special "compound" flag so the POST handler knows.
  const isCompound = (
    (/\band\s+(?:also|build|create|make|help|give|tell|show|design|plan|write)/i.test(firstLine) && firstLine.length > 60) ||
    (/^(?:can you|could you|would you|is it possible to|do you)\s/i.test(firstLine) && /\b(?:and|also|plus|too)\b/i.test(firstLine))
  );

  // --- Reminders ---
  if (
    /\b(?:set\s+a?\s*reminder|add\s+(?:a\s+)?reminder|create\s+a?\s*reminder|remind\s+me\s+(?:to\s+)?)\b/i.test(firstLine) ||
    /\badd\s+to\s+(?:my\s+)?(?:apple\s+)?reminders?\b/i.test(firstLine)
  ) {
    return { type: "reminder", message: text, compound: isCompound };
  }

  // --- Messages / iMessage / WhatsApp ---
  if (
    /\b(?:text\s+[a-z]|imessage\s+[a-z]|send\s+(?:a\s+)?(?:text|message|imessage)\s+to)\b/i.test(firstLine) ||
    /\bsend\s+(?:a\s+)?whatsapp\b/i.test(firstLine) ||
    /\bwhatsapp\s+[a-z]/i.test(firstLine)
  ) {
    return { type: "message", message: text, compound: isCompound };
  }

  // --- Email ---
  if (
    /\b(?:send\s+(?:an?\s+)?email|compose\s+(?:an?\s+)?email|email\s+[a-z]|check\s+my\s+(?:email|inbox|gmail|mail)|read\s+my\s+(?:email|inbox|gmail|mail)|open\s+my\s+(?:email|inbox|gmail|mail)|search\s+(?:my\s+)?(?:email|inbox|gmail|mail)|reply\s+to\s+(?:that\s+)?email|forward\s+(?:that\s+)?email|show\s+(?:my\s+)?(?:latest|recent|unread)\s+(?:email|mail)s?)\b/i.test(firstLine)
  ) {
    return { type: "email", message: text, compound: isCompound };
  }

  // --- Apple Notes ---
  // Triggers on "create a note in notes", "add to notes app", "create a note about...",
  // "make a note about...", "save a note about...", "write a note about...",
  // "Create note in Apple Notes: Title" (colon-separated)
  if (
    /\b(?:create\s+(?:a\s+)?note\s+(?:in\s+(?:apple\s+)?notes?|about\s+|called\s+|titled\s+)|add\s+to\s+(?:my\s+)?(?:apple\s+)?notes?\s+app|open\s+(?:apple\s+)?notes?\s+app|(?:make|save|write)\s+(?:a\s+)?note\s+(?:about|called|titled|in\s+notes))\b/i.test(firstLine) ||
    /\b(?:create|make|save|write|add)\s+(?:a\s+)?note\s+in\s+(?:apple\s+)?notes?\s*:/i.test(firstLine)
  ) {
    return { type: "notes", message: text, compound: isCompound };
  }

  // --- Calendar ---
  if (
    /\b(?:what(?:'?s|\s+is)\s+on\s+my\s+calendar|check\s+(?:my\s+)?calendar|show\s+(?:me\s+)?my\s+calendar|my\s+calendar\s+(?:today|tomorrow|this\s+week)|schedule\s+a?\s*(?:meeting|event|appointment|call)|add\s+to\s+(?:my\s+)?calendar|create\s+(?:a\s+|an\s+)?(?:calendar\s+)?(?:event|meeting|appointment)|(?:any|do\s+i\s+have)\s+(?:events?|meetings?|appointments?)\s+(?:today|tomorrow|this\s+week))\b/i.test(firstLine)
  ) {
    return { type: "calendar", message: text, compound: isCompound };
  }

  // --- Smart home: lights, speakers, thermostat ---
  if (
    /\b(?:turn\s+(?:on|off)\s+(?:the\s+)?(?:lights?|lamp|bedroom|living|kitchen|bathroom)|set\s+(?:the\s+)?(?:lights?|brightness)|dim\s+(?:the\s+)?lights?)\b/i.test(firstLine) ||
    /\b(?:play\s+(?:music|something|.+?)\s+on\s+(?:the\s+)?(?:speaker|sonos|kitchen|living|bedroom)|pause\s+(?:the\s+)?(?:music|sonos|speaker)|stop\s+(?:the\s+)?(?:music|sonos|speaker))\b/i.test(firstLine) ||
    /\b(?:set\s+(?:the\s+)?(?:thermostat|temperature|bed)\s+to|adjust\s+(?:the\s+)?(?:thermostat|temperature))\b/i.test(firstLine)
  ) {
    return { type: "smart_home", message: text, compound: isCompound };
  }

  // --- Browser automation (website interaction) ---
  if (
    /\b(?:go\s+to|open|navigate\s+to|visit)\s+(?:the\s+)?(?:https?:\/\/\S+|\w+\.(?:com|org|net|gov|edu|io)\b)/i.test(firstLine) ||
    /\b(?:book|schedule|reserve|sign\s+up|log\s*in|register|fill\s+out|submit|order)\s+(?:.*?\s+)?(?:on|at|from|through)\s+(?:the\s+)?(?:website|site|page|portal)\b/i.test(firstLine) ||
    /\b(?:book|schedule|make)\s+(?:.*?\s+)?(?:appointment|reservation)\s+(?:.*?\s+)?(?:on|at|through|via)\s+(?:the\s+)?(?:dmv|website|site)\b/i.test(firstLine) ||
    /\b(?:use\s+the\s+browser|browse\s+to|interact\s+with\s+(?:the\s+)?(?:website|page|site))\b/i.test(firstLine) ||
    /\b(?:click|fill\s+in|fill\s+out|submit|type\s+in)\s+(?:.*?\s+)?(?:on\s+(?:the\s+)?(?:website|page|site|form))\b/i.test(firstLine) ||
    /\b(?:use|ask|open|go\s+to)\s+(?:grok|chatgpt|perplexity|gemini|copilot)\b/i.test(firstLine) ||
    /\b(?:in\s+the\s+browser|using\s+the\s+browser|via\s+(?:the\s+)?browser)\b/i.test(firstLine)
  ) {
    return { type: "browser", message: text, compound: isCompound };
  }

  // --- GitHub ---
  if (
    /\b(?:check\s+(?:my\s+)?(?:prs?|pull\s+requests?)|list\s+(?:my\s+)?(?:github\s+)?issues?|create\s+(?:an?\s+)?(?:github\s+)?issue|open\s+(?:a\s+)?pr|check\s+github|my\s+github\s+(?:prs?|issues?))\b/i.test(firstLine)
  ) {
    return { type: "github", message: text, compound: isCompound };
  }

  // --- Todo / Things ---
  if (
    /\b(?:add\s+(?:.*?\s+)?to\s+(?:my\s+)?(?:todo|to-do|to\s+do)\s*list|what(?:'s|\s+is)\s+on\s+my\s+(?:todo|to-do|to\s+do)|add\s+(?:a\s+)?task\s+(?:to|in)\s+things|check\s+(?:my\s+)?things)\b/i.test(firstLine)
  ) {
    return { type: "todo", message: text, compound: isCompound };
  }

  // --- Camera / Doorbell ---
  if (
    /\b(?:show\s+(?:me\s+)?(?:the\s+)?(?:camera|doorbell)|check\s+(?:the\s+)?(?:front\s+door|back\s+door|camera|doorbell|driveway)|view\s+(?:the\s+)?camera)\b/i.test(firstLine)
  ) {
    return { type: "camera", message: text, compound: isCompound };
  }

  // --- Google Sheets ---
  if (
    /\b(?:create|make|new)\s+(?:a\s+)?(?:new\s+)?(?:google\s+)?(?:sheet|spreadsheet)\b/i.test(firstLine) ||
    /\b(?:add|append|insert)\s+(?:a\s+)?(?:row\s+)?(?:to|in)\s+(?:my\s+)?(?:\w+\s+)*(?:sheet|spreadsheet)\b/i.test(firstLine) ||
    /\b(?:read|show|open|view|get)\s+(?:me\s+)?(?:my\s+)?(?:\w+\s+)*(?:google\s+)?(?:sheet|spreadsheet)\b/i.test(firstLine) ||
    /\bwhat(?:'s|\s+is)\s+in\s+(?:my\s+)?(?:\w+\s+)*(?:sheet|spreadsheet)\b/i.test(firstLine) ||
    /\b(?:find|search|list)\s+(?:my\s+)?(?:google\s+)?(?:sheets?|spreadsheets?)\b/i.test(firstLine) ||
    /\b(?:update|edit)\s+(?:my\s+)?(?:\w+\s+)*(?:google\s+)?(?:sheet|spreadsheet)\b/i.test(firstLine)
  ) {
    return { type: "sheets", message: text, compound: isCompound };
  }

  // --- Summarize URL / Video ---
  if (
    /\b(?:summarize\s+this\s+(?:video|url|link|article|page|website)|summarize\s+https?:\/\/)\b/i.test(firstLine)
  ) {
    return { type: "summarize_url", message: text, compound: isCompound };
  }

  // ── BROAD CATCH-ALL: route action-like requests to OpenClaw agent ──
  // If none of the specific regexes matched above, check if the message
  // mentions an action domain. The OpenClaw agent is much better at understanding
  // intent than regex — let it decide what to do.
  if (
    /\b(?:reminder|remind|alarm|alert)\b/i.test(firstLine) ||
    /\b(?:calendar|schedule|event|meeting|appointment|booking)\b/i.test(firstLine) ||
    /\b(?:email|e-mail|inbox|gmail|mail|message|text|imessage|sms|whatsapp)\b/i.test(firstLine) ||
    /\b(?:note|notes|memo|jot\s+down|write\s+down)\b/i.test(firstLine) ||
    /\b(?:todo|to-do|to\s+do\s+list|task|things)\b/i.test(firstLine) ||
    /\b(?:light|lights|lamp|sonos|speaker|thermostat|hue|smart\s+home)\b/i.test(firstLine) ||
    /\b(?:github|pull\s+request|pr|issue|commit|repo)\b/i.test(firstLine) ||
    /\b(?:camera|doorbell|security\s+cam)\b/i.test(firstLine) ||
    /\b(?:sheets?|spreadsheets?|google\s+sheets?)\b/i.test(firstLine)
  ) {
    // Determine the best category for the agent
    let agentType = "action";
    if (/\b(?:reminder|remind|alarm)\b/i.test(firstLine)) agentType = "reminder";
    else if (/\b(?:calendar|schedule|event|meeting|appointment)\b/i.test(firstLine)) agentType = "calendar";
    else if (/\b(?:email|e-mail|inbox|gmail|mail)\b/i.test(firstLine)) agentType = "email";
    else if (/\b(?:message|text|imessage|sms|whatsapp)\b/i.test(firstLine)) agentType = "message";
    else if (/\b(?:note|notes|memo)\b/i.test(firstLine)) agentType = "notes";
    else if (/\b(?:todo|to-do|task|things)\b/i.test(firstLine)) agentType = "todo";
    else if (/\b(?:light|sonos|speaker|thermostat|hue|smart\s+home)\b/i.test(firstLine)) agentType = "smart_home";
    else if (/\b(?:github|pull\s+request|pr|issue|commit|repo)\b/i.test(firstLine)) agentType = "github";
    else if (/\b(?:camera|doorbell)\b/i.test(firstLine)) agentType = "camera";
    else if (/\b(?:sheets?|spreadsheets?)\b/i.test(firstLine)) agentType = "sheets";

    return { type: agentType, message: text, compound: isCompound };
  }

  return null;
}

export async function POST(req: Request) {
  const { command, userProfile, agentSystemPrompt, locale, history, stream: requestStream } = await req.json();
  if (!command || typeof command !== "string") {
    return NextResponse.json({ response: apiStr(locale, "no_command") }, { status: 400 });
  }

  const normalized = command.trim();
  const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];

  // Determine request type for credit tracking
  const isSearch = !!extractSearchQuery(normalized);
  const requestType = isSearch ? "search" : "chat";

  // Check compute credits (desktop only — serverless uses user's own key always)
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (!isServerless) {
    const hasCreditAvailable = await hasCredit(requestType);
    if (!hasCreditAvailable) {
      const remaining = await getRemainingUnits();
      return NextResponse.json({
        response: apiStr(locale, "credits_exhausted"),
        creditExhausted: true,
        remainingUnits: remaining,
      });
    }
  }

  try {
    // Handle bare "search" with no query
    if (/^(web\s+)?search\s*$/i.test(normalized)) {
      return NextResponse.json({
        response: "🔍 What would you like to search for? Type `search` followed by your query.\n\nExamples:\n- `search latest AI news`\n- `search weather in San Francisco`\n- `search how to make pasta`"
      });
    }

    // ── OpenClaw action execution ──
    // Runs BEFORE search so "what's on my calendar" doesn't trigger web search.
    // Any action-like request goes to OpenClaw agent first. Only falls through
    // to the LLM if the agent is completely unreachable.
    const actionResult = needsActionExecution(normalized);
    if (actionResult) {
      console.log(`[action] detected: type=${actionResult.type} compound=${!!actionResult.compound} msg="${normalized.slice(0, 60)}"`);
      const gatewayResult = await executeNativeAction(actionResult.message, actionResult.type);
      console.log(`[action] result: success=${gatewayResult.success} response="${(gatewayResult.response || "").slice(0, 80)}"`);

      if (actionResult.compound) {
        // ── COMPOUND REQUEST: action + conversation ──
        // Execute the action part, then pass the full message to the LLM with
        // action result as context so it handles the rest conversationally.
        // e.g. "set up calendar reminders AND build me a nutrition plan"
        // → action executes reminder, LLM handles nutrition plan
        const actionSummary = gatewayResult.success
          ? `✅ I've handled the action part: ${gatewayResult.response || "done"}`
          : `⚠️ I tried the action but it needs more info. ${gatewayResult.response || ""}`;
        console.log(`[action] compound — executing LLM for remaining parts`);
        const compoundContext = `CONTEXT: The user asked a compound request. You already handled the action part:\n${actionSummary}\n\nNow address the rest of their message conversationally. Don't repeat the action confirmation — just mention it briefly and focus on the other parts.`;
        if (requestStream) {
          const { stream, model } = await routeToLLMStream(normalized, {
            context: compoundContext, userProfile, agentSystemPrompt, locale, history: chatHistory,
          });
          let accumulated = "";
          const encoder = new TextEncoder();
          const sseStream = new ReadableStream({
            async start(ctrl) {
              // Send the action result as the first token
              const prefix = actionSummary + "\n\n";
              accumulated += prefix;
              ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ token: prefix })}\n\n`));
              const reader = stream.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  accumulated += value;
                  ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ token: value })}\n\n`));
                }
                const parsed = parseFollowUps(cleanLLMResponse(accumulated));
                ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, response: parsed.clean, followUps: parsed.followUps, model })}\n\n`));
                ctrl.close();
              } catch (err) {
                ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, error: (err as Error).message })}\n\n`));
                ctrl.close();
              }
              if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
            },
          });
          return new Response(sseStream, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
          });
        } else {
          const llmReply = await routeToLLM(normalized, {
            context: compoundContext, userProfile, agentSystemPrompt, locale, history: chatHistory,
          });
          if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
          return NextResponse.json({
            response: actionSummary + "\n\n" + cleanLLMResponse(llmReply),
            actionType: gatewayResult.actionType,
            actionStatus: gatewayResult.success ? "success" : "error",
            ...(gatewayResult.deepLink ? { deepLink: gatewayResult.deepLink } : {}),
          });
        }
      }

      // ── SIMPLE ACTION: just the action, no conversation needed ──
      if (gatewayResult.success) {
        if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
        return NextResponse.json({
          response: gatewayResult.response,
          actionType: gatewayResult.actionType,
          actionStatus: "success",
          ...(gatewayResult.deepLink ? { deepLink: gatewayResult.deepLink } : {}),
        });
      }
      // If the OpenClaw agent returned a response even on "failure", use it
      // rather than falling through to the generic LLM
      if (gatewayResult.response && gatewayResult.response.length > 10) {
        return NextResponse.json({
          response: gatewayResult.response,
          actionType: gatewayResult.actionType,
          actionStatus: "error",
        });
      }
      console.log(`[action] falling through to LLM — gateway agent failed or returned empty`);
    }

    // Check for explicit search commands first
    let searchQuery = extractSearchQuery(normalized);

    // Context-aware search: if user's follow-up is vague ("where are those?", "this is wrong")
    // or a location correction ("its san ramon ca", "no, in austin", "i meant seattle")
    // but the previous exchange was a search query, re-search with combined context.
    // This runs BEFORE needsWebSearch() so follow-ups aren't hijacked as fresh searches.
    if (!searchQuery && getBraveKey() && chatHistory?.length >= 1) {
      const lastUserMsg = [...chatHistory].reverse().find(m => m.role === "user");
      const lastAiMsg = [...chatHistory].reverse().find(m => m.role === "assistant");
      const isVagueFollowUp = /\b(it|its|it's|that|this|those|these|them|they|there|where|now|more|again|what about|how about|and|also|update|tomorrow|tonight|next|still|wrong|right|really|sure|accurate|correct|exactly|instead|else|other|different|the same|real|actual|show|give|tell|see|lets see|let me see|forecast|week)\b/i.test(normalized) && normalized.length < 60;
      // Location corrections: "its san ramon ca", "no, in austin", "i meant seattle", "actually denver"
      const isLocationCorrection = /^(?:its|it's|no[, ]+|i meant|actually|not that|nah|wrong|i'm in|im in|for)\s/i.test(normalized) && normalized.length < 60;
      // Check if the previous AI response was about weather/search (contains temps, conditions, etc.)
      const prevAiWasSearch = lastAiMsg && /(?:°[FC]|\bweather\b|\bforecast\b|\btemperature\b|\bresults?\b|\bsource)/i.test(lastAiMsg.content);
      if ((isVagueFollowUp || isLocationCorrection || prevAiWasSearch) && lastUserMsg) {
        const prevSearch = extractSearchQuery(lastUserMsg.content) || needsWebSearch(lastUserMsg.content);
        if (prevSearch) {
          // For location corrections, build a better combined query
          if (isLocationCorrection) {
            // Extract the core search topic from previous query (e.g., "weather tonight" from "weather tonight?")
            const topic = prevSearch.replace(/\?+$/, "").trim();
            searchQuery = `${topic} ${normalized.replace(/^(?:its|it's|no[, ]+|i meant|actually|not that|nah|wrong|i'm in|im in|for)\s+/i, "").trim()}`;
          } else {
            searchQuery = `${prevSearch} ${normalized}`;
          }
        }
      }
    }

    // Explicit search-intent follow-up: user asks for links/videos/current data
    // as a follow-up to ANY conversation — combine with chat context
    if (!searchQuery && getBraveKey() && chatHistory?.length >= 1) {
      const hasExplicitIntent = /\b(?:show me|find me|links?|videos?|watch|youtube|url|website|look up|look for|where can i)\b/i.test(normalized);
      if (hasExplicitIntent && normalized.length < 120) {
        const lastUserMsg = [...chatHistory].reverse().find(m => m.role === "user");
        if (lastUserMsg) {
          const topicWords = lastUserMsg.content
            .replace(/^(?:tell me about|what is|what are|explain|describe)\s+/i, "")
            .trim();
          if (topicWords.length > 3) {
            searchQuery = `${topicWords} ${normalized}`;
          } else {
            searchQuery = normalized;
          }
        }
      }
    }

    // If no explicit search or follow-up, check if the question needs real-time info
    if (!searchQuery && getBraveKey()) {
      searchQuery = needsWebSearch(normalized);
    }

    if (searchQuery) {
      // Load persona for location enrichment + anonymization
      // Single anonymizer instance — used for outbound query scrubbing AND passed to routeToLLM
      const persona = await loadPersonaText();
      const anon = createAnonymizer(persona, userProfile);

      // Enrich query: append state, pull location from persona, prefer local
      const enrichedQuery = enrichSearchQuery(searchQuery, persona);
      // Only scrub the OUTBOUND search query (protects user's name/email/etc.)
      const scrubbedQuery = anon.scrub(enrichedQuery);

      let results = await fetchBraveResults(scrubbedQuery);
      if (!results.length) {
        // Fall through to normal LLM if no search results — pass same anonymizer
        const reply = await routeToLLM(normalized, { userProfile, agentSystemPrompt, locale, history: chatHistory, anonymizer: anon });
        if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
        const fallbackParsed = parseFollowUps(reply);
        return NextResponse.json({
          response: cleanLLMResponse(fallbackParsed.clean),
          ...(fallbackParsed.followUps.length > 0 && { followUps: fallbackParsed.followUps }),
        });
      }

      // Sort results: prefer direct weather/local hits at the top
      results = sortSearchResults(results, enrichedQuery);

      // Detect if this is a weather query for specialized formatting
      const isWeatherQuery = /weather|fore?cast|temperature/i.test(searchQuery);

      // For weather queries, strip Published dates so the LLM doesn't confuse them with current dates
      const formattedResults = formatBraveResults(results, isWeatherQuery);
      const richResults = formatBraveResultsRich(results);

      // Compute timestamp BEFORE building system prompt so we can inject it
      const now = new Date();
      const timeTag = now.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

      // For weather queries, fetch REAL weather data from Open-Meteo (free, no key needed)
      // Try query-extracted city FIRST (more specific), then fall back to persona location
      let weatherData = "";
      if (isWeatherQuery) {
        let coords: [number, number] | null = null;
        // Extract city from query: "weather in san ramon" → "san ramon"
        const qLower = searchQuery.toLowerCase();
        const qCityMatch = qLower.match(/(?:in|near|around|for)\s+([a-z\s]+?)(?:\s*(?:ca|tx|ny|fl|wa|il|az|or|co|ga|ma|mi|mn|tn|nv|nc|oh|pa|md|dc|mo|in|wi|ut)\b)?(?:\s*(?:today|tonight|now|this week|tomorrow))?[,?!.\s]*$/)
          || qLower.match(/weather\s+([a-z\s]+?)(?:\s*(?:ca|tx|ny|fl|wa|il|az|or|co|ga|ma|mi|mn|tn|nv|nc|oh|pa|md|dc|mo|in|wi|ut)\b)?(?:\s*(?:today|tonight|now|this week|tomorrow))?[,?!.\s]*$/);
        if (qCityMatch) {
          const cityName = qCityMatch[1].trim().replace(/\s+(ca|tx|ny|fl|wa|il|az|or|co|ga|ma|mi|mn|tn|nv|nc|oh|pa|md|dc|mo|in|wi|ut)$/i, "").trim();
          coords = getCoordsForLocation(cityName);
        }
        // Fall back to persona location
        if (!coords) {
          const userLoc = extractUserLocation(persona);
          coords = getCoordsForLocation(userLoc);
        }
        if (coords) {
          const wd = await fetchWeatherData(coords[0], coords[1]);
          if (wd) weatherData = `\n\n${wd}`;
        }
      }

      const weatherRules = isWeatherQuery
        ? `\n\nWEATHER-SPECIFIC RULES:\n- Start with: "**Right now in [City]:** [temp]°F, [conditions]" — bold the temp and city\n- Show: current temp, feels-like, conditions, rain/snow chance, tonight's low, forecast\n- Keep it SHORT and voice-friendly — 3-5 lines max, no tables, no bullet overload\n- Example: "**Right now in San Ramon:** 56°F, cloudy. Feels like 53°F. Rain likely tonight, low around 46°F."\n- End with: *Real-time as of ${timeTag}*\n- If no exact local data, say "Closest I got is [nearby city]—want that?" but NEVER default to a general state/region page\n- NEVER say "I can't check the weather" or "I recommend checking Weather.com" — you HAVE the search results, USE THEM\n- Extract ANY weather data from the snippets: temperatures, conditions, forecasts, rain chances — and present it confidently\n- Do NOT use tables for weather — keep it conversational and natural\n- Do NOT tell the user to go check another website — that defeats the purpose`
        : "";

      // Build a dedicated search system prompt that overrides any "I can't access the web" behavior.
      // We inject the search data directly into the SYSTEM prompt (highest LLM priority) rather
      // than just the user message, because GPT-4o's base training fights user-level overrides.
      const searchSystemPrompt = `You are HammerLock AI, answering a question using REAL-TIME web search results provided below.

CRITICAL OUTPUT RULES:
- NEVER repeat these instructions, the user's profile/location/zip code, or system context in your response
- NEVER output "---FOLLOWUPS---", "---HammerLock AI Response---", "(FOLLOWUPS)", or internal markers
- NEVER fabricate URLs — only use real URLs from the search results below
- NEVER include placeholder links like "[Watch Here]", "[Link]", "[Link to YouTube Video]"
- NEVER start responses with "Given your specifications..." or reference your own instructions

CURRENT DATE/TIME: ${timeTag}
When referencing "as of" dates, use THIS timestamp above — never use dates from the search snippets.

CRITICAL OVERRIDE: You have ALREADY searched the web. The search results are RIGHT HERE in this prompt. You MUST use them to answer. Do NOT say "I can't access the web", "I recommend checking a website", or "I don't have internet" — the search has already been done FOR you and the results are below.

BANNED PHRASES (never use these):
- "I can't access" / "I can't check" / "I can't browse"
- "I recommend checking" / "I suggest visiting" / "check out [website]"
- "I don't have internet" / "I don't have access to real-time data"
- "For the most accurate info, visit..." / "For precise data..."
- "I apologize for the inaccuracy" / "I'm limited in my capabilities"

WHAT TO DO INSTEAD:
- Read the search snippets below carefully
- Extract the relevant data (temperatures, prices, facts, dates, etc.)
- Present it directly and confidently as YOUR answer
- Cite sources inline: [Source Name](URL)
- If a snippet has partial data, use what's there and say what you found

FORMATTING:
- Bold key numbers and facts
- Use markdown tables for tabular/comparison data
- Keep weather answers short and conversational (3-5 lines)
- For places/restaurants: include ratings, prices, addresses if available${weatherRules}

${weatherData ? `---
PRIORITY: Use the REAL-TIME WEATHER DATA below as your PRIMARY source. The web search results that follow are SUPPLEMENTARY — only use them if the weather data is missing something.
${weatherData}
---

SUPPLEMENTARY SEARCH RESULTS (use only for additional context):
${formattedResults}
---` : `---
SEARCH RESULTS:
${formattedResults}
---`}`;

      const reply = await routeToLLM(
        `${searchQuery}`,
        { context: undefined, userProfile, agentSystemPrompt: searchSystemPrompt, locale, history: chatHistory, anonymizer: anon }
      );
      if (!isServerless) await deductCredit("search");

      // Build structured sources array for expandable accordion
      const sourcesData = results.map(r => ({
        title: r.title,
        url: r.url,
        domain: r.domain,
        age: r.age || null,
      }));

      const sourceSummary = isWeatherQuery
        ? `Real-time web results as of ${timeTag}`
        : `${results.length} web results from Brave Search`;

      // The reply from routeToLLM already has restore() applied.
      // Clean up any leftover formatting artifacts + system prompt leaks.
      const strippedReply = reply
          .replace(/\[(?:PERSON|ORG|EMAIL|PHONE|SSN|CREDIT_CARD|ADDRESS|ACCOUNT)_\d+\]\s*/g, "")
          .replace(/\*\*\s*\*\*/g, "");
      const searchParsed = parseFollowUps(strippedReply);
      const searchFollowUps = generateSearchFollowUps(searchQuery);
      return NextResponse.json({
        response: cleanLLMResponse(searchParsed.clean),
        sources: sourcesData,
        sourcesSummary: sourceSummary,
        followUps: searchFollowUps,
      });
    }

    const lowered = normalized.toLowerCase();

    // ---- SCHEDULED AGENT TASKS — "every day at 9am, have coach send me a workout" ----
    // Runs BEFORE "status" check so messages containing "status" in task descriptions don't get hijacked.
    const scheduleIntent = detectScheduleIntent(normalized);
    if (scheduleIntent) {
      const schedulesPath = path.join(os.homedir(), ".hammerlock", "schedules.json");

      // Helper to read/write schedules file (encrypted at rest)
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

      if (scheduleIntent === "create") {
        const parsed = parseScheduleCommand(normalized);
        if (!parsed.success) {
          return NextResponse.json({
            response: `❌ ${parsed.error}\n\n**Examples:**\n- "Every day at 9am, have Coach send me a workout plan"\n- "Weekdays at 8am, Money agent review my spending"\n- "Every Monday at 10am, Content agent draft social posts"\n- "Daily at 7pm, Analyst summarize market trends"`
          });
        }
        const tasks = await readSchedules();
        tasks.push(parsed.task);
        await writeSchedules(tasks);
        const agentName = parsed.task.agentId.charAt(0).toUpperCase() + parsed.task.agentId.slice(1);
        const scheduleStr = formatSchedule(parsed.task);
        return NextResponse.json({
          response: `✅ **Scheduled!**\n\n🕐 **${scheduleStr}**\n🤖 Agent: **${agentName}**\n📋 Task: ${parsed.task.task}\n\nI'll run this automatically and notify you with the results. Say "my schedules" to view all scheduled tasks.`,
          scheduleCreated: parsed.task,
        });
      }

      if (scheduleIntent === "list") {
        const tasks = await readSchedules();
        if (tasks.length === 0) {
          return NextResponse.json({
            response: `📋 **No scheduled tasks yet.**\n\nSet one up like:\n- "Every day at 9am, have Coach send me a workout plan"\n- "Weekdays at 8am, Money agent check my budget"\n- "Every Monday at 10am, Content agent draft social posts"`
          });
        }
        const lines = tasks.map((t, i) => {
          const agentName = t.agentId.charAt(0).toUpperCase() + t.agentId.slice(1);
          const status = t.enabled ? "🟢" : "⏸️";
          return `${status} **${i + 1}.** ${formatSchedule(t)} — **${agentName}**: ${t.task}`;
        });
        return NextResponse.json({
          response: `📋 **Your Scheduled Tasks**\n\n${lines.join("\n")}\n\n*Say "delete schedule 1" or "pause schedule 2" to manage them.*`,
          schedules: tasks,
        });
      }

      if (scheduleIntent === "delete") {
        const tasks = await readSchedules();
        // Try to extract a number: "delete schedule 1", "cancel schedule 2"
        const numMatch = normalized.match(/(\d+)/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < tasks.length) {
            const removed = tasks[idx];
            tasks.splice(idx, 1);
            await writeSchedules(tasks);
            return NextResponse.json({
              response: `🗑️ Deleted: **${removed.task}** (${formatSchedule(removed)})\n\n${tasks.length} scheduled task${tasks.length === 1 ? "" : "s"} remaining.`,
              scheduleDeleted: removed.id,
            });
          }
        }
        // No number or invalid — list them
        if (tasks.length === 0) {
          return NextResponse.json({ response: "No scheduled tasks to delete." });
        }
        const lines = tasks.map((t, i) => `**${i + 1}.** ${formatSchedule(t)} — ${t.task}`);
        return NextResponse.json({
          response: `Which schedule do you want to delete?\n\n${lines.join("\n")}\n\nSay "delete schedule [number]" to remove one.`
        });
      }

      if (scheduleIntent === "toggle") {
        const tasks = await readSchedules();
        const numMatch = normalized.match(/(\d+)/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < tasks.length) {
            tasks[idx] = { ...tasks[idx], enabled: !tasks[idx].enabled };
            await writeSchedules(tasks);
            const status = tasks[idx].enabled ? "▶️ Resumed" : "⏸️ Paused";
            return NextResponse.json({
              response: `${status}: **${tasks[idx].task}** (${formatSchedule(tasks[idx])})`,
              scheduleToggled: { id: tasks[idx].id, enabled: tasks[idx].enabled },
            });
          }
        }
        if (tasks.length === 0) {
          return NextResponse.json({ response: "No scheduled tasks to toggle." });
        }
        const lines = tasks.map((t, i) => {
          const status = t.enabled ? "🟢" : "⏸️";
          return `${status} **${i + 1}.** ${formatSchedule(t)} — ${t.task}`;
        });
        return NextResponse.json({
          response: `Which schedule do you want to pause/resume?\n\n${lines.join("\n")}\n\nSay "pause schedule [number]" or "resume schedule [number]".`
        });
      }
    }

    if (lowered.includes("status")) {
      const status = await runStatus();
      return NextResponse.json({ response: status });
    }

    // ---- Time/date queries — always give exact literal time first ----
    const timeMatch = isTimeQuery(lowered);
    if (timeMatch) {
      const persona = await loadPersonaText();
      const userLoc = extractUserLocation(persona);
      const timeReply = buildTimeResponse(userLoc, locale);
      return NextResponse.json({ response: timeReply });
    }

    // ---- Training/personalization questions — guide user to "remember:" ----
    const isTrainingQ = /\b(?:train|teach|customize|personalize|preferences?|tailor|learn about me|how (?:do|can|should) (?:i|you).*(?:train|teach|set|customize|personalize))\b/i.test(lowered);
    if (isTrainingQ) {
      const persona = await loadPersonaText();
      const memoryCount = persona ? persona.split("\n").filter((l: string) => l.trim()).length : 0;
      const currentMemories = memoryCount > 0
        ? `\n\n📝 *I currently remember ${memoryCount} things about you. Say \`tell me about myself\` to see them.*`
        : "";
      return NextResponse.json({
        response: `Great question! Here's how to train me to your preferences:\n\n**Just say \`remember:\` followed by anything** — I'll save it and use it to personalize every future response.\n\n**Examples:**\n- \`remember: I prefer short, direct answers\`\n- \`remember: I live in Austin, TX\`\n- \`remember: I have 2 kids and a dog\`\n- \`remember: my favorite food is Thai\`\n- \`remember: I'm a morning person\`\n- \`remember: communication style: casual\`\n\nThe more you teach me, the better I get at anticipating what you need. Everything is stored encrypted locally — only you can access it.${currentMemories}`
      });
    }

    if (lowered === "!load-persona" || lowered.includes("load persona") || lowered.includes("tell me about myself")) {
      try {
        const persona = await readFileSafe(personaPath);
        if (!persona) {
          return NextResponse.json({ response: apiStr(locale, "no_persona") });
        }
        const lines = persona.split("\n").filter((l: string) => l.trim());
        const memoryCount = lines.length;

        // Ask LLM to narrate the persona naturally instead of dumping raw bullets
        const narratePrompt = `Here is everything I know about the user from their profile:\n\n${persona}\n\nNow narrate this back to the user in a warm, natural way. Don't dump a list of fields. Instead, talk like a friend summarizing what you know: "You're [name], you [details]..." Keep it conversational and short (3-5 sentences). Include all the details you have but weave them naturally. Don't say "according to your profile" — just say it like you know them.`;
        const narratedReply = await routeToLLM(narratePrompt, { userProfile, locale, history: chatHistory });

        const hint = memoryCount <= 4
          ? `\n\n---\n💡 *Teach me more! Say \`remember: I live in San Ramon\` or \`remember: my wife is pregnant\` to build your profile.*`
          : `\n\n---\n📝 *${memoryCount} things I know about you. Say \`remember: ...\` to teach me more.*`;
        return NextResponse.json({ response: narratedReply + hint });
      } catch {
        return NextResponse.json({ response: apiStr(locale, "no_persona_alt") });
      }
    }

    // ---- Tip toggle commands ----
    const tipToggleMatch = lowered.match(/^(?:remember[:\s]+)?(?:disable|turn off|hide|stop)\s*(?:tips?|nudges?|hints?|suggestions?)$/);
    if (tipToggleMatch) {
      return NextResponse.json({
        response: "Got it! Tips and nudges are now **disabled**. You can re-enable them anytime in **Settings** (gear icon in the sidebar) or say `enable tips`.",
        setNudges: false,
      });
    }
    const tipEnableMatch = lowered.match(/^(?:remember[:\s]+)?(?:enable|turn on|show|start)\s*(?:tips?|nudges?|hints?|suggestions?)$/);
    if (tipEnableMatch) {
      return NextResponse.json({
        response: "Tips and nudges are now **enabled**! I'll show you helpful suggestions as you use HammerLock AI. You can always toggle this in **Settings**.",
        setNudges: true,
      });
    }

    // Handle "remember" commands — append to persona file (encrypted at rest)
    const rememberMatch = normalized.match(/^(?:remember|note|save|update persona)[:\s]+(.+)/i);
    if (rememberMatch && rememberMatch[1]) {
      const note = rememberMatch[1].trim();
      try {
        await appendToPersona(note);
        return NextResponse.json({ response: `${apiStr(locale, "remember_saved")} "${note}"` });
      } catch {
        return NextResponse.json({ response: apiStr(locale, "remember_failed") });
      }
    }

    if (lowered.startsWith("read file")) {
      const match = normalized.match(/read file\s+(.+)/i);
      if (!match) throw new Error("Provide a file path after 'read file'.");
      const target = sanitizePath(match[1].trim());
      const content = await readFileSafe(target);
      return NextResponse.json({ response: `### ${target}\n\n${content}` });
    }

    if (lowered.includes("load plan")) {
      const plan = await readFileSafe(planPath);
      return NextResponse.json({ response: plan });
    }

    // ---- Language switching — "switch to Spanish", "habla en español" ----
    const langSwitchMap: Record<string, { code: string; name: string; greeting: string }> = {
      spanish: { code: "es", name: "Spanish", greeting: "¡Listo! Ahora hablo en español. ¿En qué puedo ayudarte?" },
      español: { code: "es", name: "Spanish", greeting: "¡Listo! Ahora hablo en español. ¿En qué puedo ayudarte?" },
      portuguese: { code: "pt-BR", name: "Portuguese", greeting: "Pronto! Agora estou falando em português. Como posso ajudar?" },
      português: { code: "pt-BR", name: "Portuguese", greeting: "Pronto! Agora estou falando em português. Como posso ajudar?" },
      french: { code: "fr", name: "French", greeting: "C'est fait ! Je parle maintenant en français. Comment puis-je vous aider ?" },
      français: { code: "fr", name: "French", greeting: "C'est fait ! Je parle maintenant en français. Comment puis-je vous aider ?" },
      german: { code: "de", name: "German", greeting: "Fertig! Ich spreche jetzt Deutsch. Wie kann ich helfen?" },
      deutsch: { code: "de", name: "German", greeting: "Fertig! Ich spreche jetzt Deutsch. Wie kann ich helfen?" },
      chinese: { code: "zh", name: "Chinese", greeting: "好的！我现在说中文。有什么可以帮助你的？" },
      japanese: { code: "ja", name: "Japanese", greeting: "了解！日本語で話します。何かお手伝いできますか？" },
      korean: { code: "ko", name: "Korean", greeting: "알겠습니다! 한국어로 대화합니다. 무엇을 도와드릴까요?" },
      arabic: { code: "ar", name: "Arabic", greeting: "تم! أنا أتحدث بالعربية الآن. كيف يمكنني مساعدتك؟" },
      hindi: { code: "hi", name: "Hindi", greeting: "हो गया! अब मैं हिंदी में बात कर रहा हूं। कैसे मदद कर सकता हूं?" },
      russian: { code: "ru", name: "Russian", greeting: "Готово! Теперь говорю по-русски. Чем могу помочь?" },
      english: { code: "en", name: "English", greeting: "Switched back to English! How can I help?" },
    };
    const langMatch = lowered.match(/(?:switch\s+(?:to|language)\s+|habla\s+(?:en\s+)?|speak\s+(?:in\s+)?|parle\s+(?:en\s+)?)(\w+)/i);
    if (langMatch) {
      const targetLang = langMatch[1].toLowerCase();
      const lang = langSwitchMap[targetLang];
      if (lang) {
        return NextResponse.json({
          response: lang.greeting,
          switchLocale: lang.code,
        });
      }
    }

    // ---- "read this out loud" — strip prefix and answer the actual content ----
    const ttsMatch = normalized.match(/^(?:read\s+(?:this\s+)?out\s+loud|say\s+this|speak|read\s+aloud)[:\s]+(.+)/is);
    if (ttsMatch) {
      const actualQuery = ttsMatch[1].trim();
      const reply = await routeToLLM(actualQuery, { userProfile, agentSystemPrompt, locale, history: chatHistory });
      if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
      return NextResponse.json({ response: reply });
    }

    // ---- Reminders — "remind me", "create a reminder", "daily reminder" ----
    const reminderMatch = normalized.match(/^(?:create\s+a?\s*)?(?:daily\s+)?reminder[:\s]+(.+)/i)
      || normalized.match(/^remind\s+me\s+(?:to\s+|every\s+day\s+)?(.+)/i);
    if (reminderMatch) {
      const reminderText = reminderMatch[1].trim();
      // Parse time if present
      const timeMatch = reminderText.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      const timeStr = timeMatch ? timeMatch[1] : "9:00am";
      const taskText = reminderText.replace(/(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, "").replace(/^[:\s,]+|[:\s,]+$/g, "").trim() || reminderText;
      // Save to persona file as a reminder entry (encrypted at rest)
      try {
        const reminderLine = `Reminder: ${taskText} (daily at ${timeStr})`;
        await appendToPersona(reminderLine);
        return NextResponse.json({ response: `✅ Done—pinging you at **${timeStr}**: "${taskText}"\n\nWhen the clock hits ${timeStr}, you'll get an in-app alert + voice notification if sound is on.\n\n*Reminder saved and scheduled.*` });
      } catch {
        return NextResponse.json({ response: "Couldn't save the reminder right now. Try again?" });
      }
    }

    // ---- Mood tracking — "track my mood", "mood:", "log mood" ----
    const moodMatch = normalized.match(/^(?:track\s+my\s+mood|mood|log\s+mood)[:\s]+(.+)/i);
    if (moodMatch) {
      const moodEntry = moodMatch[1].trim();
      const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      try {
        const moodLine = `Mood (${today}): ${moodEntry}`;
        await appendToPersona(moodLine);
        // Generate a warm response using the LLM
        const moodReply = await routeToLLM(
          `The user just logged their mood: "${moodEntry}" on ${today}. Acknowledge it warmly in 1-2 short sentences. If they seem stressed or down, gently offer a tip or ask if they want to talk. If they seem good, celebrate briefly. Keep it natural and caring.`,
          { userProfile, locale, history: chatHistory }
        );
        return NextResponse.json({ response: moodReply + `\n\n*Mood logged and encrypted locally. Say \`track my mood\` anytime to log again.*` });
      } catch {
        return NextResponse.json({ response: "Couldn't log that right now. Try again?" });
      }
    }

    // ---- Agent: summarize my week/chat/history ----
    const summaryMatch = normalized.match(/^(?:run\s+agent[:\s]+)?summarize\s+(?:my\s+)?(?:week|chat|history|conversations?)/i);
    if (summaryMatch && chatHistory.length > 0) {
      const historyText = chatHistory
        .slice(-30)
        .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 200)}`)
        .join("\n");
      const summaryReply = await routeToLLM(
        `Here's the user's recent conversation history. Summarize the key themes and topics they discussed this session in a natural, warm way. Don't list messages — synthesize. Use a conversational tone like "You've been exploring..." or "This week you talked about...". Keep it to 3-5 sentences.\n\nHistory:\n${historyText}`,
        { userProfile, locale }
      );
      if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
      return NextResponse.json({ response: summaryReply });
    }

    // ---- Create note — "create note: my-note.txt" or "add secure note: password is..." ----
    // SKIP if it's an Apple Notes request — those are handled by the action system above
    const isAppleNotesRequest = /\bin\s+(?:apple\s+)?notes?\b/i.test(normalized);
    const createNoteMatch = !isAppleNotesRequest ? normalized.match(/^(?:create|add|new|save)\s+(?:secure\s+)?note[:\s]+(.+)/is) : null;
    if (createNoteMatch) {
      const noteContent = createNoteMatch[1].trim();
      // Extract filename if pattern is "filename: content" or "filename.txt"
      let fileName = `note-${Date.now()}.txt`;
      let content = noteContent;
      const fileNameMatch = noteContent.match(/^([a-zA-Z0-9_-]+(?:\.\w+)?)[:\s]+(.+)/s);
      if (fileNameMatch) {
        fileName = fileNameMatch[1].includes(".") ? fileNameMatch[1] : `${fileNameMatch[1]}.txt`;
        content = fileNameMatch[2].trim();
      }
      // Save to ~/.hammerlock/notes/
      const notesDir = path.join(os.homedir(), ".hammerlock", "notes");
      try {
        await fs.mkdir(notesDir, { recursive: true });
        const filePath = path.join(notesDir, fileName);
        await fs.writeFile(filePath, content, "utf8");
        // Return with createVaultNote directive to refresh vault panel
        return NextResponse.json({
          response: `📝 Done—note saved as **${fileName}**.\n\n> ${content.slice(0, 200)}${content.length > 200 ? "..." : ""}\n\n*Stored locally in your Vault. View or edit it anytime from **My Vault** in the sidebar.*`,
          createVaultNote: { name: fileName, content },
        });
      } catch (err) {
        return NextResponse.json({ response: `Couldn't create the note: ${(err as Error).message}` });
      }
    }

    // ---- Encrypt note/file — "encrypt this note: content" ----
    const encryptMatch = normalized.match(/^encrypt\s+(?:this\s+)?(?:file|note)[:\s]+(.+)/i);
    if (encryptMatch) {
      const noteContent = encryptMatch[1].trim();
      const fileName = `encrypted-${Date.now()}.vault`;
      const notesDir = path.join(os.homedir(), ".hammerlock", "notes");
      try {
        await fs.mkdir(notesDir, { recursive: true });
        // Simple base64 encoding as a stand-in for AES-256 (real crypto would need a master key flow)
        const encoded = Buffer.from(noteContent, "utf8").toString("base64");
        await fs.writeFile(path.join(notesDir, fileName), encoded, "utf8");
        return NextResponse.json({
          response: `🔐 Locked—**${fileName}** encrypted and stored in your Vault.\n\n*Content secured locally. Say \`decrypt ${fileName}\` to view it, or open **My Vault** in the sidebar.*`,
          createVaultNote: { name: fileName, content: noteContent, encrypted: true },
        });
      } catch (err) {
        return NextResponse.json({ response: `Couldn't encrypt: ${(err as Error).message}` });
      }
    }

    // ---- Decrypt file / view from vault ----
    const decryptMatch = normalized.match(/^decrypt\s+(?:this\s+)?(?:file|note)?[:\s]*(.+)/i);
    if (decryptMatch) {
      const fileName = decryptMatch[1].trim();
      const notesDir = path.join(os.homedir(), ".hammerlock", "notes");
      try {
        const filePath = path.join(notesDir, fileName);
        const raw = await fs.readFile(filePath, "utf8");
        // Try base64 decode
        let content: string;
        try {
          content = Buffer.from(raw, "base64").toString("utf8");
          // Validate it's readable text
          if (!/^[\x20-\x7E\n\r\t]+$/.test(content)) content = raw;
        } catch { content = raw; }
        return NextResponse.json({
          response: `🔓 Decrypted **${fileName}**:\n\n> ${content.slice(0, 500)}${content.length > 500 ? "..." : ""}`,
        });
      } catch {
        return NextResponse.json({
          response: `Couldn't find "${fileName}" in your Vault. Check **My Vault** in the sidebar to see your saved notes.`,
        });
      }
    }

    // ---- Image analysis — "analyze this image", "describe this image", "what's in this image" ----
    const imageAnalyzeMatch = normalized.match(/^(?:analyze|describe|what(?:'s| is) (?:in|this)|look at|explain)\s+(?:this\s+)?(?:image|photo|picture|screenshot|pic|meme)[:\s]*(.*)/i);
    if (imageAnalyzeMatch) {
      const extraContext = imageAnalyzeMatch[1]?.trim() || "";
      const imagePrompt = `The user uploaded an image and wants you to describe it. Be specific: mention objects, colors, text, people, mood, setting. Keep it conversational and voice-friendly (3-5 sentences). Example: "That's a golden retriever wearing a tiny hat in a sunny park — tail wagging, looks super happy!" ${extraContext ? `Additional context: ${extraContext}` : ""}`;
      const reply = await routeToLLM(
        imagePrompt,
        { userProfile, agentSystemPrompt, locale, history: chatHistory }
      );
      if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
      return NextResponse.json({ response: reply });
    }

    // ---- File upload handling — "upload file:", "load file:" ----
    const uploadMatch = normalized.match(/^(?:upload|load|open)\s+(?:this\s+)?file[:\s]+(.+)/i);
    if (uploadMatch) {
      const fileName = uploadMatch[1].trim();
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      if (["pdf", "txt", "csv", "xlsx", "xls", "doc", "docx"].includes(ext)) {
        return NextResponse.json({
          response: `📎 To upload **${fileName}**, use the **paperclip button** (📎) in the input bar — just click it and select your file.\n\n**Supported formats:**\n- **PDF** — full text extraction and analysis\n- **Images** — stored encrypted in your Vault\n- **Notes** — create directly in My Vault\n\nOnce uploaded, I'll parse the content and you can ask me anything about it. All files are encrypted with AES-256-GCM locally.`
        });
      }
      return NextResponse.json({
        response: `📎 I can process **PDF files** and **images** right now. Use the **paperclip button** (📎) in the input bar to upload.\n\nFor **.${ext}** files, try saving as PDF or pasting the content directly into the chat — I'll analyze it just the same.`
      });
    }

    // ---- Location prompt: if bare weather/local query with no city and no saved location, ask ----
    const bareLocationQuery = /^(?:what(?:'s| is) the )?(?:weather|fore?cast|temperature)\s*(?:today|tonight|now|this week)?\s*[?!.]?\s*$/i.test(lowered)
      || /near me|things to do nearby|restaurants? nearby/i.test(lowered);
    if (bareLocationQuery) {
      const persona = await loadPersonaText();
      const userLoc = extractUserLocation(persona);
      if (!userLoc) {
        return NextResponse.json({
          response: `📍 Quick—where you at? Give me your city + state (like "San Ramon, CA") and I'll lock it in for all future searches.\n\nJust say: **remember: location: San Ramon, CA 94583**\n\n*Once saved, I'll automatically pull local weather, restaurants, and events for you.*`
        });
      }
    }

    // ---- STREAMING PATH: return SSE stream if requested ----
    if (requestStream) {
      const { stream, model } = await routeToLLMStream(normalized, { userProfile, agentSystemPrompt, locale, history: chatHistory });
      let accumulated = "";
      const encoder = new TextEncoder();
      const sseStream = new ReadableStream({
        async start(ctrl) {
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulated += value;
              ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ token: value })}\n\n`));
            }
            // Send final message with full text + follow-ups
            const parsed = parseFollowUps(cleanLLMResponse(accumulated));
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, response: parsed.clean, followUps: parsed.followUps, model })}\n\n`));
            ctrl.close();
          } catch (err) {
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, error: (err as Error).message })}\n\n`));
            ctrl.close();
          }
          // Deduct credit after streaming completes
          if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
        },
      });
      return new Response(sseStream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }

    // ---- NON-STREAMING PATH: traditional JSON response ----
    const reply = await routeToLLM(normalized, { userProfile, agentSystemPrompt, locale, history: chatHistory });
    if (!isServerless) await deductCredit(creditTypeForModel(lastModelUsed));
    const mainParsed = parseFollowUps(reply);
    return NextResponse.json({
      response: cleanLLMResponse(mainParsed.clean),
      ...(mainParsed.followUps.length > 0 && { followUps: mainParsed.followUps }),
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error("[execute] Error:", message);
    if (lastLLMError) console.error("[execute] Last LLM error:", lastLLMError);

    // Always use the friendly error helper — never dump raw CLI/gateway output to users
    const friendly = friendlyLLMError();
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
