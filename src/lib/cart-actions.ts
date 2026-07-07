/**
 * Cart actions shared between `/api/cart` and `/api/cart/items`.
 *
 * The session token is read from the `dornika_session` cookie. If the
 * cookie is missing, a 401 is returned (the client is expected to call
 * `/api/session/init` first — the SessionInitializer component handles
 * this on first visit).
 */

import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

import { db } from "@/db";
import {
  carts,
  cartItems,
  productVariants,
  products,
  units,
} from "@/db/schema";
import {
  readSessionToken,
  generateSessionToken,
  resolveSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/commerce";

export interface CartLineItem {
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

export interface CartData {
  items: CartLineItem[];
  subtotal: number;
  count: number;
  sessionToken: string | null;
}

/**
 * Resolves the session token from the request cookie. If absent,
 * generates a fresh one and writes it to the response cookie store
 * (only valid inside a route handler — Server Components can't write
 * cookies). Returns `null` for the token when the cookie can't be set.
 */
export async function ensureSessionToken(): Promise<{
  token: string;
  isNew: boolean;
}> {
  const existing = await readSessionToken();
  if (existing) return { token: existing, isNew: false };
  const fresh = generateSessionToken();
  const opts = await resolveSessionCookieOptions();
  const store = await cookies();
  store.set(SESSION_COOKIE, fresh, opts);
  return { token: fresh, isNew: true };
}

async function getOrCreateCartId(sessionToken: string): Promise<string> {
  const existing = (await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.sessionToken, sessionToken))
    .limit(1)) as Array<{ id: string }>;
  if (existing.length > 0) return existing[0].id;

  const id = `cart_${randomUUID().replace(/-/g, "")}`;
  await db.insert(carts).values({
    id,
    sessionToken,
  });
  return id;
}

/**
 * Returns the full cart contents for the given session token. When
 * `sessionToken` is null/empty, returns an empty cart.
 */
export async function getCart(sessionToken: string | null): Promise<CartData> {
  if (!sessionToken) {
    return { items: [], subtotal: 0, count: 0, sessionToken: null };
  }

  const cartId = await getOrCreateCartId(sessionToken);
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
      unitName: units.name,
      unitSymbol: units.symbol,
    })
    .from(cartItems)
    .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .leftJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(units, eq(units.id, productVariants.unitId))
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
    productSlug: string | null;
    coverImage: string | null;
    variantName: string | null;
    variantPrice: string | null;
    unitName: string | null;
    unitSymbol: string | null;
  }>;

  let subtotal = 0;
  let count = 0;

  const items: CartLineItem[] = rows.map((r) => {
    const price = r.priceSnapshot
      ? Number(r.priceSnapshot)
      : r.variantPrice
        ? Number(r.variantPrice)
        : 0;
    const qty = r.quantity || 1;
    const lineTotal = price * qty;
    subtotal += lineTotal;
    count += qty;
    const unitLabel = r.unitLabelSnapshot || (r.unitName ? `${r.unitName}` : null);
    return {
      id: r.itemId,
      variantId: r.variantId,
      productId: r.productId,
      quantity: qty,
      price,
      productTitle: r.productTitleSnapshot || r.productTitle || "",
      variantTitle: r.variantTitleSnapshot || r.variantName || null,
      unitLabel,
      coverImage: r.coverImage || null,
      slug: r.productSlug || null,
      lineTotal,
    };
  });

  return { items, subtotal, count, sessionToken };
}

export interface AddItemInput {
  variantId: string;
  quantity?: number;
}

export async function addItem(
  sessionToken: string,
  input: AddItemInput,
): Promise<CartData> {
  if (!input.variantId) throw new Error("variantId required");
  const qty = Math.max(1, Math.floor(input.quantity ?? 1));

  // Fetch variant + product to snapshot prices/titles.
  const variantRows = (await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      price: productVariants.price,
      stock: productVariants.stock,
      productId: productVariants.productId,
      productTitle: products.title,
      productSlug: products.slug,
      unitName: units.name,
      unitSymbol: units.symbol,
    })
    .from(productVariants)
    .leftJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(units, eq(units.id, productVariants.unitId))
    .where(eq(productVariants.id, input.variantId))
    .limit(1)) as Array<{
    id: string;
    name: string;
    price: string;
    stock: number;
    productId: string | null;
    productTitle: string | null;
    productSlug: string | null;
    unitName: string | null;
    unitSymbol: string | null;
  }>;

  const variant = variantRows[0];
  if (!variant) throw new Error("variant not found");

  const cartId = await getOrCreateCartId(sessionToken);

  // If a row for this variant already exists in this cart, bump qty.
  const existing = (await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.variantId, variant.id),
      ),
    )
    .limit(1)) as Array<{ id: string; quantity: number }>;

  const unitLabel = variant.unitName || null;
  if (existing.length > 0) {
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + qty })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      id: `ci_${randomUUID().replace(/-/g, "")}`,
      cartId,
      variantId: variant.id,
      quantity: qty,
      priceSnapshot: variant.price,
      productTitleSnapshot: variant.productTitle ?? null,
      variantTitleSnapshot: variant.name,
      unitLabelSnapshot: unitLabel,
    });
  }

  return getCart(sessionToken);
}

export async function updateItemQuantity(
  sessionToken: string,
  itemId: string,
  quantity: number,
): Promise<CartData> {
  const qty = Math.max(1, Math.floor(quantity));
  await db
    .update(cartItems)
    .set({ quantity: qty })
    .where(eq(cartItems.id, itemId));
  return getCart(sessionToken);
}

export async function removeItem(
  sessionToken: string,
  itemId: string,
): Promise<CartData> {
  await db.delete(cartItems).where(eq(cartItems.id, itemId));
  return getCart(sessionToken);
}

export async function clearCart(sessionToken: string): Promise<CartData> {
  const cartId = (await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.sessionToken, sessionToken))
    .limit(1)) as Array<{ id: string }>;
  if (cartId.length > 0) {
    await db.delete(cartItems).where(eq(cartItems.cartId, cartId[0].id));
  }
  return getCart(sessionToken);
}
