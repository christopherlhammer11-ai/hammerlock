/**
 * POST /api/license/activate-proxy
 *
 * Server-side proxy for license activation. The desktop app's activate page
 * (running on localhost) calls this local endpoint, which forwards the request
 * to the remote hammerlockai.com server. This avoids CORS issues since
 * server-to-server requests don't have CORS restrictions.
 */

import { NextRequest, NextResponse } from "next/server";

const REMOTE_API = "https://www.hammerlockai.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${REMOTE_API}/api/license/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[activate-proxy] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Cannot reach activation server. Check your internet connection." },
      { status: 502 }
    );
  }
}
