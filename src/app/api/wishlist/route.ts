import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wishlistItems, products, productVariants, categories } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "dornika_wishlist";

async function getToken() {
  const store = await cookies();
  let token = store.get(COOKIE)?.value;
  if (!token) token = crypto.randomBytes(16).toString("hex");
  return token;
}

export async function GET() {
  const token = await getToken();
  const items = await db.select({
    id: products.id, title: products.title, slug: products.slug, coverImage: products.coverImage,
    minPrice: sql<string>`min(${productVariants.price})::text`,
    categoryTitle: categories.title,
  }).from(wishlistItems).innerJoin(products, eq(wishlistItems.productId, products.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(wishlistItems.sessionToken, token))
    .groupBy(products.id, categories.title);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    const body = await req.json();
    const productId = Number(body?.productId);
    if (!productId) return NextResponse.json({ ok: false, error: "productId الزامی است." }, { status: 400 });
    const [existing] = await db.select().from(wishlistItems).where(and(eq(wishlistItems.sessionToken, token), eq(wishlistItems.productId, productId))).limit(1);
    if (existing) { await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id)); return NextResponse.json({ ok: true, action: "removed" }); }
    await db.insert(wishlistItems).values({ sessionToken: token, productId });
    const res = NextResponse.json({ ok: true, action: "added" });
    res.cookies.set(COOKIE, token, { path: "/", maxAge: 86400 * 30, httpOnly: true, sameSite: "lax" });
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
