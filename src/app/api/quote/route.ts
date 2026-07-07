import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quoteRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const phone = String(body?.phone || "").trim();
    const email = body?.email ? String(body.email).trim() : null;
    const company = body?.company ? String(body.company).trim() : null;
    const message = String(body?.message || "").trim();
    if (!name || !phone || !message) return NextResponse.json({ ok: false, error: "نام، شماره و پیام الزامی است." }, { status: 400 });
    if (!/^09\d{9}$/.test(phone)) return NextResponse.json({ ok: false, error: "شماره موبایل معتبر نیست." }, { status: 400 });
    const user = await getCurrentUser();
    const [created] = await db.insert(quoteRequests).values({ userId: user?.id || null, name, phone, email, company, message, status: "new" }).returning();
    return NextResponse.json({ ok: true, message: "درخواست استعلام ثبت شد.", id: created.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || (admin.role !== "admin" && admin.role !== "super_admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  const quotes = await db.select().from(quoteRequests);
  return NextResponse.json(quotes);
}
