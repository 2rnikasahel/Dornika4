/**
 * Shop data layer for "درنیکا ساحل" (Dornika Sahel).
 *
 * Exposes:
 *   • `ShopProduct` type — a flattened product card with aggregates
 *     (minPrice, inStock, firstVariantId, variantCount) plus an optional
 *     `variants` array populated only by `getProductBySlug`.
 *   • `getShopProducts(filters)` — list view, supports filtering by
 *     `categorySlug` (resolved to id) and a free-text `search` term.
 *   • `getProductBySlug(slug)` — single-product view, returns the full
 *     `variants` array joined with units.
 *   • `getAllCategories()` — flat list of active categories enriched
 *     with `productCount`.
 *   • `getCategoryTree()` — the same categories as a parent/child tree.
 *   • `getActiveUnits()` — minimal list of active measurement units.
 */

import {
  eq,
  and,
  or,
  ilike,
  asc,
  desc,
  count,
  type SQL,
} from "drizzle-orm";

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

/** A single product-variant row (SKU-level), as returned by the detail page. */
export interface ShopProductVariant {
  id: string;
  sku: string | null;
  name: string;
  nameEn: string | null;
  /** Decimal price as a string (matches the DB column type). */
  price: string;
  unitValue: string | null;
  unitId: string | null;
  /** Display label for the variant's unit (e.g. "کیلوگرم"). */
  unitLabel: string | null;
  stock: number;
  specSheet: Record<string, unknown> | null;
  isActive: boolean;
  sortOrder: number;
}

/**
 * A flattened product card used by both the list view and the detail
 * page. The `variants` array is empty in the list view and populated
 * only by `getProductBySlug`.
 */
export interface ShopProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverImage: string | null;
  images: string[];
  categoryId: string | null;
  categoryTitle: string | null;
  categorySlug: string | null;
  /** Lowest active-variant price, or null when no variants exist. */
  minPrice: number | null;
  /** True when at least one variant has stock > 0. */
  inStock: boolean;
  /**
   * The first active variant's id — convenient for "quick add to cart"
   * UIs that need a default variant. Null when the product has no
   * active variants.
   */
  firstVariantId: string | null;
  /** Number of active variants for this product. */
  variantCount: number;
  /**
   * Full variants list — populated by `getProductBySlug`, empty for
   * list views.
   */
  variants: ShopProductVariant[];
}

/** Backwards-compat alias — older callers may import this name. */
export type ShopProductCard = ShopProduct;

/** A category node, with optional children for tree rendering. */
export interface CategoryNode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  /** Number of published products in this category. */
  productCount: number;
  children: CategoryNode[];
}

/* ------------------------------------------------------------------ */
/* Variant aggregation helper                                          */
/* ------------------------------------------------------------------ */

interface VariantAgg {
  minPrice: number;
  inStock: boolean;
  firstVariantId: string | null;
  variantCount: number;
}

/**
 * Build a Map of productId → aggregate (min price, in-stock status,
 * first variant id, variant count) for the given product ids.
 *
 * Variants are ordered by `sortOrder` so `firstVariantId` is the
 * "default" variant a quick-add UI would pick.
 */
