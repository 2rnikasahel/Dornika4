/**
 * Commerce helpers for "درنیکا ساحل" (Dornika Sahel).
 *
 * - Session-based cart & wishlist (anonymous visitors supported)
 * - Cookie-backed session token (read on the server, written by the
 *   `/api/session/init` route handler on first visit, or by any route
 *   handler that needs to mint a fresh cookie via `resolveSessionCookieOptions`)
 * - Server-side data fetching for SSR layout (counts, cart page data)
 *
 * Session-token semantics
 * -----------------------
 * `readSessionToken()` ALWAYS returns a non-empty string: if the
 * `dornika_session` cookie is present, that value is used; otherwise a
 * fresh ephemeral token is generated (UUID-based, prefixed `sess_`).
 *
 * IMPORTANT: the freshly generated token is NOT persisted to the cookie
 * by this function — `cookies()` is read-only in Server Components.
 * Persistence happens via:
 *   • the `<SessionInitializer>` component (calls `/api/session/init`
 *     on first visit when `generated=true` is passed from the layout)
 *   • route handlers calling `ensureSessionToken()` in `cart-actions.ts`
 *     / `ensureChatSession()` in `chat-actions.ts`, which use
 *     `readOrGenerateSessionToken()` so they can detect the `generated`
 *     flag and write the cookie themselves.
 */

import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  carts,
  cartItems,
  productVariants,
  products,
  wishlistItems,
} from "@/db/schema";
import {
  getCookieOptions,
  getPreviewCookieOptions,
  isPreviewEnvironment,
} from "./cookie-config";

/** Cookie name that stores the anonymous session token. */
export const SESSION_COOKIE = "dornika_session";
/** Session token TTL: 30 days. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/* ------------------------------------------------------------------ */
/* Session token                                                       */
/* ------------------------------------------------------------------ */

/**
 * Resolve the cookie options appropriate for the current request
 * environment. Exported so route handlers can use the same logic when
 * they actually write the session cookie.
 */
export async function resolveSessionCookieOptions() {
  const hdrs = await import("next/headers").then((m) => m.headers());
  const req = {
    headers: hdrs,
    url: hdrs.get("x-forwarded-url") || hdrs.get("referer") || "",
    hostname: hdrs.get("x-forwarded-host") || hdrs.get("host") || "",
  } as unknown as Parameters<typeof isPreviewEnvironment>[0];

  if (isPreviewEnvironment(req)) {
    return { ...getPreviewCookieOptions(), maxAge: SESSION_TTL_SECONDS };
  }
  return { ...getCookieOptions(), maxAge: SESSION_TTL_SECONDS };
}

/**
 * Generate a fresh session token (UUID-based, prefixed with `sess_`).
 */
