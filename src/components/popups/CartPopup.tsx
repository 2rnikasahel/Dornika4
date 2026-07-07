"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingCart, Loader2 } from "lucide-react";

import { LuxePopup } from "./LuxePopup";
import { Button } from "@/components/ui/button";
import { formatRial } from "@/lib/utils";
import { toast } from "sonner";

interface CartPopupProps {
  open: boolean;
  onClose: () => void;
}

interface CartItem {
  id: string;
  variantId: string | null;
  productId: string | null;
  quantity: number;
  price: number;
  productTitle: string;
  variantTitle: string | null;
  unitLabel: string | null;
  coverImage: string | null;
  slug: string | null;
  lineTotal: number;
}

interface CartData {
  items: CartItem[];
  subtotal: number;
  count: number;
}

/**
 * Quick cart view. Loads `/api/cart` on open, allows removing items,
 * and links to the full checkout page.
 */
export function CartPopup({ open, onClose }: CartPopupProps) {
  const [data, setData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as CartData;
      setData(json);
    } catch {
      setData({ items: [], subtotal: 0, count: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function remove(itemId: string) {
    setRemoving(itemId);
    try {
      const res = await fetch(`/api/cart?itemId=${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      toast.success("حذف شد");
      await load();
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
      title="سبد خرید"
      width="md"
      side="right"
      footer={
        data && data.items.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-charcoal-500">جمع کل</span>
              <span className="text-base font-extrabold text-navy-900">
                {formatRial(data.subtotal)}
              </span>
            </div>
            <Button asChild className="gap-2">
              <Link href="/checkout" onClick={onClose}>
                <ShoppingCart size={16} />
                تسویه حساب
              </Link>
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

      {!loading && data && data.items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ShoppingCart className="text-charcoal-300" size={40} />
          <p className="text-sm text-charcoal-500">سبد خرید شما خالی است</p>
          <Button asChild variant="outline" size="sm" onClick={onClose}>
            <Link href="/shop">مشاهده محصولات</Link>
          </Button>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-navy-900/6 bg-white/60 p-3"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-navy-900/5">
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={item.productTitle}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={item.slug ? `/shop/${item.slug}` : "/shop"}
                  className="block truncate text-sm font-bold text-navy-900 hover:text-petrol-600"
                  onClick={onClose}
                >
                  {item.productTitle}
                </Link>
                {item.variantTitle && (
                  <p className="truncate text-xs text-charcoal-500">
                    {item.variantTitle}
                  </p>
                )}
                <p className="mt-1 text-xs text-petrol-700">
                  {item.quantity} عدد × {formatRial(item.price, { withUnit: false })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-bold text-navy-900">
                  {formatRial(item.lineTotal, { withUnit: false })}
                </span>
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

export default CartPopup;
