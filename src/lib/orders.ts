// @ts-nocheck
/**
 * Order creation + payment processing for "درنیکا ساحل" (Dornika Sahel).
 *
 * - `createOrderFromCart()` reads the session cart, builds an order
 *   with line items + total, marks the cart as consumed, and returns
 *   the new order row.
 * - `startPayment()` calls the configured gateway (sandbox / zarinpal /
 *   zibal) and returns the gateway URL the client should redirect to.
 * - `verifyPayment()` verifies the gateway callback and marks the
 *   order as paid (status → confirmed).
 */

import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "@/db";
import {
  carts,
  cartItems,
  productVariants,
  products,
  orders,
  orderItems,
  users,
} from "@/db/schema";
import {
  getGateway,
  type GatewaySlug,
} from "./payment-gateways";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DS-${y}${m}${d}-${rand}`;
}

export interface CreateOrderInput {
  sessionToken: string;
  userId?: string | null;
  shippingAddress?: string;
  notes?: string;
  paymentMethod?: string;
}

export interface CreateOrderResult {
  ok: boolean;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Create order from cart                                              */
/* ------------------------------------------------------------------ */

export async function createOrderFromCart(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (!input.sessionToken) {
    return { ok: false, error: "session required" };
  }

  // Find cart
  const cartRows = (await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.sessionToken, input.sessionToken))
    .limit(1)) as Array<{ id: string }>;
  const cartId = cartRows[0]?.id;
  if (!cartId) return { ok: false, error: "cart is empty" };

  // Load items joined with variant + product
  const items = (await db
    .select({
      itemId: cartItems.id,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      priceSnapshot: cartItems.priceSnapshot,
      productTitle: products.title,
      productSlug: products.slug,
      variantName: productVariants.name,
      variantPrice: productVariants.price,
      sku: productVariants.sku,
      stock: productVariants.stock,
    })
    .from(cartItems)
    .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .leftJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId))) as Array<{
    itemId: string;
    variantId: string | null;
    quantity: number;
    priceSnapshot: string | null;
    productTitle: string | null;
    productSlug: string | null;
    variantName: string | null;
    variantPrice: string | null;
    sku: string | null;
    stock: number | null;
  }>;

  if (items.length === 0) return { ok: false, error: "cart is empty" };

  let total = 0;
  const lineItems = items.map((it) => {
    const unit = it.priceSnapshot
      ? Number(it.priceSnapshot)
      : it.variantPrice
        ? Number(it.variantPrice)
        : 0;
    const qty = it.quantity || 1;
    const lineTotal = unit * qty;
    total += lineTotal;
    return {
      variantId: it.variantId,
      sku: it.sku,
      productTitle: it.productTitle || "محصول",
      variantTitle: it.variantName,
      quantity: qty,
      unitPrice: unit,
      lineTotal,
    };
  });

  const orderId = `ord_${randomUUID().replace(/-/g, "")}`;
  const orderNumber = generateOrderNumber();

  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    userId: input.userId ?? null,
    status: "pending",
    totalAmount: String(total.toFixed(2)),
    shippingAddress: input.shippingAddress ?? null,
    paymentMethod: input.paymentMethod ?? null,
    notes: input.notes ?? null,
  });

  // Insert line items
  for (const li of lineItems) {
    await db.insert(orderItems).values({
      
      orderId,
      variantId: li.variantId,
      sku: li.sku,
      productTitle: li.productTitle,
      variantTitle: li.variantTitle,
      quantity: li.quantity,
      unitPrice: String(li.unitPrice.toFixed(2)),
      lineTotal: String(li.lineTotal.toFixed(2)),
    });
  }

  // Clear the cart
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));

  return {
    ok: true,
    orderId,
    orderNumber,
    totalAmount: total,
  };
}

/* ------------------------------------------------------------------ */
/* Payment flow                                                        */
/* ------------------------------------------------------------------ */

export interface StartPaymentResult {
  ok: boolean;
  gatewayUrl?: string | null;
  authority?: string;
  error?: string;
}

export async function startPayment(opts: {
  orderId: string;
  callbackUrl: string;
  gateway?: GatewaySlug;
  mobile?: string;
  email?: string;
}): Promise<StartPaymentResult> {
  const orderRows = (await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, opts.orderId))
    .limit(1)) as Array<{
    id: string;
    orderNumber: string;
    totalAmount: string;
    status: string;
  }>;
  const order = orderRows[0];
  if (!order) return { ok: false, error: "order not found" };
  if (order.status !== "pending") {
    return { ok: false, error: "order is not pending" };
  }

  const gateway = getGateway(opts.gateway);
  try {
    const created = await gateway.createPayment({
      amount: Number(order.totalAmount),
      description: `سفارش ${order.orderNumber} - درنیکا ساحل`,
      callbackUrl: opts.callbackUrl,
      mobile: opts.mobile,
      email: opts.email,
    });
    // Persist the authority so the verify step can look up the order.
    await db
      .update(orders)
      .set({ paymentRef: created.authority })
      .where(eq(orders.id, opts.orderId));
    return {
      ok: true,
      gatewayUrl: created.gatewayUrl,
      authority: created.authority,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface VerifyPaymentResult {
  ok: boolean;
  orderId?: string;
  orderNumber?: string;
  refId?: string;
  error?: string;
}

export async function verifyPayment(opts: {
  authority: string;
  amount?: number;
}): Promise<VerifyPaymentResult> {
  // Find order by paymentRef (authority)
  const orderRows = (await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.paymentRef, opts.authority))
    .limit(1)) as Array<{
    id: string;
    orderNumber: string;
    totalAmount: string;
    status: string;
  }>;
  const order = orderRows[0];
  if (!order) return { ok: false, error: "order not found for authority" };

  const gateway = getGateway();
  const verify = await gateway.verifyPayment({
    amount: opts.amount ?? Number(order.totalAmount),
    authority: opts.authority,
  });

  if (verify.status !== "ok") {
    await db
      .update(orders)
      .set({ status: "cancelled" })
      .where(eq(orders.id, order.id));
    return { ok: false, error: "payment verification failed" };
  }

  await db
    .update(orders)
    .set({ status: "confirmed", paymentRef: verify.refId })
    .where(eq(orders.id, order.id));

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    refId: verify.refId,
  };
}

/* ------------------------------------------------------------------ */
/* Order lookup helpers (used by profile page)                         */
/* ------------------------------------------------------------------ */

export async function listOrdersForUser(userId: string): Promise<
  Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: string;
    paymentMethod: string | null;
    paymentRef: string | null;
    createdAt: Date;
  }>
> {
  const rows = (await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      paymentMethod: orders.paymentMethod,
      paymentRef: orders.paymentRef,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(sql`${orders.createdAt} DESC`)) as Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: string;
    paymentMethod: string | null;
    paymentRef: string | null;
    createdAt: Date;
  }>;
  return rows;
}

export async function listOrderItems(orderId: string): Promise<
  Array<{
    id: string;
    productTitle: string;
    variantTitle: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>
> {
  const rows = (await db
    .select({
      id: orderItems.id,
      productTitle: orderItems.productTitle,
      variantTitle: orderItems.variantTitle,
      sku: orderItems.sku,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))) as Array<{
    id: string;
    productTitle: string;
    variantTitle: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>;
  return rows;
}

export async function getUserById(userId: string) {
  const rows = (await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)) as Array<(typeof users.$inferSelect)>;
  return rows[0] ?? null;
}
