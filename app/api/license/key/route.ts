import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    error: "License keys are no longer required. HammerLock AI is free.",
    downloadUrl: "/get-app",
  }, { status: 410 });
}
