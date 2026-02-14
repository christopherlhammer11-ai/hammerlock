import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * POST /api/save-persona
 * Writes the user's persona to ~/.vaultai/persona.md so the server-side
 * LLM routing (execute endpoint) can inject it as system context.
 *
 * The client keeps an encrypted copy in the vault. This is the plaintext
 * version used by the server for LLM prompts.
 */
const VAULTAI_DIR = path.join(os.homedir(), ".vaultai");
const PERSONA_PATH = path.join(VAULTAI_DIR, "persona.md");

export async function POST(req: Request) {
  try {
    const { persona } = await req.json();

    if (!persona || typeof persona !== "string") {
      return NextResponse.json({ error: "No persona provided" }, { status: 400 });
    }

    // Ensure ~/.vaultai/ exists
    await fs.mkdir(VAULTAI_DIR, { recursive: true });

    // Write persona file
    await fs.writeFile(PERSONA_PATH, persona, "utf8");

    return NextResponse.json({ status: "ok", path: PERSONA_PATH });
  } catch (error) {
    console.error("[save-persona] Error:", (error as Error).message);
    return NextResponse.json(
      { error: "Failed to save persona" },
      { status: 500 }
    );
  }
}
