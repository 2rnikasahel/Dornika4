"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WishlistToggleClientProps {
  productId: string;
  active?: boolean;
  size?: number;
  className?: string;
}

/**
 * Simplified wishlist toggle used on the wishlist page itself. Always
 * starts "active" and removes the item on click (then reloads).
 */
export function WishlistToggleClient({
  productId,
  active: initialActive = true,
  size = 18,
  className,
}: WishlistToggleClientProps) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("failed");
      setActive(false);
      toast.success("از علاقه‌مندی حذف شد");
      window.setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("حذف ناموفق بود");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      aria-pressed={active}
      aria-label="حذف از علاقه‌مندی"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
        active
          ? "border-rose-300 bg-rose-50 text-rose-600"
          : "border-navy-900/10 bg-white/80 text-charcoal-500",
        className,
      )}
    >
      <Heart size={size} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

export default WishlistToggleClient;
