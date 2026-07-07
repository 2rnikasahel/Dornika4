/**
 * Luxury color palettes for "درنیکا ساحل" (Dornika Sahel).
 *
 * 12 hand-tuned palettes — each one a `background / surface / primary /
 * accent / text / textMuted / border` 7-tuple in hex.
 *
 * Three layers of API are exposed:
 *
 *   1. Static preset registry (`luxuryPalettes` / `PALETTES`) — used by
 *      the admin palette picker and by the storefront when no DB row
 *      has been activated yet.
 *
 *   2. Client-side helpers (`applyPalette`, `paletteToCssVars`,
 *      `getActivePaletteSlug`, `setActivePaletteSlug`) — apply CSS
 *      variables to `document.documentElement` and persist the user's
 *      choice in `localStorage`. These run in the browser only.
 *
 *   3. Server-side DB-backed helpers (`getActivePalette`,
 *      `setActivePalette`) — read/write the active palette in the
 *      `color_palettes` table so the choice survives across sessions
 *      and devices for admin-managed sites.
 */

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { colorPalettes } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ColorPaletteColors {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface ColorPalette {
  slug: string;
  name: string;
  description: string;
  colors: ColorPaletteColors;
}

/* ------------------------------------------------------------------ */
/* Static preset registry — 12 luxury palettes                        */
/* ------------------------------------------------------------------ */

export const luxuryPalettes: ColorPalette[] = [
  {
    slug: "navy-pearl",
    name: "سرمه‌ای و صدفی",
    description: "پالت اصلی درنیکا ساحل",
    colors: {
      background: "#f6f2e9",
      surface: "#ffffff",
      primary: "#0b2136",
      accent: "#237d90",
      text: "#05101d",
      textMuted: "#6b7280",
      border: "#0b21361a",
    },
  },
  {
    slug: "deep-ocean",
    name: "اقیانوس عمیق",
    description: "آبی نفتی عمیق با سفید صدفی",
    colors: {
      background: "#f0f4f8",
      surface: "#ffffff",
      primary: "#0d3b45",
      accent: "#196374",
      text: "#0a2530",
      textMuted: "#5a7a8a",
      border: "#0d3b451a",
    },
  },
  {
    slug: "charcoal-mist",
    name: "ذغالی و مه",
    description: "مینیمال و حرفه‌ای",
    colors: {
      background: "#f5f5f0",
      surface: "#ffffff",
      primary: "#262b36",
      accent: "#4a5262",
      text: "#1a1d24",
      textMuted: "#6b7280",
      border: "#262b361a",
    },
  },
  {
    slug: "midnight-petrol",
    name: "نیمه‌شب نفتی",
    description: "لوکس و مرموز",
    colors: {
      background: "#eef2f5",
      surface: "#ffffff",
      primary: "#05101d",
      accent: "#3d9dae",
      text: "#020812",
      textMuted: "#5a6b7a",
      border: "#05101d1a",
    },
  },
  {
    slug: "ivory-slate",
    name: "عاجی و سنگی",
    description: "کلاسیک و بی‌زمان",
    colors: {
      background: "#faf7f0",
      surface: "#ffffff",
      primary: "#2d3142",
      accent: "#4c6885",
      text: "#1a1d28",
      textMuted: "#7a7e8a",
      border: "#2d31421a",
    },
  },
  {
    slug: "deep-teal",
    name: "تیل عمیق",
    description: "مدرن و صنعتی",
    colors: {
      background: "#f0f5f4",
      surface: "#ffffff",
      primary: "#0a3d3a",
      accent: "#1a6b65",
      text: "#04201e",
      textMuted: "#5a7a75",
      border: "#0a3d3a1a",
    },
  },
  {
    slug: "graphite-pearl",
    name: "گرافیتی و صدفی",
    description: "جدی و حرفه‌ای",
    colors: {
      background: "#f4f2ee",
      surface: "#ffffff",
      primary: "#1c1f26",
      accent: "#5a6c7d",
      text: "#101218",
      textMuted: "#6b7080",
      border: "#1c1f261a",
    },
  },
  {
    slug: "storm-steel",
    name: "طوفان و فولاد",
    description: "قدرتمند و صنعتی",
    colors: {
      background: "#eef0f3",
      surface: "#ffffff",
      primary: "#1e2a35",
      accent: "#3d5566",
      text: "#0f1820",
      textMuted: "#5a6b78",
      border: "#1e2a351a",
    },
  },
  {
    slug: "pearl-petrol",
    name: "صدفی و نفتی",
    description: "آرام و دلپذیر",
    colors: {
      background: "#f8f4ec",
      surface: "#ffffff",
      primary: "#124e5c",
      accent: "#237d90",
      text: "#0a2a32",
      textMuted: "#5a7a82",
      border: "#124e5c1a",
    },
  },
  {
    slug: "slate-azure",
    name: "سنگی و آبی",
    description: "تمیز و مدرن",
    colors: {
      background: "#f1f3f6",
      surface: "#ffffff",
      primary: "#252e3d",
      accent: "#3b6e9e",
      text: "#151a24",
      textMuted: "#5a6578",
      border: "#252e3d1a",
    },
  },
  {
    slug: "dark-onyx",
    name: "اکسایت تیره",
    description: "فوق مدرن و مینیمال",
    colors: {
      background: "#f0f0f0",
      surface: "#ffffff",
      primary: "#0a0a0a",
      accent: "#3a3a3a",
      text: "#000000",
      textMuted: "#666666",
      border: "#0a0a0a1a",
    },
  },
  {
    slug: "navy-gold-muted",
    name: "سرمه‌ای و طلایی مات",
    description: "فاخر و شاهانه",
    colors: {
      background: "#f5f1e8",
      surface: "#ffffff",
      primary: "#0a1a2f",
      accent: "#8a7445",
      text: "#050d18",
      textMuted: "#5a6b7a",
      border: "#0a1a2f1a",
    },
  },
];

/** Alias used by the admin palette picker panel. */
export const PALETTES = luxuryPalettes;

/** localStorage key for the user's palette choice. */
const PALETTE_STORAGE_KEY = "dornika_palette";

/** Slug of the palette used as the fallback default. */
export const DEFAULT_PALETTE_SLUG = "navy-pearl";

/* ------------------------------------------------------------------ */
/* Client-side CSS-var helpers                                         */
/* ------------------------------------------------------------------ */

/**
 * Map a palette's color tuple to a `;`-separated CSS custom-property
 * string. The property names match the ones consumed by the
 * Tailwind config + global CSS.
 */
export function paletteToCssVars(p: ColorPalette): string {
  const c = p.colors;
  return [
    `--color-navy-900:${c.primary}`,
    `--color-navy-800:${c.primary}`,
    `--color-navy-700:${c.primary}`,
    `--color-petrol-600:${c.accent}`,
    `--color-petrol-700:${c.accent}`,
    `--color-pearl-100:${c.background}`,
    `--color-pearl-200:${c.background}`,
    `--color-charcoal-500:${c.textMuted}`,
    `--color-charcoal-900:${c.text}`,
  ].join(";");
}

/**
 * Apply a palette's CSS variables to `document.documentElement`.
 * Browser-only — guards against SSR by checking `typeof document`.
 */
export function applyPalette(p: ColorPalette): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = paletteToCssVars(p);
  // Merge with any existing inline style (so other vars aren't wiped).
  const existing = root.getAttribute("style") || "";
  root.setAttribute("style", `${vars};${existing}`);
}

