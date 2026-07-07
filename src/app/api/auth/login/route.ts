import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword, createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";
import { isPreviewEnvironment, getCookieOptions, getPreviewCookieOptions } from "@/lib/cookie-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const identifier = String(body?.identifier || body?.phone || body?.username || body?.email || "").trim();
    const password = String(body?.password || "");
    if (!identifier || !password) return NextResponse.json({ ok: false, error: "شناسه ورود و کلمه عبور الزامی است." }, { status: 400 });

    // Direct query instead of findUserByLoginIdentifier
    const rows = await db.select().from(users).where(
      or(eq(users.username, identifier), eq(users.email, identifier.toLowerCase()), eq(users.phone, identifier))
    ).limit(1);
    
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!user) return NextResponse.json({ ok: false, error: "کاربر یافت نشد. ابتدا ثبت‌نام کنید." }, { status: 401 });

    // For now, check if passwordHash is empty (OTP users) or verify
    if (!user.passwordHash) return NextResponse.json({ ok: false, error: "این حساب با OTP ایجاد شده. از ورود با کد استفاده کنید." }, { status: 401 });
    
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return NextResponse.json({ ok: false, error: "کلمه عبور اشتباه است." }, { status: 401 });

    if (!user.isActive) return NextResponse.json({ ok: false, error: "حساب غیرفعال است." }, { status: 403 });

    const ident = user.username || user.phone || user.email || String(user.id);
    const token = createAuthToken(user.id, ident, user.role);
    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, role: user.role } });
    const opts = isPreviewEnvironment(req) ? getPreviewCookieOptions() : getCookieOptions();
    res.cookies.set(USER_TOKEN_COOKIE, token, opts);
    return res;
  } catch (error) {
    console.error("[login] Error:", error);
    return NextResponse.json({ ok: false, error: `خطا: ${(error as Error).message}` }, { status: 500 });
  }
}
