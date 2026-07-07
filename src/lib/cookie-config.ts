export function isPreviewEnvironment(req: Request): boolean {
  const forwardedHost = req.headers.get("x-forwarded-host") || "";
  const host = req.headers.get("host") || "";
  const origin = req.headers.get("origin") || "";
  const forwardedProto = req.headers.get("x-forwarded-proto") || "";
  const previewPatterns = ["space-z.ai", "chatglm.cn", "preview"];
  const allHeaders = `${forwardedHost} ${host} ${origin}`;
  const isPreviewDomain = previewPatterns.some((p) => allHeaders.includes(p));
  const isHttps = forwardedProto === "https" || origin.startsWith("https://");
  return isPreviewDomain || isHttps;
}

export function getCookieOptions(maxAgeDays: number = 30) {
  return { path: "/", maxAge: 60 * 60 * 24 * maxAgeDays, httpOnly: true, sameSite: "lax" as const, secure: false };
}

export function getPreviewCookieOptions(maxAgeDays: number = 30) {
  return { path: "/", maxAge: 60 * 60 * 24 * maxAgeDays, httpOnly: true, sameSite: "none" as const, secure: true };
}
