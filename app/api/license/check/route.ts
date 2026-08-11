import { NextResponse } from "next/server";

/** Backward-compatible response for desktop clients that still check a tier. */
export async function GET() {
  return NextResponse.json({
    needsActivation: false,
    active: true,
    tier: "free",
    billingType: "free",
    freeRelease: true,
  });
}
