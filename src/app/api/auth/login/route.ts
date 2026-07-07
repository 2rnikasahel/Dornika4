import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createAuthToken, USER_TOKEN_COOKIE, findUserByLoginIdentifier } from "@/lib/auth";
import { isPreviewEnvironment, getCookieOptions, getPreviewCookieOptions } from "@/lib/cookie-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const identifier = String(body?.identifier || body?.phone || body?.username || body?.email || "").trim();
    const password = String(body?.password || "");
    if (!identifier || !password) return NextResponse.json({ ok: false, error: "شناسه ورود و کلمه عبور الزامی است." }, { status: 400 });
    const user = await findUserByLoginIdentifier(identifier);
    if (!user || !verifyPassword(password, user.passwordHash)) return NextResponse.json({ ok: false, error: "شناسه ورود یا کلمه عبور اشتباه است." }, { status: 401 });
    if (!user.isActive) return NextResponse.json({ ok: false, error: "حساب کاربری شما غیرفعال شده است." }, { status: 403 });
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
