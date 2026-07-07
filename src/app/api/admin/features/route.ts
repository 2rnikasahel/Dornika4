import { NextResponse } from "next/server";
import { db } from "@/db";
import { landingFeatures } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  const data = await db.select().from(landingFeatures);
  return NextResponse.json(data);
}
