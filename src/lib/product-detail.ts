/**
 * Product-detail data layer for "درنیکا ساحل" (Dornika Sahel).
 *
 * Returns the product row + its variants + spec sheet + related
 * products — everything the `/shop/[slug]` page needs in one call.
 */

import { eq, and, asc, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  products,
  productVariants,
  categories,
  units,
} from "@/db/schema";

export interface ProductDetailVariant {
  id: string;
  sku: string | null;
  name: string;
  nameEn: string | null;
  price: string;
  unitValue: string | null;
  stock: number;
  specSheet: Record<string, unknown> | null;
  unitId: string | null;
  unitName: string | null;
  unitSymbol: string | null;
  isActive: boolean;
}

export interface ProductDetail {
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
  metaTitle: string | null;
  metaDesc: string | null;
  variants: ProductDetailVariant[];
}

export interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  minPrice: number | null;
}

export async function getProductDetail(
  slug: string,
): Promise<ProductDetail | null> {
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
        metaTitle: products.metaTitle,
        metaDesc: products.metaDesc,
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
      description: string | null;
      coverImage: string | null;
      images: unknown;
      categoryId: string | null;
      categoryTitle: string | null;
      categorySlug: string | null;
      metaTitle: string | null;
      metaDesc: string | null;
      isActive: boolean;
      status: string;
    }>;

    const p = rows[0];
    if (!p) return null;

    const images = Array.isArray(p.images)
      ? (p.images as string[]).filter((v) => typeof v === "string")
      : [];

    // Fetch variants.
    const variantRows = (await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        nameEn: productVariants.nameEn,
        price: productVariants.price,
        unitValue: productVariants.unitValue,
        stock: productVariants.stock,
        specSheet: productVariants.specSheet,
        unitId: productVariants.unitId,
        unitName: units.name,
        unitSymbol: units.symbol,
        isActive: productVariants.isActive,
        sortOrder: productVariants.sortOrder,
      })
      .from(productVariants)
      .leftJoin(units, eq(units.id, productVariants.unitId))
      .where(eq(productVariants.productId, p.id))
      .orderBy(asc(productVariants.sortOrder))) as Array<{
      id: string;
      sku: string | null;
      name: string;
      nameEn: string | null;
      price: string;
      unitValue: string | null;
      stock: number;
      specSheet: Record<string, unknown> | null;
      unitId: string | null;
      unitName: string | null;
      unitSymbol: string | null;
      isActive: boolean;
      sortOrder: number;
    }>;

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      coverImage: p.coverImage || (images[0] ?? null),
      images,
      categoryId: p.categoryId,
      categoryTitle: p.categoryTitle,
      categorySlug: p.categorySlug,
      metaTitle: p.metaTitle,
      metaDesc: p.metaDesc,
      variants: variantRows.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        nameEn: v.nameEn,
        price: v.price,
        unitValue: v.unitValue,
        stock: v.stock,
        specSheet: v.specSheet,
        unitId: v.unitId,
        unitName: v.unitName,
        unitSymbol: v.unitSymbol,
        isActive: v.isActive,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Returns up to `limit` related products (same category, excluding
 * the current product). Falls back to "any product" when the product
 * has no category.
 */
export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<RelatedProduct[]> {
  try {
    const rows = (await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        subtitle: products.subtitle,
        coverImage: products.coverImage,
        categoryId: products.categoryId,
      })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.status, "active"),
          ne(products.id, productId),
          categoryId ? eq(products.categoryId, categoryId) : undefined,
        ),
      )
      .limit(limit)) as Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      coverImage: string | null;
      categoryId: string | null;
    }>;

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      coverImage: r.coverImage,
      minPrice: null,
    }));
  } catch {
    return [];
  }
}
