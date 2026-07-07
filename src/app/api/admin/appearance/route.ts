import { NextResponse } from "next/server";

import {
  PALETTES,
  getActivePalette,
  setActivePalette,
} from "@/lib/color-palettes";
import { requireAdmin } from "@/lib/auth";
import { adminGuard } from "@/lib/admin-guard";

export const runtime = "nodejs";

/**
 * GET /api/admin/appearance
 *
 * Public-readable for the active palette, but the full list of
 * palettes is admin-only. When called without auth, returns just the
 * active palette + the preset list (so the storefront can render the
 * correct colors).
 */
export async function GET() {
  const active = await getActivePalette();
  try {
    await requireAdmin();
    return NextResponse.json({
      items: PALETTES,
      active,
    });
  } catch {
    return NextResponse.json({ active });
  }
}

interface PostBody {
  slug?: string;
}

/**
 * POST /api/admin/appearance
 *
 * Admin-only. Body: `{ slug: string }`. Sets the given palette as the
 * sole active palette.
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
    if (!body.slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }
    const ok = await setActivePalette(body.slug);
    if (!ok) {
      return NextResponse.json({ error: "palette not found" }, { status: 404 });
    }
    const active = await getActivePalette();
    return NextResponse.json({ ok: true, active });
  }) as Promise<Response>;
}
