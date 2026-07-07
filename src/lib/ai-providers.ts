/**
 * AI provider management for "درنیکا ساحل" (Dornika Sahel).
 *
 * Providers are stored in the `ai_providers` table. Each provider has
 * a `type` (openai / anthropic / gemini / zai / ollama / custom), an
 * optional API key, endpoint, model name, and a JSON `config` blob.
 *
 * Features (chat, vision, price-update, pdf-import, ...) are mapped
 * to a single provider via the `ai_feature_providers` table — exactly
 * one provider per feature.
 */

import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { aiProviders, aiFeatureProviders } from "@/db/schema";

export type AiProviderType =
  | "openai"
  | "anthropic"
  | "gemini"
  | "zai"
  | "ollama"
  | "custom";

export interface AiProviderRow {
  id: number;
  slug: string;
  name: string;
  type: AiProviderType;
  apiKey: string | null;
  apiEndpoint: string | null;
  modelName: string | null;
  isActive: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
}

export interface AiProviderInput {
  slug: string;
  name: string;
  type: AiProviderType;
  apiKey?: string | null;
  apiEndpoint?: string | null;
  modelName?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  config?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export async function listAiProviders(): Promise<AiProviderRow[]> {
  const rows = (await db
    .select()
    .from(aiProviders)
    .orderBy(aiProviders.createdAt)) as AiProviderRow[];
  return rows;
}

/**
 * Alias for `listAiProviders()` — preferred name for new callers.
 * Returns every AI provider row regardless of `isActive` status.
 */
export async function getAllProviders(): Promise<AiProviderRow[]> {
  return listAiProviders();
}

export async function getAiProviderBySlug(
  slug: string,
): Promise<AiProviderRow | null> {
  const rows = (await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.slug, slug))
    .limit(1)) as AiProviderRow[];
  return rows[0] ?? null;
}

export async function createAiProvider(
  input: AiProviderInput,
): Promise<AiProviderRow> {
  const id = `aip_${input.slug}_${Date.now()}`;
  const rows = (await db
    .insert(aiProviders)
    .values({
      slug: input.slug,
      name: input.name,
      type: input.type,
      apiKey: input.apiKey ?? null,
      apiEndpoint: input.apiEndpoint ?? null,
      modelName: input.modelName ?? null,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
      config: (input.config ?? {}) as Record<string, unknown>,
    })
    .returning()) as AiProviderRow[];
  return rows[0];
}

export async function updateAiProvider(
  id: string,
  patch: Partial<AiProviderInput>,
): Promise<AiProviderRow | null> {
  const rows = (await db
    .update(aiProviders)
    .set({
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.apiKey !== undefined ? { apiKey: patch.apiKey } : {}),
      ...(patch.apiEndpoint !== undefined
        ? { apiEndpoint: patch.apiEndpoint }
        : {}),
      ...(patch.modelName !== undefined ? { modelName: patch.modelName } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
      ...(patch.config !== undefined
        ? { config: patch.config as Record<string, unknown> }
        : {}),
    })
    .where(eq(aiProviders.id, id))
    .returning()) as AiProviderRow[];
  return rows[0] ?? null;
}

export async function deleteAiProvider(id: string): Promise<void> {
  await db.delete(aiProviders).where(eq(aiProviders.id, id));
}

/* ------------------------------------------------------------------ */
/* Feature → provider mapping                                          */
/* ------------------------------------------------------------------ */

export async function getProviderForFeature(
  feature: string,
): Promise<AiProviderRow | null> {
  const rows = (await db
    .select({
      id: aiProviders.id,
      slug: aiProviders.slug,
      name: aiProviders.name,
      type: aiProviders.type,
      apiKey: aiProviders.apiKey,
      apiEndpoint: aiProviders.apiEndpoint,
      modelName: aiProviders.modelName,
      isActive: aiProviders.isActive,
      isDefault: aiProviders.isDefault,
      config: aiProviders.config,
      createdAt: aiProviders.createdAt,
    })
    .from(aiFeatureProviders)
    .innerJoin(
      aiProviders,
      eq(aiProviders.id, aiFeatureProviders.providerId),
    )
    .where(
      and(
        eq(aiFeatureProviders.feature, feature),
        eq(aiProviders.isActive, true),
      ),
    )
    .limit(1)) as AiProviderRow[];

  if (rows.length > 0) return rows[0];

  // Fallback: the default provider.
  const defaults = (await db
    .select()
    .from(aiProviders)
    .where(
      and(eq(aiProviders.isDefault, true), eq(aiProviders.isActive, true)),
    )
    .limit(1)) as AiProviderRow[];
  return defaults[0] ?? null;
}

export async function setProviderForFeature(
  feature: string,
  providerId: number,
): Promise<void> {
  // Delete any existing mapping for this feature, then insert the new one.
  await db.delete(aiFeatureProviders).where(eq(aiFeatureProviders.feature, feature));
  await db.insert(aiFeatureProviders).values({
    
    feature,
    providerId,
  });
}

export async function listFeatureMappings(): Promise<
  Array<{ feature: string; providerId: number }>
> {
  const rows = (await db
    .select({
      feature: aiFeatureProviders.feature,
      providerId: aiFeatureProviders.providerId,
    })
    .from(aiFeatureProviders)) as Array<{
    feature: string;
    providerId: number;
  }>;
  return rows;
}

/* ------------------------------------------------------------------ */
/* Built-in feature list + labels                                      */
/* ------------------------------------------------------------------ */

export const AI_FEATURES = [
  { slug: "chat", label: "دستیار چت", description: "پاسخ به پیام‌های مشتری" },
  { slug: "vision", label: "تحلیل تصویر", description: "تشخیص محصول از عکس" },
  {
    slug: "price-update",
    label: "به‌روزرسانی قیمت",
    description: "پارس فایل اکسل قیمت‌ها",
  },
  {
    slug: "pdf-import",
    label: "ایمپورت PDF",
    description: "استخراج محصول از کاتالوگ PDF",
  },
] as const;

/**
 * Map of feature slug → localized label. Useful for admin tables that
 * need to render a row per feature without iterating `AI_FEATURES`.
 */
export const featureLabels: Record<string, string> = AI_FEATURES.reduce(
  (acc, f) => {
    acc[f.slug] = f.label;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Default provider slug used for each feature when no explicit
 * feature→provider mapping exists in the DB. Used as a hint by the
 * admin UI and as the ultimate fallback in `getProviderForFeature`.
 *
 * `null` means "no built-in default — fall back to the row marked
 * `isDefault=true` in the DB".
 */
export const defaultProviders: Record<string, string | null> = {
  chat: "zai",
  vision: "zai",
  "price-update": "zai",
  "pdf-import": "zai",
};
