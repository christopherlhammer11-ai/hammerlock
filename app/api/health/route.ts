import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  // Check if OpenClaw gateway is reachable
  let gatewayUp = false;
  try {
    await execAsync("openclaw --profile vaultai health --json 2>/dev/null", {
      timeout: 5000,
    });
    gatewayUp = true;
  } catch {
    // Gateway not available — that's OK, direct LLM calls still work
  }

  // Check Ollama availability
  let ollamaUp = false;
  const ollamaBase = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  try {
    const ollamaRes = await fetch(`${ollamaBase}/api/tags`, { signal: AbortSignal.timeout(3000) });
    ollamaUp = ollamaRes.ok;
  } catch {
    // Ollama not running
  }

  // Check if at least one LLM provider is configured
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasLLM = hasOpenAI || hasAnthropic || ollamaUp;

  return NextResponse.json({
    status: hasLLM || gatewayUp ? "ready" : "no_provider",
    gateway: gatewayUp ? "connected" : "offline",
    providers: {
      ollama: ollamaUp,
      openai: hasOpenAI,
      anthropic: hasAnthropic,
    },
  });
}
