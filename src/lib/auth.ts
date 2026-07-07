/**
 * Authentication system for "درنیکا ساحل" (Dornika Sahel).
 *
 * - PBKDF2 with SHA-512 for password hashing
 * - HMAC-SHA256 stateless auth tokens (signed JWT-like envelopes)
 * - Cookie-based sessions
 *
 * Tokens have the shape:  base64url(payload).base64url(signature)
 * where payload = JSON.stringify({ uid, id, role, iat, exp }).
 */

import { cookies, headers } from "next/headers";
import { eq, or } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db";
import {
  getCookieOptions,
  getPreviewCookieOptions,
  isPreviewEnvironment,
} from "./cookie-config";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

export const USER_TOKEN_COOKIE = "dornika_token";

const PBKDF2_ITERATIONS = 120_000;
const SALT_BYTES = 16;
const KEY_LENGTH = 64; // bytes (matches SHA-512 digest length)
const HASH_ENCODING: BufferEncoding = "base64";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "dornika-dev-secret-change-me";
  return secret;
}

/* ------------------------------------------------------------------ */
/* Password hashing (PBKDF2 / SHA-512)                                */
/* ------------------------------------------------------------------ */

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-512",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  const saltB64 = Buffer.from(salt).toString(HASH_ENCODING);
  const hashB64 = Buffer.from(derivedBits).toString(HASH_ENCODING);

  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash) return false;

  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const saltB64 = parts[2];
  const expectedHashB64 = parts[3];

  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  let salt: Uint8Array;
  let expectedHash: Uint8Array;
  try {
    salt = new Uint8Array(Buffer.from(saltB64, HASH_ENCODING));
    expectedHash = new Uint8Array(Buffer.from(expectedHashB64, HASH_ENCODING));
  } catch {
    return false;
  }
  if (salt.length === 0 || expectedHash.length === 0) return false;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-512",
      salt: salt as unknown as BufferSource,
      iterations,
    },
    keyMaterial,
    expectedHash.length * 8,
  );

  const derived = new Uint8Array(derivedBits);
  return constantTimeEqual(derived, expectedHash);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/* Auth tokens (HMAC-SHA256)                                          */
/* ------------------------------------------------------------------ */

export interface AuthTokenPayload {
  uid: string; // user id
  id: string; // login identifier (username/email/phone)
  role: string;
  iat: number; // issued at (seconds)
  exp: number; // expires at (seconds)
}

function base64UrlEncode(input: Buffer | Uint8Array): string {
  const b64 = Buffer.from(input as Uint8Array).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  return new Uint8Array(Buffer.from(padded, "base64"));
}

async function hmacSha256(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return new Uint8Array(sig);
}

export async function createAuthToken(
  userId: string,
  identifier: string,
  role: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    uid: userId,
    id: identifier,
    role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(payloadJson),
  );

  const signature = await hmacSha256(payloadB64);
  const sigB64 = base64UrlEncode(signature);

  return `${payloadB64}.${sigB64}`;
}

export async function verifyAuthToken(
  token: string,
): Promise<AuthTokenPayload | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  // Verify signature first.
  const expectedSig = await hmacSha256(payloadB64);
  let providedSig: Uint8Array;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return null;
  }
  if (!constantTimeEqual(expectedSig, providedSig)) return null;

  let payloadJson: string;
  try {
    payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  } catch {
    return null;
  }

  let payload: AuthTokenPayload;
  try {
    payload = JSON.parse(payloadJson) as AuthTokenPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;

  return payload;
}

/* ------------------------------------------------------------------ */
/* User lookup                                                        */
/* ------------------------------------------------------------------ */

/**
 * Find a user by any login identifier: username, email, or phone.
 * Returns the user row or null.
 */
export async function findUserByLoginIdentifier(
  identifier: string,
): Promise<(typeof users.$inferSelect) | null> {
  if (!identifier) return null;
  const normalized = identifier.trim();

  const rows = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, normalized),
        eq(users.email, normalized.toLowerCase()),
        eq(users.phone, normalized),
      ),
    )
    .limit(1);

  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return (row as typeof users.$inferSelect) ?? null;
}

/* ------------------------------------------------------------------ */
/* Current user / admin helpers                                       */
/* ------------------------------------------------------------------ */

/**
 * Reads the auth cookie from the incoming request, verifies the token,
 * and returns the corresponding user row (or null when not logged in
 * or when the user has been deactivated).
 */
export async function getCurrentUser(): Promise<
  (typeof users.$inferSelect) | null
> {
  try {
    const store = await cookies();
    const token = store.get(USER_TOKEN_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyAuthToken(token);
    if (!payload || !payload.uid) return null;

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.uid))
      .limit(1);

    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!row) return null;

    const user = row as typeof users.$inferSelect;
    if (!user.isActive) return null;

    return user;
  } catch {
    return null;
  }
}

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

/**
 * Returns the current user only if they hold an admin role.
 * Throws a Next.js-style error object the caller can forward when the
 * user is not authorized (so route handlers can return a clean 401/403).
 */
export async function requireAdmin(): Promise<
  (typeof users.$inferSelect) | never
> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("Unauthorized") as Error & {
      statusCode?: number;
    };
    err.statusCode = 401;
    throw err;
  }
  if (!ADMIN_ROLES.has(user.role)) {
    const err = new Error("Forbidden") as Error & {
      statusCode?: number;
    };
    err.statusCode = 403;
    throw err;
  }
  return user;
}

/* ------------------------------------------------------------------ */
/* Cookie helpers for setting auth tokens                             */
/* ------------------------------------------------------------------ */

/**
 * Returns cookie options appropriate for the current request environment
 * (localhost vs. preview gateway).
 */
export async function resolveAuthCookieOptions() {
  const hdrs = await headers();
  const req = {
    headers: hdrs,
    url: hdrs.get("x-forwarded-url") || hdrs.get("referer") || "",
    hostname: hdrs.get("x-forwarded-host") || hdrs.get("host") || "",
  } as unknown as Parameters<typeof isPreviewEnvironment>[0];

  if (isPreviewEnvironment(req)) {
    return { ...getPreviewCookieOptions(), maxAge: TOKEN_TTL_SECONDS };
  }
  return { ...getCookieOptions(), maxAge: TOKEN_TTL_SECONDS };
}
