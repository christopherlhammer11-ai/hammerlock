import { NextResponse } from "next/server";
import { getCreditInfo } from "@/lib/compute-credits";

/**
 * GET /api/credits
 * Backward-compatible free-use status endpoint.
 * HammerLock no longer meters or sells compute credits.
 */
export async function GET() {
  try {
    const info = await getCreditInfo();
    const hasUserKey = !!(
      process.env.HAMMERLOCK_USER_OPENAI_KEY ||
      process.env.HAMMERLOCK_USER_ANTHROPIC_KEY ||
      process.env.HAMMERLOCK_USER_GEMINI_KEY ||
      process.env.HAMMERLOCK_USER_GROQ_KEY ||
      process.env.HAMMERLOCK_USER_MISTRAL_KEY ||
      process.env.HAMMERLOCK_USER_DEEPSEEK_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.MISTRAL_API_KEY ||
      process.env.DEEPSEEK_API_KEY
    );

    return NextResponse.json({
      ...info,
      usingOwnKey: hasUserKey,
      message: "HammerLock does not meter usage. Provider costs, if any, are billed by the provider.",
    });
  } catch (error) {
    console.error("[credits] Error:", (error as Error).message);
    return NextResponse.json({ error: "Failed to read credits" }, { status: 500 });
  }
}