async function getVariantAggregates(
  productIds: string[],
): Promise<Map<string, VariantAgg>> {
  const agg = new Map<string, VariantAgg>();
  if (productIds.length === 0) return agg;
  try {
    const rows = (await db
      .select({
        productId: productVariants.productId,
        id: productVariants.id,
        price: productVariants.price,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .where(eq(productVariants.isActive, true))
      .orderBy(asc(productVariants.sortOrder))) as Array<{
      productId: string;
      id: string;
      price: string;
      stock: number;
    }>;

    for (const v of rows) {
      // Only include variants for the products we asked about. The DB
      // query above returns *all* active variants (the lazy-proxy can't
      // build an `inArray` clause reliably), so we filter client-side.
      if (!productIds.includes(v.productId)) continue;
      const price = Number(v.price) || 0;
      const prev = agg.get(v.productId);
      if (!prev) {
        agg.set(v.productId, {
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
  } catch {
    /* empty — aggregates map stays empty */
  }
  return agg;
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export interface ShopProductFilters {
  /** Filter by category slug (resolved to category id internally). */
  categorySlug?: string | null;
  /** Filter by category id directly (takes precedence over categorySlug). */
  categoryId?: string | null;
  /** Free-text search across title / subtitle / description (ILIKE). */
  search?: string | null;
  /** Row limit (default 1000). */
  limit?: number;
}

/**
 * Returns the list of active, published products matching the given
 * filters. Sorted by `sortOrder` asc then `createdAt` desc.
 *
 * The returned cards have an empty `variants` array — use
 * `getProductBySlug` for the full detail view.
 */
export async function getShopProducts(
  filters: ShopProductFilters = {},
): Promise<ShopProduct[]> {
  const { categorySlug, search, categoryId, limit } = filters;
  try {
    // Resolve categorySlug → categoryId if no explicit categoryId was passed.
    let resolvedCategoryId = categoryId ?? null;
    if (!resolvedCategoryId && categorySlug) {
      const catRows = (await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1)) as Array<{ id: string }>;
      resolvedCategoryId = catRows[0]?.id ?? null;
      if (!resolvedCategoryId) return [];
    }

    const conditions: SQL[] = [
      eq(products.isActive, true),
      eq(products.status, "published"),
      resolvedCategoryId ? eq(products.categoryId, resolvedCategoryId) : null,
      search
        ? or(
            ilike(products.title, `%${search}%`),
            ilike(products.subtitle, `%${search}%`),
            ilike(products.description, `%${search}%`),
          )
        : null,
    ].filter((c): c is SQL => c !== null && c !== undefined);

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
        sortOrder: products.sortOrder,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(...conditions))
      .orderBy(asc(products.sortOrder), desc(products.createdAt))
      .limit(limit ?? 1000)) as Array<{
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
      sortOrder: number;
      createdAt: Date;
    }>;

    const ids = rows.map((r) => r.id);
    const agg = await getVariantAggregates(ids);

    return rows.map((r) => {
      const a = agg.get(r.id);
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
        minPrice: a ? a.minPrice : null,
        inStock: a ? a.inStock : false,
        firstVariantId: a ? a.firstVariantId : null,
        variantCount: a ? a.variantCount : 0,
        variants: [],
      };
    });
  } catch {
    return [];
  }
}

/**
 * Returns a single product (with its full variants array) by slug,
 * or `null` when the slug doesn't match an active product.
 */
export async function getProductBySlug(
  slug: string,
): Promise<ShopProduct | null> {
  if (!slug) return null;
  try {
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
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1)) as Array<{
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
    }>;

    const r = rows[0];
    if (!r) return null;

    const images = Array.isArray(r.images)
      ? (r.images as string[]).filter((v) => typeof v === "string")
      : [];

    // Load variants joined with their unit (for the unit label).
    const variantRows = (await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        nameEn: productVariants.nameEn,
        price: productVariants.price,
        unitValue: productVariants.unitValue,
        unitId: productVariants.unitId,
        unitName: units.name,
        unitSymbol: units.symbol,
        stock: productVariants.stock,
        specSheet: productVariants.specSheet,
        isActive: productVariants.isActive,
        sortOrder: productVariants.sortOrder,
      })
      .from(productVariants)
      .leftJoin(units, eq(units.id, productVariants.unitId))
      .where(
        and(
          eq(productVariants.productId, r.id),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(asc(productVariants.sortOrder))) as Array<{
      id: string;
      sku: string | null;
      name: string;
      nameEn: string | null;
      price: string;
      unitValue: string | null;
      unitId: string | null;
      unitName: string | null;
      unitSymbol: string | null;
      stock: number;
      specSheet: unknown;
      isActive: boolean;
      sortOrder: number;
    }>;

    const variants: ShopProductVariant[] = variantRows.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      nameEn: v.nameEn,
      price: v.price,
      unitValue: v.unitValue,
      unitId: v.unitId,
      unitLabel: v.unitName ?? null,
      stock: v.stock,
      specSheet:
        (v.specSheet ?? null) as Record<string, unknown> | null,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
    }));

    const prices = variants.map((v) => Number(v.price) || 0);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const inStock = variants.some((v) => v.stock > 0);

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
      minPrice,
      inStock,
      firstVariantId: variants[0]?.id ?? null,
      variantCount: variants.length,
      variants,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

interface CategoryRow {
  id: string;
  parentId: string | null;
  slug: string;
  title: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Returns a flat list of active categories enriched with `productCount`
 * (the number of published products directly assigned to each category).
 * Sorted by `sortOrder` asc.
 */
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
      .orderBy(asc(categories.sortOrder))) as CategoryRow[];

    // Count published products per category in a single grouped query.
    const countRows = (await db
      .select({
        categoryId: products.categoryId,
        c: count(),
      })
      .from(products)
      .where(and(eq(products.isActive, true), eq(products.status, "published")))
      .groupBy(products.categoryId)) as Array<{
      categoryId: string | null;
      c: number;
    }>;

    const countMap = new Map<string, number>();
    for (const r of countRows) {
      if (r.categoryId) countMap.set(r.categoryId, Number(r.c) || 0);
    }

    return rows.map((r) => ({
      id: r.id,
      parentId: r.parentId,
      slug: r.slug,
      title: r.title,
      description: r.description,
      image: r.image,
      productCount: countMap.get(r.id) ?? 0,
      children: [],
    }));
  } catch {
    return [];
  }
}

/**
 * Builds a fully nested category tree from the flat DB rows.
 * Each node's `children` array is populated by walking the `parentId`
 * references; nodes whose `parentId` is null or points to a missing
 * category become roots.
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
