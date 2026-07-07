import { NextResponse } from "next/server";

import {
  generateSessionToken,
  resolveSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/commerce";

/**
 * POST /api/session/init
 *
 * Mints a fresh session token and writes it to the response cookie.
 * Called from the client-side `<SessionInitializer>` on first visit
 * (when the server-rendered layout detected the cookie was missing).
 */
export async function POST() {
  const token = generateSessionToken();
  const opts = await resolveSessionCookieOptions();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, opts);
  return res;
}