/**
 * Read the user's palette choice from `localStorage`. Browser-only —
 * returns `DEFAULT_PALETTE_SLUG` during SSR.
 */
export function getActivePaletteSlug(): string {
  if (typeof window === "undefined") return DEFAULT_PALETTE_SLUG;
  return (
    window.localStorage.getItem(PALETTE_STORAGE_KEY) || DEFAULT_PALETTE_SLUG
  );
}

/**
 * Persist the user's palette choice to `localStorage`. Browser-only.
 */
export function setActivePaletteSlug(slug: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, slug);
  }
}

/* ------------------------------------------------------------------ */
/* Server-side DB-backed helpers                                       */
/* ------------------------------------------------------------------ */

/**
 * Look up a palette by slug in the static preset registry.
 */
export function findPresetBySlug(slug: string): ColorPalette | null {
  return luxuryPalettes.find((p) => p.slug === slug) ?? null;
}

/**
 * Returns the currently active palette:
 *
 *   1. Reads the `color_palettes` table for a row with `is_active=true`.
 *   2. If found, returns the corresponding preset (matched by slug) —
 *      or, if no preset matches, builds a `ColorPalette` from the DB row.
 *   3. If no active row exists, returns the `navy-pearl` default.
 *
 * Never throws — on any DB error, falls back to the default palette.
 */
