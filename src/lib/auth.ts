/**
 * Authentication system for "درنیکا ساحل" (Dornika Sahel).
 *
 * - PBKDF2 with SHA-512 (node:crypto, 10 000 iterations) for password hashing
 * - HMAC-SHA256 stateless auth tokens (signed JWT-like envelopes)
 * - Cookie-based sessions
 *
 * Password hash format:  pbkdf2$<iterations>$<saltB64>$<hashB64>
 * Token format:          <payloadB64url>.<signatureB64url>
 *   where payload = JSON.stringify({ uid, id, role, iat, exp }).
 *
 * The iteration count is stored *in the hash*, so old hashes (generated
 * with a different iteration count) still verify correctly — the verify
 * path reads the iteration count from the stored hash.
 */

import {
  randomBytes,
  pbkdf2Sync,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq, or } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db";
import {
  getCookieOptions,
  getPreviewCookieOptions,
  isPreviewEnvironment,
} from "./cookie-config";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Name of the browser cookie that stores the signed auth token. */
export const USER_TOKEN_COOKIE = "dornika_user_token";

/** PBKDF2 iteration count used when hashing *new* passwords. */
const PBKDF2_ITERATIONS = 10_000;
/** Salt length in bytes (128-bit salt). */
const SALT_BYTES = 16;
/** Derived key length in bytes (SHA-512 produces a 64-byte digest). */
const KEY_LENGTH = 64;
/** Hash digest algorithm (must match the verify path). */
const DIGEST = "sha512";
/** Base64 is used for salt + hash encoding inside the stored string. */
const HASH_ENCODING: BufferEncoding = "base64";
/** Token TTL: 7 days in seconds. */
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "dornika-dev-secret-change-me";
  return secret;
}

/* ------------------------------------------------------------------ */
/* Password hashing (PBKDF2 / SHA-512 via node:crypto)                */
/* ------------------------------------------------------------------ */

/**
 * Hash a plaintext password using PBKDF2 (SHA-512, 10 000 iterations).
 * Returns a self-describing string of the form
 *   `pbkdf2$<iterations>$<saltB64>$<hashB64>`.
 */
export function hashPassword(password: string): string {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("hashPassword: password must be a non-empty string");
  }
  const salt = randomBytes(SALT_BYTES);
  const derived = pbkdf2Sync(
    Buffer.from(password, "utf8"),
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    DIGEST,
  );
  const saltB64 = salt.toString(HASH_ENCODING);
  const hashB64 = derived.toString(HASH_ENCODING);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

/**
 * Verify a plaintext password against a stored PBKDF2 hash. The iteration
 * count is read from the stored hash so legacy hashes (generated with a
 * different iteration count) still verify correctly.
 *
 * Returns `false` for any malformed input or non-matching password —
 * never throws for bad input.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const saltB64 = parts[2];
  const expectedHashB64 = parts[3];
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  if (!saltB64 || !expectedHashB64) return false;

  let salt: Buffer;
  let expectedHash: Buffer;
  try {
    salt = Buffer.from(saltB64, HASH_ENCODING);
    expectedHash = Buffer.from(expectedHashB64, HASH_ENCODING);
  } catch {
    return false;
  }
  if (salt.length === 0 || expectedHash.length === 0) return false;

  const derived = pbkdf2Sync(
    Buffer.from(password, "utf8"),
    salt,
    iterations,
    expectedHash.length,
    DIGEST,
  );

  // Constant-time comparison — never short-circuit on first mismatch.
  if (derived.length !== expectedHash.length) return false;
  try {
    return timingSafeEqual(derived, expectedHash);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Auth tokens (HMAC-SHA256 via node:crypto)                          */
/* ------------------------------------------------------------------ */

export interface AuthTokenPayload {
  /** User id (matches `users.id`). */
  uid: string;
  /** Login identifier used (username / email / phone). */
  id: string;
  /** Role at the moment of token issuance. */
  role: string;
  /** Issued-at timestamp (seconds since epoch). */
  iat: number;
  /** Expiry timestamp (seconds since epoch). */
  exp: number;
}

function base64UrlEncode(input: Buffer | Uint8Array): string {
  return Buffer.from(input as Uint8Array)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

/**
 * Compute the HMAC-SHA256 signature of `data` using the configured
 * `AUTH_SECRET`. Returns a raw byte buffer.
 */
function hmacSha256(data: string): Buffer {
  return createHmac("sha256", getAuthSecret()).update(data, "utf8").digest();
}

/**
 * Mint a new signed auth token for the given user.
 *
 * The token is `base64url(payload).base64url(signature)` where
 * `payload = JSON.stringify({ uid, id, role, iat, exp })` and the
 * signature is HMAC-SHA256(payloadB64url, AUTH_SECRET).
 */
export function createAuthToken(
  userId: string,
  identifier: string,
  role: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    uid: userId,
    id: identifier,
    role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(Buffer.from(payloadJson, "utf8"));
  const signature = hmacSha256(payloadB64);
  const sigB64 = base64UrlEncode(signature);

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verify a signed auth token: validates the HMAC signature and checks
 * the expiry. Returns the decoded payload on success, or `null` if the
 * token is malformed, tampered with, or expired.
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  // Verify signature first — if this fails, the payload is untrusted.
  const expectedSig = hmacSha256(payloadB64);
  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return null;
  }
  // `timingSafeEqual` throws when the buffers differ in length, so we
  // guard with a length check first and then compare in constant time.
  if (expectedSig.length !== providedSig.length) return null;
  let sigOk = false;
  try {
    sigOk = timingSafeEqual(expectedSig, providedSig);
  } catch {
    sigOk = false;
  }
  if (!sigOk) return null;

  let payloadJson: string;
  try {
    payloadJson = base64UrlDecode(payloadB64).toString("utf8");
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
  if (!payload.uid || typeof payload.uid !== "string") return null;

  return payload;
}

/* ------------------------------------------------------------------ */
/* User lookup                                                         */
/* ------------------------------------------------------------------ */

/**
 * Find a user by any login identifier: username, email, or phone.
 * Email matching is case-insensitive (lower-cased before compare).
 *
 * Returns the user row or `null` when no match is found.
 */
export async function findUserByLoginIdentifier(
  identifier: string,
): Promise<(typeof users.$inferSelect) | null> {
  if (!identifier) return null;
  const normalized = identifier.trim();
  if (!normalized) return null;

  try {
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
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Current user / admin helpers                                        */
/* ------------------------------------------------------------------ */

/**
 * Reads the auth cookie from the incoming request, verifies the token,
 * and returns the corresponding user row (or `null` when not logged in
 * or when the user has been deactivated).
 */
export async function getCurrentUser(): Promise<
  (typeof users.$inferSelect) | null
> {
  try {
    const store = await cookies();
    const token = store.get(USER_TOKEN_COOKIE)?.value;
    if (!token) return null;

    const payload = verifyAuthToken(token);
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
 * Returns the current user only if they hold an admin role
 * (`admin` or `super_admin`). Throws an Error with `statusCode` set to
 * 401 (when not logged in) or 403 (when logged in but not an admin) —
 * route handlers can forward these to a clean JSON response via the
 * `adminGuard` helper.
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
/* Cookie helpers for setting auth tokens                              */
/* ------------------------------------------------------------------ */

/**
 * Returns cookie options appropriate for the current request
 * environment (localhost vs. preview gateway). The `maxAge` is set to
 * the token TTL so the cookie lives as long as the token itself.
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
