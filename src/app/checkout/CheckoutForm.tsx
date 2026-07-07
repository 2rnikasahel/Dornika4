"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { formatRial } from "@/lib/utils";

export function CheckoutForm({ user, subtotal, count }: { user: any; subtotal: number; count: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const body = { shippingAddress: formData.get("address"), paymentMethod: "sandbox", notes: formData.get("notes") };
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.ok) {
        const payRes = await fetch("/api/orders/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: data.order.id }) });
        const payData = await payRes.json();
        if (payData.ok) { setSuccess(true); setTimeout(() => router.push("/profile"), 2000); }
      }
    } catch {} finally { setLoading(false); }
  }

  if (success) return <div className="card flex flex-col items-center gap-4 rounded-[2rem] p-12 text-center"><div className="flex size-16 items-center justify-center rounded-2xl bg-green-100 text-green-600"><Check className="size-8" strokeWidth={1.5} /></div><h2 className="text-lg font-bold text-navy-900">سفارش ثبت شد!</h2><p className="text-sm text-charcoal-500">در حال انتقال به پروفایل...</p></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card rounded-[2rem] p-6">
        <h2 className="mb-4 text-sm font-bold text-navy-900">آدرس ارسال</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="name" defaultValue={user.name} placeholder="نام گیرنده" className="rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500" />
          <input name="phone" defaultValue={user.phone || ""} placeholder="شماره تماس" dir="ltr" className="rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500" />
        </div>
        <textarea name="address" required rows={3} placeholder="آدرس کامل" className="mt-4 w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500" />
        <textarea name="notes" rows={2} placeholder="یادداشت (اختیاری)" className="mt-4 w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500" />
      </div>
      <div className="card rounded-[2rem] p-6">
        <h2 className="mb-4 text-sm font-bold text-navy-900">خلاصه سفارش</h2>
        <div className="flex justify-between text-xs"><span className="text-charcoal-500">{count} آیتم</span><span className="font-semibold text-navy-900">{formatRial(subtotal)}</span></div>
        <button type="submit" disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500 disabled:opacity-50">{loading ? <><Loader2 className="size-4 animate-spin" />در حال پردازش...</> : <>تایید نهایی و پرداخت<ArrowLeft className="size-4" strokeWidth={2} /></>}</button>
      </div>
    </form>
  );
}
