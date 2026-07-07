"use client";
import { useState } from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import { formatRial } from "@/lib/utils";

export function CartItemRow({ item }: { item: any }) {
  const [qty, setQty] = useState(item.quantity);
  async function updateQty(newQty: number) {
    setQty(newQty);
    await fetch("/api/cart/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, qty: newQty }) });
    if (newQty <= 0) window.location.reload();
  }
  return (
    <div className="card flex items-center gap-4 rounded-[1.5rem] p-4">
      <div className="flex-1">
        <p className="text-sm font-bold text-navy-900">{item.productTitle}</p>
        <p className="text-xs text-charcoal-500">{item.variantTitle}</p>
        <p className="mt-1 text-xs font-semibold text-petrol-700">{formatRial(item.priceSnapshot)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => updateQty(qty - 1)} className="flex size-8 items-center justify-center rounded-full bg-navy-900/5 text-navy-900 hover:bg-navy-900/10"><Minus className="size-3" strokeWidth={2} /></button>
        <span className="min-w-8 text-center text-sm font-bold text-navy-900">{qty}</span>
        <button onClick={() => updateQty(qty + 1)} className="flex size-8 items-center justify-center rounded-full bg-navy-900/5 text-navy-900 hover:bg-navy-900/10"><Plus className="size-3" strokeWidth={2} /></button>
      </div>
      <button onClick={() => updateQty(0)} className="flex size-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="size-3.5" strokeWidth={1.8} /></button>
    </div>
  );
}
