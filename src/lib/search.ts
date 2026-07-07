/**
 * Server-side product search helpers — shared by `/api/search` and
 * the `/shop` page so both stay in sync.
 */

import { eq, and, or, ilike, asc, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  products,
  productVariants,
  categories,
} from "@/db/schema";
import type { ShopProductCard } from "./shop";

export interface SearchParams {
  q?: string;
  category?: string; // slug
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: "newest" | "popular" | "price-asc" | "price-desc";
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: ShopProductCard[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchProducts(
  params: SearchParams = {},
): Promise<SearchResult> {
  const {
    q = "",
    category: categorySlug = "",
    minPrice = null,
    maxPrice = null,
    sort = "newest",
    page = 1,
    pageSize = 12,
  } = params;

  // Resolve category slug → id
  let categoryId: string | null = null;
  if (categorySlug) {
    const catRows = (await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1)) as Array<{ id: string }>;
    categoryId = catRows[0]?.id ?? null;
    if (!categoryId) {
      return { items: [], total: 0, page, pageSize };
    }
  }

  const conditions = [
    eq(products.isActive, true),
    eq(products.status, "published"),
    categoryId ? eq(products.categoryId, categoryId) : undefined,
    q
      ? or(
          ilike(products.title, `%${q}%`),
          ilike(products.subtitle, `%${q}%`),
          ilike(products.description, `%${q}%`),
        )
      : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  const rows = (await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      subtitle: products.subtitle,
      description: products.description,
      coverImage: products.coverImage,
      images: products.images,
      categoryId: products.categoryId,
      categoryTitle: categories.title,
      categorySlug: categories.slug,
      createdAt: products.createdAt,
      sortOrder: products.sortOrder,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(
      sort === "popular"
        ? asc(products.sortOrder)
        : asc(products.createdAt),
    )
    .limit(pageSize)) as Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    coverImage: string | null;
    images: unknown;
    categoryId: string | null;
    categoryTitle: string | null;
    categorySlug: string | null;
    createdAt: Date;
    sortOrder: number;
  }>;

  // Hydrate min price + stock status.
  const ids = rows.map((r) => r.id);
  const variantRows = ids.length
    ? ((await db
        .select({
          productId: productVariants.productId,
          id: productVariants.id,
          price: productVariants.price,
          stock: productVariants.stock,
        })
        .from(productVariants)
        .where(eq(productVariants.isActive, true))) as Array<{
        productId: string;
        id: string;
        price: string;
        stock: number;
      }>)
    : [];

  const byProduct = new Map<
    string,
    {
      minPrice: number;
      inStock: boolean;
      firstVariantId: string | null;
      variantCount: number;
    }
  >();
  for (const v of variantRows) {
    if (!ids.includes(v.productId)) continue;
    const price = Number(v.price) || 0;
    const prev = byProduct.get(v.productId);
    if (!prev) {
      byProduct.set(v.productId, {
        minPrice: price,
        inStock: v.stock > 0,
        firstVariantId: v.id,
        variantCount: 1,
      });
    } else {
      prev.minPrice = Math.min(prev.minPrice, price);
      prev.inStock = prev.inStock || v.stock > 0;
      prev.variantCount += 1;
    }
  }

  let items: ShopProductCard[] = rows.map((r) => {
    const meta = byProduct.get(r.id);
    const images = Array.isArray(r.images)
      ? (r.images as string[]).filter((v) => typeof v === "string")
      : [];
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      description: r.description,
      coverImage: r.coverImage || (images[0] ?? null),
      images,
      categoryId: r.categoryId,
      categoryTitle: r.categoryTitle,
      categorySlug: r.categorySlug,
      minPrice: meta ? meta.minPrice : null,
      inStock: meta ? meta.inStock : false,
      firstVariantId: meta ? meta.firstVariantId : null,
      variantCount: meta ? meta.variantCount : 0,
      variants: [],
    };
  });

  // Price filter
  if (minPrice != null || maxPrice != null) {
    items = items.filter((it) => {
      if (it.minPrice == null) return false;
      if (minPrice != null && it.minPrice < minPrice) return false;
      if (maxPrice != null && it.minPrice > maxPrice) return false;
      return true;
    });
  }

  if (sort === "price-asc") {
    items.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
  } else if (sort === "price-desc") {
    items.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
  }

  // Total count (without price filter — approximate).
  const countRows = (await db
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...conditions))) as Array<{ c: number }>;
  const total = countRows[0]?.c ?? items.length;

  return { items, total, page, pageSize };
}
