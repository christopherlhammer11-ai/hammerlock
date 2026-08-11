import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/** Compatibility endpoint for older desktop builds. */
export async function POST() {
  return NextResponse.json({
    activated: true,
    tier: "free",
    billingType: "free",
    freeRelease: true,
  });
}
