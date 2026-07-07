import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.select().from(categories).where(eq(categories.isActive, true));
    return NextResponse.json({ ok: true, count: result.length, first: result[0] || null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack?.substring(0, 500) : null });
  }
}