export async function getActivePalette(): Promise<ColorPalette> {
  const fallback = findPresetBySlug(DEFAULT_PALETTE_SLUG) ?? luxuryPalettes[0];
  try {
    const rows = (await db
      .select({
        id: colorPalettes.id,
        slug: colorPalettes.slug,
        name: colorPalettes.name,
        colors: colorPalettes.colors,
        isActive: colorPalettes.isActive,
        sortOrder: colorPalettes.sortOrder,
      })
      .from(colorPalettes)
      .where(eq(colorPalettes.isActive, true))
      .limit(1)) as Array<{
      id: string;
      slug: string;
      name: string;
      colors: unknown;
      isActive: boolean;
      sortOrder: number;
    }>;

    const row = rows[0];
    if (!row) return fallback;

    // Prefer the static preset (it has the canonical description) when
    // the slugs match — otherwise synthesize a ColorPalette from the row.
    const preset = findPresetBySlug(row.slug);
    if (preset) return preset;

    const colors = (row.colors ?? {}) as Partial<ColorPaletteColors>;
    return {
      slug: row.slug,
      name: row.name,
      description: "",
      colors: {
        background: colors.background ?? fallback.colors.background,
        surface: colors.surface ?? fallback.colors.surface,
        primary: colors.primary ?? fallback.colors.primary,
        accent: colors.accent ?? fallback.colors.accent,
        text: colors.text ?? fallback.colors.text,
        textMuted: colors.textMuted ?? fallback.colors.textMuted,
        border: colors.border ?? fallback.colors.border,
      },
    };
  } catch {
    return fallback;
  }
}

/**
 * Set the active palette by slug. Marks all other DB rows as inactive
 * and the matching row as active. When no row exists for the slug, a
 * new one is inserted (using the static preset for the name + colors).
 *
 * Returns `true` on success, `false` when the slug is unknown.
 */
export async function setActivePalette(slug: string): Promise<boolean> {
  const preset = findPresetBySlug(slug);
  if (!preset) return false;

  try {
    // Check whether a row already exists for this slug.
    const existing = (await db
      .select({ id: colorPalettes.id })
      .from(colorPalettes)
      .where(eq(colorPalettes.slug, slug))
      .limit(1)) as Array<{ id: string }>;

    // Deactivate every other row.
    await db.update(colorPalettes).set({ isActive: false });

    if (existing.length > 0) {
      await db
        .update(colorPalettes)
        .set({ isActive: true })
        .where(eq(colorPalettes.id, existing[0].id));
    } else {
      await db.insert(colorPalettes).values({
        
        slug: preset.slug,
        name: preset.name,
        colors: preset.colors as unknown as Record<string, unknown>,
        isActive: true,
        sortOrder: 0,
      });
    }
    return true;
  } catch {
    return false;
  }
}
