"use client";

import { useState } from "react";
import { ShoppingCart, Loader2, Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatRial, cn } from "@/lib/utils";

export interface VariantOption {
  id: string;
  sku: string | null;
  name: string;
  nameEn?: string | null;
  price: string; // decimal string
  stock: number;
  unitLabel?: string | null;
  unitValue?: string | null;
  specSheet?: Record<string, unknown> | null;
}

interface VariantSelectorProps {
  productId: string;
  variants: VariantOption[];
  /** Optional groups (e.g. by unit) — when provided, each group renders
   *  as its own accordion section. */
  groups?: Array<{ title: string; variants: VariantOption[] }>;
}

/**
 * Accordion-based variant selector. Each variant is a row inside the
 * accordion, with a quantity stepper and an "add to cart" button.
 *
 * Talks to `POST /api/cart/items` with `{ variantId, quantity }`.
 */
export function VariantSelector({
  productId,
  variants,
  groups,
}: VariantSelectorProps) {
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  function qty(variantId: string) {
    return qtyById[variantId] ?? 1;
  }
  function bump(variantId: string, delta: number) {
    setQtyById((prev) => {
      const next = Math.max(1, (prev[variantId] ?? 1) + delta);
      return { ...prev, [variantId]: next };
    });
  }

  async function add(v: VariantOption) {
    if (loadingId) return;
    setLoadingId(v.id);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: v.id, quantity: qty(v.id) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "افزودن به سبد ناموفق بود");
      }
      setDoneId(v.id);
      toast.success(`${v.name} به سبد خرید اضافه شد`);
      window.setTimeout(() => setDoneId(null), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در افزودن به سبد");
    } finally {
      setLoadingId(null);
    }
  }

  void productId;

  const renderRow = (v: VariantOption) => {
    const price = Number(v.price) || 0;
    const outOfStock = v.stock <= 0;
    return (
      <div
        key={v.id}
        className="flex flex-col gap-2 rounded-xl border border-navy-900/6 bg-white/60 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-navy-900">{v.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-charcoal-500">
            {v.sku && (
              <span dir="ltr" className="font-mono">
                {v.sku}
              </span>
            )}
            {v.unitLabel && <span>واحد: {v.unitLabel}</span>}
            {v.unitValue && <span>مقدار: {v.unitValue}</span>}
            <span className={outOfStock ? "text-rose-600" : "text-emerald-600"}>
              {outOfStock ? "ناموجود" : `موجود: ${v.stock}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-navy-900">
            {formatRial(price, { withUnit: false })}
            <span className="mr-1 text-[10px] font-normal text-charcoal-500">
              ریال
            </span>
          </span>
          {/* Qty stepper */}
          <div className="inline-flex items-center rounded-full border border-navy-900/10 bg-white">
            <button
              type="button"
              aria-label="کاهش"
              onClick={() => bump(v.id, -1)}
              className="inline-flex h-7 w-7 items-center justify-center text-charcoal-700 hover:bg-navy-900/5"
            >
              <Minus size={12} />
            </button>
            <span className="min-w-6 text-center text-xs font-semibold">
              {qty(v.id)}
            </span>
            <button
              type="button"
              aria-label="افزایش"
              onClick={() => bump(v.id, 1)}
              className="inline-flex h-7 w-7 items-center justify-center text-charcoal-700 hover:bg-navy-900/5"
            >
              <Plus size={12} />
            </button>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={outOfStock || loadingId === v.id}
            onClick={() => add(v)}
            className={cn("gap-1.5", outOfStock && "opacity-50")}
          >
            {loadingId === v.id ? (
              <Loader2 size={14} className="animate-spin" />
            ) : doneId === v.id ? (
              <Check size={14} />
            ) : (
              <ShoppingCart size={14} />
            )}
            {doneId === v.id ? "اضافه شد" : "افزودن"}
          </Button>
        </div>
      </div>
    );
  };

  if (groups && groups.length > 0) {
    return (
      <Accordion
        type="single"
        defaultValue={`group-${groups[0].title}`}
        collapsible
        className="w-full"
      >
        {groups.map((g, idx) => (
          <AccordionItem key={g.title} value={`group-${g.title}`}>
            <AccordionTrigger className="text-sm font-bold text-navy-900">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-petrol-500/10 text-[10px] font-bold text-petrol-700">
                  {idx + 1}
                </span>
                {g.title}
                <span className="text-[10px] font-normal text-charcoal-400">
                  ({g.variants.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              {g.variants.map(renderRow)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
    <Accordion
      type="single"
      defaultValue={variants[0]?.id ? `var-${variants[0].id}` : undefined}
      collapsible
      className="w-full"
    >
      <AccordionItem value="variants" className="border-0">
        <AccordionTrigger className="text-sm font-bold text-navy-900">
          انتخاب گزینه
        </AccordionTrigger>
        <AccordionContent className="space-y-2">
          {variants.map(renderRow)}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default VariantSelector;
