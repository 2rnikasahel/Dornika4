"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type ColorPalette,
  PALETTES,
  paletteToCssVars,
} from "@/lib/color-palettes";

interface ColorPalettePanelProps {
  initialActiveSlug?: string;
}

/**
 * Live-preview color palette picker. Renders all 12 preset palettes as
 * clickable swatches; selecting one immediately applies the CSS vars
 * to the document root (live preview) AND persists the choice via
 * `POST /api/admin/appearance` so the next page-load uses it.
 */
export function ColorPalettePanel({
  initialActiveSlug,
}: ColorPalettePanelProps) {
  const [active, setActive] = useState<string | null>(initialActiveSlug ?? null);
  const [saving, setSaving] = useState<string | null>(null);

  // Apply the active palette's CSS vars on mount + whenever it changes.
  useEffect(() => {
    const p =
      PALETTES.find((x) => x.slug === active) ?? PALETTES[0];
    document.documentElement.setAttribute(
      "style",
      paletteToCssVars(p) + ";" + (document.documentElement.getAttribute("style") || ""),
    );
  }, [active]);

  async function apply(p: ColorPalette) {
    if (saving || active === p.slug) return;
    setSaving(p.slug);
    try {
      const res = await fetch("/api/admin/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "اعمال پالت ناموفق بود");
      }
      setActive(p.slug);
      toast.success(`پالت «${p.name}» اعمال شد`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در اعمال پالت");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-petrol-600" />
          <h3 className="text-sm font-bold text-navy-900">پالت‌های رنگی</h3>
        </div>
        {active && (
          <span className="text-[10px] text-charcoal-500">
            فعال:{" "}
            <span className="font-bold text-navy-900">
              {PALETTES.find((p) => p.slug === active)?.name ?? active}
            </span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PALETTES.map((p) => {
          const isActive = active === p.slug;
          const isSaving = saving === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => apply(p)}
              disabled={!!saving}
              className={cn(
                "group relative flex flex-col gap-2 rounded-2xl border p-3 text-right transition",
                isActive
                  ? "border-petrol-500 bg-petrol-500/5 ring-2 ring-petrol-300"
                  : "border-navy-900/8 bg-white/60 hover:border-navy-900/15",
                isSaving && "opacity-70",
              )}
            >
              {/* Swatches */}
              <div className="flex h-10 w-full overflow-hidden rounded-lg">
                {[
                  p.colors.primary,
                  p.colors.primary,
                  p.colors.accent,
                  p.colors.accent,
                  p.colors.background,
                  p.colors.accent,
                ].map((c, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-navy-900">{p.name}</span>
                <span className="text-[10px] text-charcoal-400" dir="ltr">
                  {p.name}
                </span>
              </div>
              <span
                className={cn(
                  "absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full transition",
                  isActive
                    ? "bg-petrol-500 text-white"
                    : "bg-white/80 text-transparent",
                )}
              >
                {isSaving ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Check size={10} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-navy-900/8 bg-white/60 p-4">
        <p className="text-[11px] text-charcoal-500">
          پیش‌نمایش زنده — رنگ‌های سایت هم‌اکنون با پالت فعال اعمال شده‌اند.
          برای ذخیره دائمی روی یک پالت کلیک کنید.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActive("midnight-petrol");
              void apply(PALETTES[0]);
            }}
            disabled={!!saving}
          >
            بازنشانی به پیش‌فرض
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ColorPalettePanel;
