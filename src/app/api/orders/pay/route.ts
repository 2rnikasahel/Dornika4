import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد شوید." }, { status: 401 });
    const body = await req.json();
    const orderId = Number(body?.orderId);
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId الزامی است." }, { status: 400 });
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.userId !== user.id) return NextResponse.json({ ok: false, error: "سفارش یافت نشد." }, { status: 404 });
    // Sandbox: always succeed
    const ref = `sandbox-ref-${Date.now()}`;
    await db.update(orders).set({ status: "paid", paymentRef: ref }).where(eq(orders.id, orderId));
    return NextResponse.json({ ok: true, ref });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
