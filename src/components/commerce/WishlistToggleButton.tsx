"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WishlistToggleButtonProps {
  productId: string;
  active?: boolean;
  size?: number;
  className?: string;
  onToggle?: (nextActive: boolean) => void;
}

/**
 * Toggle button that adds/removes a product from the session wishlist.
 *
 * Talks to `/api/wishlist` (POST = add, DELETE = remove). Shows a
 * heart icon that fills in when the product is already in the wishlist.
 */
export function WishlistToggleButton({
  productId,
  active = false,
  size = 18,
  className,
  onToggle,
}: WishlistToggleButtonProps) {
  const [isActive, setIsActive] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const next = !isActive;
    try {
      const res = await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("failed");
      setIsActive(next);
      onToggle?.(next);
      toast.success(next ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
    } catch {
      toast.error("خطا در بروزرسانی علاقه‌مندی");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={isActive}
      aria-label={isActive ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
        isActive
          ? "border-rose-300 bg-rose-50 text-rose-600"
          : "border-navy-900/10 bg-white/80 text-charcoal-500 hover:text-rose-600 hover:border-rose-300",
        className,
      )}
    >
      <Heart size={size} fill={isActive ? "currentColor" : "none"} />
    </button>
  );
}

export default WishlistToggleButton;
