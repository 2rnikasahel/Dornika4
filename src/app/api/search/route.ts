import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productVariants, categories } from "@/db/schema";
import { eq, and, ilike, or, sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const cat = req.nextUrl.searchParams.get("cat") || "";
  const whereClauses = [eq(products.isActive, true)];
  if (q.trim()) {
    whereClauses.push(or(ilike(products.title, `%${q}%`), ilike(products.subtitle, `%${q}%`))!);
  }
  if (cat) {
    whereClauses.push(sql`${categories.slug} = ${cat}`);
  }
  const data = await db.select({
    id: products.id, slug: products.slug, title: products.title,
    categoryTitle: categories.title,
    minPrice: sql<string>`min(${productVariants.price})::text`,
  }).from(products).leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(...whereClauses)).groupBy(products.id).limit(20);
  return NextResponse.json(data);
}
