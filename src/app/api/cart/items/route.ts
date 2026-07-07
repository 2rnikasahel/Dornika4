import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { carts, cartItems, productVariants, products, units } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "dornika_session";
async function getCart(req: NextRequest) {
  const store = await cookies();
  let token = store.get(COOKIE)?.value;
  if (!token) { token = crypto.randomBytes(16).toString("hex"); }
  const [existing] = await db.select().from(carts).where(eq(carts.sessionToken, token)).limit(1);
  if (existing) return { cart: existing, token };
  const [cart] = await db.insert(carts).values({ sessionToken: token }).returning();
  return { cart, token };
}

export async function GET(req: NextRequest) {
  const { cart } = await getCart(req);
  const items = await db.select({
    id: cartItems.id, variantId: cartItems.variantId, quantity: cartItems.quantity,
    priceSnapshot: cartItems.priceSnapshot, productTitle: cartItems.productTitleSnapshot,
    variantTitle: cartItems.variantTitleSnapshot, unitLabel: cartItems.unitLabelSnapshot,
  }).from(cartItems).where(eq(cartItems.cartId, cart.id));
  const subtotal = items.reduce((sum, i) => sum + Number(i.priceSnapshot) * i.quantity, 0);
  return NextResponse.json({ items, subtotal, count: items.length });
}

export async function POST(req: NextRequest) {
  try {
    const { cart } = await getCart(req);
    const body = await req.json();
    const variantId = Number(body?.variantId);
    const qty = Math.max(1, Number(body?.qty || body?.quantity || 1));
    if (!variantId) return NextResponse.json({ ok: false, error: "variantId الزامی است." }, { status: 400 });
    const [v] = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
    if (!v) return NextResponse.json({ ok: false, error: "تنوع یافت نشد." }, { status: 404 });
    const [p] = await db.select().from(products).where(eq(products.id, v.productId)).limit(1);
    if (!p) return NextResponse.json({ ok: false, error: "محصول یافت نشد." }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [u]: any = v.unitId ? await db.select().from(units).where(eq(units.id, v.unitId as any)).limit(1) : [null];
    const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId))).limit(1);
    if (existing) {
      await db.update(cartItems).set({ quantity: existing.quantity + qty }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, variantId, quantity: qty, priceSnapshot: v.price, productTitleSnapshot: p.title, variantTitleSnapshot: v.name, unitLabelSnapshot: u ? `${u.name}` : null });
    }
    const res = NextResponse.json({ ok: true });
    const store = await cookies();
    if (!store.get(COOKIE)?.value) { res.cookies.set(COOKIE, (await getCart(req)).token, { path: "/", maxAge: 86400 * 30, httpOnly: true, sameSite: "lax" }); }
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { cart } = await getCart(req);
    const body = await req.json();
    const itemId = Number(body?.itemId);
    const qty = Number(body?.qty);
    if (!itemId || !qty) return NextResponse.json({ ok: false, error: "itemId و qty الزامی است." }, { status: 400 });
    if (qty <= 0) { await db.delete(cartItems).where(eq(cartItems.id, itemId)); }
    else { await db.update(cartItems).set({ quantity: qty }).where(eq(cartItems.id, itemId)); }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = Number(searchParams.get("itemId"));
    if (itemId) await db.delete(cartItems).where(eq(cartItems.id, itemId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
