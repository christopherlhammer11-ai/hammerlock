import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * HammerLock AI middleware
 *
 * 1. On Vercel, /chat and /vault → redirect to /get-app (desktop-only)
 * 2. Capture UTM parameters on first visit → store in cookie for attribution
 */

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const UTM_COOKIE = "hlk_utm";
const UTM_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Build response — default pass-through
  let response: NextResponse;

  // Desktop-only routes → redirect to download page (Vercel only)
  if (process.env.VERCEL && (pathname === "/chat" || pathname === "/vault")) {
    const url = request.nextUrl.clone();
    url.pathname = "/get-app";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  // ── UTM Capture (first-touch attribution) ──
  const utmData: Record<string, string> = {};
  let hasUtm = false;
  for (const param of UTM_PARAMS) {
    const val = searchParams.get(param);
    if (val) {
      utmData[param] = val;
      hasUtm = true;
    }
  }

  // Only set if UTM params present AND no existing cookie (first-touch wins)
  if (hasUtm && !request.cookies.get(UTM_COOKIE)) {
    response.cookies.set(UTM_COOKIE, JSON.stringify(utmData), {
      maxAge: UTM_MAX_AGE,
      path: "/",
      httpOnly: false, // Client JS needs to read this for analytics
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  // Match all page routes — skip static assets, images, videos, fonts
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|mp4|webm|webp|woff2?|ttf|eot|css|js|json|xml|txt|map)).*)",
  ],
};
