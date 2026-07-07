/**
 * Commerce helpers for "درنیکا ساحل" (Dornika Sahel).
 *
 * - Session-based cart & wishlist (anonymous users supported)
 * - Cookie-backed session token (read-only on the server; written via
 *   the `/api/session/init` route handler on first visit)
 * - Server-side data fetching for SSR layout (counts, cart page data)
 */

import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
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

export const SESSION_COOKIE = "dornika_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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
 * Read the session token from the request cookie. If the cookie is
 * missing or empty, returns `null` — the caller can then fall back to
 * a fresh ephemeral token via `generateSessionToken()` and ask the
 * client to mint a real cookie by calling `/api/session/init`.
 *
 * NOTE: cookies() can only be *read* in Server Components; writing
 * requires a Route Handler or Server Action, so this function is
 * read-only by design.
 */
export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing && existing.trim().length > 0) return existing;
  return null;
}

/**
 * Server-component friendly variant: always returns a usable token.
 * If the cookie exists, returns it; otherwise generates a fresh one
 * (without persisting it). Pass `wasGenerated = true` to the client
 * via the `<SessionInitializer>` component to actually mint the
 * cookie on first visit.
 */
export async function readOrGenerateSessionToken(): Promise<{
  token: string;
  generated: boolean;
}> {
  const existing = await readSessionToken();
  if (existing) return { token: existing, generated: false };
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
 * title / cover image / slug, plus subtotal and quantity count.
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
