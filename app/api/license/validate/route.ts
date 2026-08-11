import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    valid: true,
    tier: "free",
    billingType: "free",
    freeRelease: true,
    validatedAt: new Date().toISOString(),
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
