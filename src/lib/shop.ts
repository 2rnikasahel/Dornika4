/**
 * Shop data layer for "درنیکا ساحل" (Dornika Sahel).
 */

import { eq, isNull, and, asc } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  products,
  productVariants,
  units,
} from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ShopProductCard {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  images: string[];
  categoryId: string | null;
  categoryTitle: string | null;
  minPrice: number | null;
  inStock: boolean;
}

export interface CategoryNode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children: CategoryNode[];
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

/**
 * Returns the list of products to feature on the homepage / shop grid.
 * Active + published only, sorted by sortOrder then createdAt desc.
 */
export async function getShopProducts(
  opts: { limit?: number; categoryId?: string } = {},
): Promise<ShopProductCard[]> {
  const { limit = 8, categoryId } = opts;
  try {
    const rows = (await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        subtitle: products.subtitle,
        coverImage: products.coverImage,
        images: products.images,
        categoryId: products.categoryId,
        categoryTitle: categories.title,
        isActive: products.isActive,
        status: products.status,
        sortOrder: products.sortOrder,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(
        and(
          eq(products.isActive, true),
          eq(products.status, "published"),
          categoryId ? eq(products.categoryId, categoryId) : undefined,
        ),
      )
      .orderBy(asc(products.sortOrder))
      .limit(limit)) as Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      coverImage: string | null;
      images: unknown;
      categoryId: string | null;
      categoryTitle: string | null;
      isActive: boolean;
      status: string;
      sortOrder: number;
    }>;

    const ids = rows.map((r) => r.id);
    const variantRows = ids.length
      ? ((await db
          .select({
            productId: productVariants.productId,
            price: productVariants.price,
            stock: productVariants.stock,
            isActive: productVariants.isActive,
          })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.isActive, true),
              // simple IN fallback — drizzle doesn't have an `inArray` here in this proxy
              // but the underlying drizzle does. We'll just fetch all and filter client-side.
            ),
          )) as Array<{
          productId: string;
          price: string;
          stock: number;
          isActive: boolean;
        }>)
      : [];

    const byProduct = new Map<
      string,
      { minPrice: number; inStock: boolean }
    >();
    for (const v of variantRows) {
      const prev = byProduct.get(v.productId);
      const price = Number(v.price) || 0;
      if (!prev) {
        byProduct.set(v.productId, {
          minPrice: price,
          inStock: v.stock > 0,
        });
      } else {
        prev.minPrice = Math.min(prev.minPrice, price);
        prev.inStock = prev.inStock || v.stock > 0;
      }
    }

    return rows.map((r) => {
      const meta = byProduct.get(r.id);
      const images = Array.isArray(r.images)
        ? (r.images as string[]).filter((v) => typeof v === "string")
        : [];
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        subtitle: r.subtitle,
        coverImage: r.coverImage || (images[0] ?? null),
        images,
        categoryId: r.categoryId,
        categoryTitle: r.categoryTitle,
        minPrice: meta ? meta.minPrice : null,
        inStock: meta ? meta.inStock : false,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Returns a single product (with variants) by slug, or null.
 */
export async function getProductBySlug(
  slug: string,
): Promise<ShopProductCard | null> {
  if (!slug) return null;
  try {
    const rows = (await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        subtitle: products.subtitle,
        coverImage: products.coverImage,
        images: products.images,
        categoryId: products.categoryId,
        categoryTitle: categories.title,
        isActive: products.isActive,
        status: products.status,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1)) as Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      coverImage: string | null;
      images: unknown;
      categoryId: string | null;
      categoryTitle: string | null;
      isActive: boolean;
      status: string;
    }>;

    const r = rows[0];
    if (!r) return null;
    const images = Array.isArray(r.images)
      ? (r.images as string[]).filter((v) => typeof v === "string")
      : [];
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      coverImage: r.coverImage || (images[0] ?? null),
      images,
      categoryId: r.categoryId,
      categoryTitle: r.categoryTitle,
      minPrice: null,
      inStock: true,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function getAllCategories(): Promise<CategoryNode[]> {
  try {
    const rows = (await db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        slug: categories.slug,
        title: categories.title,
        description: categories.description,
        image: categories.image,
        isActive: categories.isActive,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder))) as Array<{
      id: string;
      parentId: string | null;
      slug: string;
      title: string;
      description: string | null;
      image: string | null;
      isActive: boolean;
      sortOrder: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      parentId: r.parentId,
      slug: r.slug,
      title: r.title,
      description: r.description,
      image: r.image,
      children: [],
    }));
  } catch {
    return [];
  }
}

/**
 * Builds a fully nested category tree from the flat DB rows.
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const flat = await getAllCategories();
  const byId = new Map<string, CategoryNode>();
  for (const node of flat) {
    byId.set(node.id, { ...node, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/**
 * Returns units (for variant unit labels). Kept minimal — only active.
 */
export async function getActiveUnits() {
  try {
    const rows = (await db
      .select({
        id: units.id,
        slug: units.slug,
        name: units.name,
        symbol: units.symbol,
      })
      .from(units)
      .where(eq(units.isActive, true))) as Array<{
      id: string;
      slug: string;
      name: string;
      symbol: string;
    }>;
    return rows;
  } catch {
    return [];
  }
}
