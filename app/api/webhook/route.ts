import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "retired", reason: "HammerLock AI is free" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ status: "retired", reason: "Billing is disabled" }, { status: 410 });
}
