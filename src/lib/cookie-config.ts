/**
 * Cookie configuration for "درنیکا ساحل" (Dornika Sahel).
 *
 * The platform is served both from `localhost` (local dev) and from the
 * preview gateway (`space-z.ai`, `chatglm.cn`, HTTPS front-ends). Cookies
 * must be issued with the right `sameSite` / `secure` combination so
 * that auth sessions survive across the gateway hop.
 */

/* ------------------------------------------------------------------ */
/* Preview environment detection                                      */
/* ------------------------------------------------------------------ */

export interface CookieRequestLike {
  headers?: {
    get(name: string): string | null;
  } | Headers;
  url?: string;
  hostname?: string;
}

const PREVIEW_HOST_FRAGMENTS = [
  "space-z.ai",
  "chatglm.cn",
  "preview.app",
  ".z.ai",
];

function readHeader(req: CookieRequestLike, name: string): string | null {
  if (!req.headers) return null;
  if (typeof (req.headers as Headers).get === "function") {
    return (req.headers as Headers).get(name);
  }
  return (req.headers as { get(n: string): string | null }).get(name);
}

/**
 * Returns true when the request came through the preview gateway.
 *
 * Heuristics (any one of):
 *  - The `x-forwarded-host` / `host` header contains a known preview domain
 *  - The `x-forwarded-proto` header is `https`
 *  - The `forwarded` header sets `proto=https`
 *  - The request URL begins with `https://`
 */
export function isPreviewEnvironment(req: CookieRequestLike): boolean {
  const fwdHost =
    readHeader(req, "x-forwarded-host") || readHeader(req, "host") || "";
  const fwdProto = readHeader(req, "x-forwarded-proto") || "";
  const forwarded = readHeader(req, "forwarded") || "";

  const host =
    req.hostname || (typeof fwdHost === "string" ? fwdHost.split(":")[0] : "");
  const url = req.url || "";

  if (fwdProto === "https") return true;
  if (/proto=https/i.test(forwarded)) return true;
  if (url.startsWith("https://")) return true;

  for (const fragment of PREVIEW_HOST_FRAGMENTS) {
    if (host && host.includes(fragment)) return true;
    if (url && url.includes(fragment)) return true;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/* Cookie option builders                                             */
/* ------------------------------------------------------------------ */

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
}

/**
 * Cookie options for localhost (or any non-HTTPS environment).
 * Uses `sameSite: lax` so dev-server redirects work.
 */
export function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  };
}

/**
 * Cookie options for the preview gateway.
 * `sameSite: none` + `secure: true` is required for the auth cookie to
 * be sent across the gateway's cross-site embedding.
 */
export function getPreviewCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };
}

/**
 * Returns cookie options appropriate for the given request, automatically
 * picking the preview variant when needed.
 */
export function resolveCookieOptions(
  req: CookieRequestLike,
): CookieOptions {
  return isPreviewEnvironment(req)
    ? getPreviewCookieOptions()
    : getCookieOptions();
}
