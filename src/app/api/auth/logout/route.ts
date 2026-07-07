import { NextRequest, NextResponse } from "next/server";
import { USER_TOKEN_COOKIE } from "@/lib/auth";
import { isPreviewEnvironment } from "@/lib/cookie-config";

export async function POST(req: NextRequest) {
  const referer = req.headers.get("referer") || "/";
  const res = NextResponse.redirect(new URL(referer, req.url), 303);
  if (isPreviewEnvironment(req)) {
    res.cookies.set(USER_TOKEN_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "none", secure: true });
  } else {
    res.cookies.set(USER_TOKEN_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: false });
  }
  return res;
}
