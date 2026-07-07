import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq, and, asc, count } from "drizzle-orm";

export async function GET() {
  const errors: string[] = [];
  
  // Test 1: Simple select
  try {
    const r1 = await db.select().from(categories).where(eq(categories.isActive, true));
    errors.push(`Test1 (simple): ${r1.length} categories`);
  } catch (err) {
    errors.push(`Test1 FAIL: ${err instanceof Error ? err.message.substring(0, 100) : err}`);
  }

  // Test 2: Select with object arg
  try {
    const r2 = await db.select({ id: categories.id, title: categories.title }).from(categories).where(eq(categories.isActive, true));
    errors.push(`Test2 (object select): ${r2.length} categories`);
  } catch (err) {
    errors.push(`Test2 FAIL: ${err instanceof Error ? err.message.substring(0, 100) : err}`);
  }

  // Test 3: Select with orderBy
  try {
    const r3 = await db.select({ id: categories.id }).from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
    errors.push(`Test3 (orderBy): ${r3.length} categories`);
  } catch (err) {
    errors.push(`Test3 FAIL: ${err instanceof Error ? err.message.substring(0, 100) : err}`);
  }

  // Test 4: Products query with and()
  try {
    const r4 = await db.select({ categoryId: products.categoryId, c: count() }).from(products).where(and(eq(products.isActive, true), eq(products.status, "active"))).groupBy(products.categoryId);
    errors.push(`Test4 (products count): ${r4.length} rows`);
  } catch (err) {
    errors.push(`Test4 FAIL: ${err instanceof Error ? err.message.substring(0, 100) : err}`);
  }

  return NextResponse.json({ results: errors });
}
