import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, otpCodes } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { createAuthToken, USER_TOKEN_COOKIE } from "@/lib/auth";
import { isPreviewEnvironment, getCookieOptions, getPreviewCookieOptions } from "@/lib/cookie-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const channel = String(body?.channel || "").trim();
    const destination = String(body?.destination || "").trim();
    const code = String(body?.code || "").trim();
    if (!channel || !destination || !code) return NextResponse.json({ ok: false, error: "کانال، مقصد و کد الزامی است." }, { status: 400 });
    if (code.length !== 6 || !/^\d{6}$/.test(code)) return NextResponse.json({ ok: false, error: "کد باید ۶ رقم باشد." }, { status: 400 });
    const now = new Date();
    const [otp] = await db.select().from(otpCodes).where(and(eq(otpCodes.destination, destination), eq(otpCodes.channel, channel as "sms" | "email"), eq(otpCodes.used, false), gt(otpCodes.expiresAt, now))).limit(1);
    if (!otp) return NextResponse.json({ ok: false, error: "کد معتبر نیست یا منقضی شده است." }, { status: 401 });
    if (otp.attempts >= 5) { await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id)); return NextResponse.json({ ok: false, error: "تعداد تلاش‌های ناموفق بیش از حد." }, { status: 429 }); }
    if (otp.code !== code) { await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id)); return NextResponse.json({ ok: false, error: "کد تایید اشتباه است." }, { status: 401 }); }
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
    let [user] = channel === "sms" ? await db.select().from(users).where(eq(users.phone, destination)).limit(1) : await db.select().from(users).where(eq(users.email, destination)).limit(1);
    if (!user) {
      const name = channel === "sms" ? `کاربر ${destination.slice(-4)}` : destination.split("@")[0];
      const [created] = await db.insert(users).values({ phone: channel === "sms" ? destination : null, email: channel === "email" ? destination : null, name, passwordHash: "", role: "customer", isActive: true }).returning();
      user = created;
    }
    if (!user.isActive) return NextResponse.json({ ok: false, error: "حساب غیرفعال است." }, { status: 403 });
    const ident = user.username || user.phone || user.email || String(user.id);
    const token = createAuthToken(user.id, ident, user.role);
    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, role: user.role } });
    const opts = isPreviewEnvironment(req) ? getPreviewCookieOptions() : getCookieOptions();
    res.cookies.set(USER_TOKEN_COOKIE, token, opts);
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
