import { NextResponse } from "next/server";

const retired = () => NextResponse.json(
  {
    error: "Checkout has been retired. HammerLock AI is free to download and use.",
    downloadUrl: "/get-app",
  },
  { status: 410 }
);

export const GET = retired;
export const POST = retired;