export function generateSessionToken(): string {
  return `sess_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Read the session token from the request cookie. Always returns a
 * non-empty string — when the cookie is missing or empty, a fresh
 * ephemeral token is generated (NOT persisted; see module docstring).
 *
 * Use `readOrGenerateSessionToken()` instead when you need to know
 * whether the token was newly generated (e.g. to decide whether to
 * write the cookie from a route handler).
 */
export async function readSessionToken(): Promise<string> {
  const { token } = await readOrGenerateSessionToken();
  return token;
}

/**
 * Read the session token from the cookie. Returns `{ token, generated }`
 * where `generated` is `true` when the cookie was missing and a fresh
 * token had to be generated. Route handlers can use `generated` to
 * decide whether to call `cookies().set(...)` to persist the new token.
 */
export async function readOrGenerateSessionToken(): Promise<{
  token: string;
  generated: boolean;
}> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing && existing.trim().length > 0) {
    return { token: existing, generated: false };
  }
  return { token: generateSessionToken(), generated: true };
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export interface CartPageItem {
  id: string;
  variantId: string | null;
  productId: string | null;
  quantity: number;
  price: number;
  productTitle: string;
  variantTitle: string | null;
  unitLabel: string | null;
  coverImage: string | null;
  slug: string | null;
  lineTotal: number;
}

export interface CartPageData {
  items: CartPageItem[];
  subtotal: number;
  count: number;
}

/**
 * Find the cart row id for the given session token, or null if the
 * visitor has no cart yet. We deliberately don't auto-create the
 * cart row here — that happens lazily when the first item is added
 * via the `/api/cart` route handler.
 */
async function findCartRow(sessionToken: string): Promise<string | null> {
  const existing = (await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.sessionToken, sessionToken))
    .limit(1)) as Array<{ id: string }>;

  return existing.length > 0 ? existing[0].id : null;
}

/**
 * Returns the full cart page data — items enriched with product
 * title / cover image / slug, plus subtotal and total quantity count.
 *
 * When `sessionToken` is null/empty (e.g. anonymous first visit before
 * the cookie has been minted), returns an empty cart.
 */
export async function getCartPageData(
  sessionToken: string | null,
): Promise<CartPageData> {
  if (!sessionToken) return { items: [], subtotal: 0, count: 0 };

  try {
    const cartId = await findCartRow(sessionToken);
    if (!cartId) return { items: [], subtotal: 0, count: 0 };

    const rows = (await db
      .select({
        itemId: cartItems.id,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        priceSnapshot: cartItems.priceSnapshot,
        productTitleSnapshot: cartItems.productTitleSnapshot,
        variantTitleSnapshot: cartItems.variantTitleSnapshot,
        unitLabelSnapshot: cartItems.unitLabelSnapshot,
        productId: products.id,
        productTitle: products.title,
        productSlug: products.slug,
        coverImage: products.coverImage,
        variantName: productVariants.name,
        variantPrice: productVariants.price,
      })
      .from(cartItems)
      .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .leftJoin(products, eq(products.id, productVariants.productId))
      .where(eq(cartItems.cartId, cartId))) as Array<{
      itemId: string;
      variantId: string | null;
      quantity: number;
      priceSnapshot: string | null;
      productTitleSnapshot: string | null;
      variantTitleSnapshot: string | null;
      unitLabelSnapshot: string | null;
      productId: string | null;
      productTitle: string | null;
      variantName: string | null;
      productSlug: string | null;
      coverImage: string | null;
      variantPrice: string | null;
    }>;

    let subtotal = 0;
    let count = 0;

    const items: CartPageItem[] = rows.map((r) => {
      const price = r.priceSnapshot
        ? Number(r.priceSnapshot)
        : r.variantPrice
          ? Number(r.variantPrice)
          : 0;
      const qty = r.quantity || 1;
      const lineTotal = price * qty;
      subtotal += lineTotal;
      count += qty;
      return {
        id: r.itemId,
        variantId: r.variantId,
        productId: r.productId,
        quantity: qty,
        price,
        productTitle: r.productTitleSnapshot || r.productTitle || "",
        variantTitle: r.variantTitleSnapshot || r.variantName || null,
        unitLabel: r.unitLabelSnapshot || null,
        coverImage: r.coverImage || null,
        slug: r.productSlug || null,
        lineTotal,
      };
    });

    return { items, subtotal, count };
  } catch {
    return { items: [], subtotal: 0, count: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

/**
 * Returns the array of product IDs currently in the wishlist for the
 * given session token.
 *
 * NOTE: although the original spec mentioned `number[]`, the
 * `products.id` column is `text` (IDs look like `prod_<uuid>`), so
 * the IDs are returned as strings. All call-sites compare with
 * `String(productId)`, which works correctly with `string[]`.
 */
export async function getWishlistProductIds(
  sessionToken: string | null,
): Promise<string[]> {
  if (!sessionToken) return [];
  try {
    const rows = (await db
      .select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .where(eq(wishlistItems.sessionToken, sessionToken))) as Array<{
      productId: string;
    }>;
    return rows
      .map((r) => r.productId)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

/**
 * Returns the number of distinct products in the wishlist for the
 * given session token.
 */
export async function getWishlistCount(
  sessionToken: string | null,
): Promise<number> {
  if (!sessionToken) return 0;
  try {
    const rows = (await db
      .select({ c: sql<number>`count(*)::int` })
      .from(wishlistItems)
      .where(eq(wishlistItems.sessionToken, sessionToken))) as Array<{
      c: number;
    }>;
    return rows[0]?.c ?? 0;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Combined counts (used by the root layout)                           */
/* ------------------------------------------------------------------ */

export interface CommerceCounts {
  cartCount: number;
  wishlistCount: number;
}

/**
 * Fetches cart + wishlist counts in one call. Used by the root layout
 * to seed the navbar / mobile bottom-nav with badge values.
 */
export async function getCommerceCounts(
  sessionToken: string | null,
): Promise<CommerceCounts> {
  if (!sessionToken) return { cartCount: 0, wishlistCount: 0 };
  try {
    const [cartData, wishCount] = await Promise.all([
      getCartPageData(sessionToken),
      getWishlistCount(sessionToken),
    ]);
    return { cartCount: cartData.count, wishlistCount: wishCount };
  } catch {
    return { cartCount: 0, wishlistCount: 0 };
  }
}
