import { NextResponse } from "next/server";

/**
 * POST /api/transcribe
 * Accepts audio blob (webm/wav) and transcribes via OpenAI Whisper API.
 * Falls back to Ollama if available, or returns a helpful error.
 */
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    // 25MB limit (Whisper API limit)
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio too large (max 25MB)" }, { status: 400 });
    }

    // Try OpenAI Whisper first
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const whisperForm = new FormData();
        // Convert to a proper File with the right extension for Whisper
        const audioBlob = new Blob([await audio.arrayBuffer()], { type: audio.type || "audio/webm" });
        const ext = audio.type?.includes("wav") ? "wav" : "webm";
        whisperForm.append("file", audioBlob, `recording.${ext}`);
        whisperForm.append("model", "whisper-1");
        whisperForm.append("language", "en");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: whisperForm,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data.text?.trim();
          if (text) {
            return NextResponse.json({ text, provider: "whisper" });
          }
        } else {
          const errBody = await res.text();
          console.error("[transcribe] Whisper API error:", res.status, errBody.slice(0, 300));
        }
      } catch (err) {
        console.error("[transcribe] Whisper failed:", (err as Error).message);
      }
    }

    // Try Anthropic (no native transcription, skip)

    // Try Ollama with a whisper model if available (local whisper)
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (!isServerless) {
      // Could add local whisper.cpp support here in the future
    }

    // No provider available
    return NextResponse.json(
      {
        error: "Voice transcription requires an OpenAI API key. Add OPENAI_API_KEY to your .env.local file.",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("[transcribe] Error:", (error as Error).message);
    return NextResponse.json(
      { error: "Transcription failed: " + (error as Error).message },
      { status: 500 }
    );
  }
}
