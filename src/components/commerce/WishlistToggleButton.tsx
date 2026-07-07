"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function WishlistToggleButton({ productId, initialWishlisted, compact, className }: { productId: number | string; initialWishlisted: boolean; compact?: boolean; className?: string }) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: Number(productId) }) });
      const data = await res.json();
      if (data.ok) setWishlisted(data.action === "added");
    } catch {} finally { setLoading(false); }
  }
  return <button onClick={toggle} className={cn("flex items-center justify-center rounded-full transition-all", compact ? "size-8" : "rounded-full bg-navy-900/5 px-4 py-2 text-xs font-semibold text-navy-900", className)} aria-label="افزودن به علاقه‌مندی"><Heart className={cn(compact ? "size-4" : "size-4", wishlisted ? "fill-red-500 text-red-500" : "text-charcoal-400")} strokeWidth={1.8} /></button>;
}
