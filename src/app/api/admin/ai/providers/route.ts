import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import {
  listAiProviders,
  createAiProvider,
  updateAiProvider,
  deleteAiProvider,
  setProviderForFeature,
  listFeatureMappings,
  AI_FEATURES,
  type AiProviderType,
  type AiProviderInput,
} from "@/lib/ai-providers";
import { requireAdmin } from "@/lib/auth";
import { adminGuard } from "@/lib/admin-guard";

export const runtime = "nodejs";

/**
 * GET /api/admin/ai/providers
 *
 * Returns the list of AI providers and the current feature → provider
 * mappings.
 */
export async function GET() {
  return adminGuard(async () => {
    await requireAdmin();
    const items = await listAiProviders();
    const mappings = await listFeatureMappings();
    return NextResponse.json({ items, mappings, features: AI_FEATURES });
  }) as Promise<Response>;
}

interface PostBody {
  action?: "create" | "update" | "delete" | "set-feature";
  // create / update
  provider?: Partial<AiProviderInput> & { id?: string };
  // set-feature
  feature?: string;
  providerId?: string;
}

/**
 * POST /api/admin/ai/providers
 *
 * Manages AI providers + feature mappings. Body shape:
 *
 *   { action: "create",  provider: { slug, name, type, ... } }
 *   { action: "update",  provider: { id, ...patch } }
 *   { action: "delete",  provider: { id } }
 *   { action: "set-feature", feature: "chat", providerId: "aip_xxx" }
 */
export async function POST(req: Request) {
  return adminGuard(async () => {
    await requireAdmin();

    let body: PostBody = {};
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const action = body.action || "create";

    if (action === "create") {
      const p = body.provider;
      if (!p?.slug || !p?.name || !p?.type) {
        return NextResponse.json(
          { error: "slug, name, type required" },
          { status: 400 },
        );
      }
      const created = await createAiProvider({
        slug: p.slug,
        name: p.name,
        type: p.type as AiProviderType,
        apiKey: p.apiKey ?? null,
        apiEndpoint: p.apiEndpoint ?? null,
        modelName: p.modelName ?? null,
        isActive: p.isActive ?? true,
        isDefault: p.isDefault ?? false,
        config: p.config ?? {},
      });
      return NextResponse.json({ ok: true, item: created });
    }

    if (action === "update") {
      const p = body.provider;
      if (!p?.id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }
      const updated = await updateAiProvider(p.id, p);
      return NextResponse.json({ ok: true, item: updated });
    }

    if (action === "delete") {
      const p = body.provider;
      if (!p?.id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }
      await deleteAiProvider(p.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "set-feature") {
      if (!body.feature || !body.providerId) {
        return NextResponse.json(
          { error: "feature and providerId required" },
          { status: 400 },
        );
      }
      await setProviderForFeature(body.feature, body.providerId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }) as Promise<Response>;
}

void eq;
