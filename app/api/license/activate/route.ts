import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** Legacy activation clients are allowed through because the app is now free. */
export async function POST() {
  return NextResponse.json({
    activated: true,
    tier: "free",
    billingType: "free",
    freeRelease: true,
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
