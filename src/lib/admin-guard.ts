/**
 * Admin API error helper. Catches the `requireAdmin` thrown error and
 * converts it to a JSON NextResponse.
 */
import { NextResponse } from "next/server";

export async function adminGuard<T>(
  fn: () => Promise<T>,
): Promise<Response | T> {
  try {
    return await fn();
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    const code = e.statusCode ?? 500;
    if (code === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (code === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.warn("[admin] error:", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: code });
  }
}
