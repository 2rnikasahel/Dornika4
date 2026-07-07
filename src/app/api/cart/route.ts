import { NextResponse } from "next/server";

import {
  getCart,
  removeItem,
  ensureSessionToken,
} from "@/lib/cart-actions";

export const runtime = "nodejs";

/**
 * GET /api/cart
 *
 * Returns the full cart contents for the calling session.
 */
export async function GET() {
  const { token } = await ensureSessionToken();
  const data = await getCart(token);
  return NextResponse.json(data);
}

/**
 * DELETE /api/cart?itemId=<id>
 *
 * Removes a single cart item. If `itemId` is omitted, the cart is
 * cleared.
 */
export async function DELETE(req: Request) {
  const { token } = await ensureSessionToken();
  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) {
    // Clear all items.
    const { clearCart } = await import("@/lib/cart-actions");
    const data = await clearCart(token);
    return NextResponse.json(data);
  }
  const data = await removeItem(token, itemId);
  return NextResponse.json(data);
}
