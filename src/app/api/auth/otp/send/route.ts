import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const channel = String(body?.channel || "").trim();
    const destination = String(body?.destination || "").trim();
    if (!channel || !destination) return NextResponse.json({ ok: false, error: "کانال و مقصد الزامی است." }, { status: 400 });
    if (channel !== "sms" && channel !== "email") return NextResponse.json({ ok: false, error: "کانال باید sms یا email باشد." }, { status: 400 });
    if (channel === "sms" && !/^09\d{9}$/.test(destination)) return NextResponse.json({ ok: false, error: "شماره موبایل معتبر نیست." }, { status: 400 });
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) return NextResponse.json({ ok: false, error: "ایمیل معتبر نیست." }, { status: 400 });
    const now = new Date();
    const [existing] = await db.select().from(otpCodes).where(and(eq(otpCodes.destination, destination), eq(otpCodes.channel, channel), eq(otpCodes.used, false), gt(otpCodes.expiresAt, now))).limit(1);
    if (existing) {
      const elapsed = Math.floor((now.getTime() - existing.createdAt.getTime()) / 1000);
      if (elapsed < 60) return NextResponse.json({ ok: false, error: `برای دریافت کد جدید ${60 - elapsed} ثانیه صبر کنید.`, retryAfter: 60 - elapsed }, { status: 429 });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.delete(otpCodes).where(and(eq(otpCodes.destination, destination), eq(otpCodes.channel, channel)));
    await db.insert(otpCodes).values({ channel, destination, code, expiresAt, used: false, attempts: 0 });
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ ok: true, message: "کد تایید ارسال شد.", ...(isDev ? { devCode: code } : {}), expiresIn: 300 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
