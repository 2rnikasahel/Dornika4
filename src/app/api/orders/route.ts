import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, carts, cartItems, productVariants, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد شوید." }, { status: 401 });
    const body = await req.json();
    const { shippingAddress, paymentMethod, notes } = body;
    if (!shippingAddress) return NextResponse.json({ ok: false, error: "آدرس الزامی است." }, { status: 400 });
    const [cart] = await db.select().from(carts).where(eq(carts.sessionToken, body.sessionToken || "")).limit(1);
    if (!cart) return NextResponse.json({ ok: false, error: "سبد خرید خالی است." }, { status: 400 });
    const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
    if (items.length === 0) return NextResponse.json({ ok: false, error: "سبد خرید خالی است." }, { status: 400 });
    const total = items.reduce((sum, i) => sum + Number(i.priceSnapshot) * i.quantity, 0);
    const orderNumber = `DS-${Date.now().toString(36).toUpperCase()}`;
    const [order] = await db.insert(orders).values({ orderNumber, userId: user.id, status: "pending_payment", totalAmount: String(total), shippingAddress, paymentMethod: paymentMethod || "zarinpal", notes: notes || null }).returning();
    for (const item of items) {
      await db.insert(orderItems).values({ orderId: order.id, variantId: item.variantId, sku: "", productTitle: item.productTitleSnapshot, variantTitle: item.variantTitleSnapshot, quantity: item.quantity, unitPrice: item.priceSnapshot, lineTotal: String(Number(item.priceSnapshot) * item.quantity) });
    }
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return NextResponse.json({ ok: true, order: { id: order.id, orderNumber: order.orderNumber, total: total } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
