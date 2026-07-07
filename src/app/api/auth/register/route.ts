import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";
import { isPreviewEnvironment, getCookieOptions, getPreviewCookieOptions } from "@/lib/cookie-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone || "").trim() || null;
    const email = String(body?.email || "").trim() || null;
    const name = String(body?.name || "").trim();
    const password = String(body?.password || "");
    const role = body?.role === "contractor" ? "contractor" : "customer";
    const companyName = body?.companyName ? String(body.companyName).trim() : null;
    if (!name || password.length < 6) return NextResponse.json({ ok: false, error: "نام و کلمه عبور (حداقل ۶ کاراکتر) الزامی است." }, { status: 400 });
    if (!phone && !email) return NextResponse.json({ ok: false, error: "حداقل شماره موبایل یا ایمیل الزامی است." }, { status: 400 });
    if (phone) {
      const [ex] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
      if (ex) return NextResponse.json({ ok: false, error: "این شماره قبلاً ثبت شده است." }, { status: 409 });
    }
    if (email) {
      const [ex] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (ex) return NextResponse.json({ ok: false, error: "این ایمیل قبلاً ثبت شده است." }, { status: 409 });
    }
    const [created] = await db.insert(users).values({ phone, email, name, passwordHash: hashPassword(password), role, companyName }).returning();
    const ident = created.phone || created.email || String(created.id);
    const token = createAuthToken(created.id, ident, created.role);
    const res = NextResponse.json({ ok: true, user: { id: created.id, name: created.name, phone: created.phone, email: created.email, role: created.role } });
    const opts = isPreviewEnvironment(req) ? getPreviewCookieOptions() : getCookieOptions();
    res.cookies.set(USER_TOKEN_COOKIE, token, opts);
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
