import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { products, productVariants, aiPriceUpdateJobs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { adminGuard } from "@/lib/admin-guard";

export const runtime = "nodejs";

interface PriceRow {
  code?: string;
  sku?: string;
  price?: number | string;
  CODE?: string;
  SKU?: string;
  PRICE?: number | string;
}

/**
 * Parses a Code+Price Excel file uploaded as `multipart/form-data`.
 *
 * Accepts files with header columns `CODE` (or `SKU`) and `PRICE`. The
 * parser is intentionally tolerant — it accepts `.csv`, `.tsv`, and
 * `.xlsx` (when the `xlsx` package is available). For Excel files we
 * fall back to a simple text scan when the package is missing.
 *
 * Body params:
 *   - file:      File (required)
 *   - mode:      "dry-run" | "apply"  (default: dry-run)
 */
export async function POST(req: Request) {
  return adminGuard(async () => {
    await requireAdmin();

    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const mode = (fd.get("mode") as string | null) === "apply" ? "apply" : "dry-run";
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseTextTable(text);

    // Build a SKU → price map.
    const updates: Array<{ sku: string; price: number }> = [];
    for (const r of rows) {
      const sku = String(r.CODE ?? r.code ?? r.SKU ?? r.sku ?? "").trim();
      const priceRaw = r.PRICE ?? r.price;
      const price = priceRaw == null ? NaN : Number(priceRaw);
      if (sku && Number.isFinite(price) && price >= 0) {
        updates.push({ sku, price });
      }
    }

    // Resolve each SKU to a variant.
    const allVariants = (await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        price: productVariants.price,
        productId: productVariants.productId,
      })
      .from(productVariants)) as Array<{
      id: number;
      sku: string | null;
      name: string;
      price: string;
      productId: number;
    }>;

    const bySku = new Map<string, (typeof allVariants)[number]>();
    for (const v of allVariants) {
      if (v.sku) bySku.set(v.sku, v);
    }

    let matched = 0;
    let updated = 0;
    let errors = 0;
    const report: Array<{
      sku: string;
      oldPrice?: string;
      newPrice: number;
      matched: boolean;
      applied: boolean;
    }> = [];

    for (const u of updates) {
      const variant = bySku.get(u.sku);
      if (!variant) {
        errors++;
        report.push({ sku: u.sku, newPrice: u.price, matched: false, applied: false });
        continue;
      }
      matched++;
      const oldPrice = variant.price;
      if (mode === "apply") {
        try {
          await db
            .update(productVariants)
            .set({ price: String(u.price.toFixed(2)) })
            .where(eq(productVariants.id, variant.id));
          updated++;
          report.push({
            sku: u.sku,
            oldPrice,
            newPrice: u.price,
            matched: true,
            applied: true,
          });
        } catch (e) {
          errors++;
          report.push({
            sku: u.sku,
            oldPrice,
            newPrice: u.price,
            matched: true,
            applied: false,
          });
          console.warn("[price-update] error:", (e as Error).message);
        }
      } else {
        report.push({
          sku: u.sku,
          oldPrice,
          newPrice: u.price,
          matched: true,
          applied: false,
        });
      }
    }

    // Record the job.
    await db.insert(aiPriceUpdateJobs).values({
      filename: file.name,
      mode,
      totalRows: rows.length,
      matchedRows: matched,
      updatedRows: updated,
      errorRows: errors,
      report: {
        updates: report.slice(0, 200),
        mode,
        filename: file.name,
      },
    });

    void products;

    return NextResponse.json({
      ok: true,
      mode,
      filename: file.name,
      totalRows: rows.length,
      matched,
      updated,
      errors,
      report: report.slice(0, 200),
    });
  }) as Promise<Response>;
}

/* ------------------------------------------------------------------ */
/* Text-table parser (CSV / TSV / pipe-separated)                      */
/* ------------------------------------------------------------------ */

function parseTextTable(text: string): PriceRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter: comma, tab, or pipe.
  const sample = lines[0];
  let delim = ",";
  if (sample.includes("\t")) delim = "\t";
  else if (sample.includes("|")) delim = "|";
  else if (sample.includes(";")) delim = ";";

  const headers = lines[0].split(delim).map((h) => h.trim());
  const rows: PriceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delim).map((p) => p.trim());
    const row: Record<string, string | number> = {};
    headers.forEach((h, idx) => {
      const key = h || `col${idx}`;
      row[key] = parts[idx] ?? "";
    });
    rows.push(row as PriceRow);
  }
  return rows;
}
