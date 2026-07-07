"use client";
import { useState } from "react";
import { ShoppingBag, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickAddToCart({ variantId, productName }: { productSlug: string; variantId: number | null; productName: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  if (!variantId) return null;
  async function handle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (state !== "idle") return;
    setState("loading");
    try {
      const res = await fetch("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId, qty: 1 }) });
      if (res.ok) { setState("done"); setTimeout(() => setState("idle"), 2000); } else setState("idle");
    } catch { setState("idle"); }
  }
  return <button onClick={handle} disabled={state === "loading"} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-all", state === "done" ? "bg-green-600 text-white" : "bg-petrol-600 text-pearl-50 hover:bg-petrol-500")}>{state === "loading" ? <Loader2 className="size-3 animate-spin" /> : state === "done" ? <Check className="size-3" /> : <ShoppingBag className="size-3" />}{state === "done" ? "افزوده شد" : "افزودن"}</button>;
}
