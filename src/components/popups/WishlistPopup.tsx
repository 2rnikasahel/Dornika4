"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Loader2, ShoppingCart, Trash2 } from "lucide-react";

import { LuxePopup } from "./LuxePopup";
import { Button } from "@/components/ui/button";
import { formatRial } from "@/lib/utils";
import { toast } from "sonner";

interface WishlistPopupProps {
  open: boolean;
  onClose: () => void;
}

interface WishlistItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  minPrice: number | null;
}

/**
 * Quick wishlist view. Loads `/api/wishlist` on open and lets the user
 * remove items or jump to a product page.
 */
export function WishlistPopup({ open, onClose }: WishlistPopupProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { items: WishlistItem[] };
      setItems(json.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function remove(productId: string) {
    setRemoving(productId);
    try {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("failed");
      toast.success("حذف شد");
      setItems((prev) => prev.filter((i) => i.id !== productId));
    } catch {
      toast.error("حذف ناموفق بود");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <LuxePopup
      open={open}
      onClose={onClose}
      title="علاقه‌مندی‌ها"
      width="md"
      side="right"
      footer={
        items.length > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-charcoal-500">
              {items.length} کالا
            </span>
            <Button asChild variant="outline" size="sm" onClick={onClose}>
              <Link href="/wishlist">مشاهده همه</Link>
            </Button>
          </div>
        ) : null
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-12 text-charcoal-500">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Heart className="text-charcoal-300" size={40} />
          <p className="text-sm text-charcoal-500">
            لیست علاقه‌مندی‌های شما خالی است
          </p>
          <Button asChild variant="outline" size="sm" onClick={onClose}>
            <Link href="/shop">مشاهده محصولات</Link>
          </Button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-navy-900/6 bg-white/60 p-3"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-navy-900/5">
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={item.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/shop/${item.slug}`}
                  className="block truncate text-sm font-bold text-navy-900 hover:text-petrol-600"
                  onClick={onClose}
                >
                  {item.title}
                </Link>
                {item.subtitle && (
                  <p className="truncate text-xs text-charcoal-500">
                    {item.subtitle}
                  </p>
                )}
                {item.minPrice != null && (
                  <p className="mt-1 text-xs text-petrol-700">
                    از {formatRial(item.minPrice, { withUnit: false })}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Link
                  href={`/shop/${item.slug}`}
                  onClick={onClose}
                  aria-label="افزودن به سبد"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-petrol-50 hover:text-petrol-600"
                >
                  <ShoppingCart size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={removing === item.id}
                  aria-label="حذف"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                >
                  {removing === item.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </LuxePopup>
  );
}

export default WishlistPopup;
