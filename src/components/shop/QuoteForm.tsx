"use client";
import { useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

export function QuoteForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"), company: fd.get("company"), message: fd.get("message") }) });
      const data = await res.json();
      if (data.ok) setSuccess(true); else setError(data.error);
    } catch { setError("اتصال برقرار نشد."); } finally { setLoading(false); }
  }

  if (success) return <div className="card flex flex-col items-center gap-4 rounded-[1.5rem] p-8 text-center"><div className="flex size-16 items-center justify-center rounded-2xl bg-green-100 text-green-600"><Check className="size-8" strokeWidth={1.5} /></div><h2 className="text-lg font-bold text-navy-900">درخواست شما ثبت شد!</h2><p className="max-w-md text-sm text-charcoal-500">کارشناسان ما به‌زودی با شما تماس خواهند گرفت.</p></div>;

  return (
    <div className="card rounded-[1.5rem] p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-xs font-semibold text-navy-900">نام و نام خانوادگی *</label><input name="name" type="text" required placeholder="نام شما" className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500 focus:bg-white" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-navy-900">شماره موبایل *</label><input name="phone" type="tel" required placeholder="09123456789" dir="ltr" className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500 focus:bg-white" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-xs font-semibold text-navy-900">ایمیل</label><input name="email" type="email" placeholder="example@email.com" dir="ltr" className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500 focus:bg-white" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-navy-900">نام شرکت</label><input name="company" type="text" placeholder="نام شرکت" className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500 focus:bg-white" /></div>
        </div>
        <div><label className="mb-1.5 block text-xs font-semibold text-navy-900">لیست محصولات مورد نیاز *</label><textarea name="message" rows={5} required placeholder="نام محصول، کد کالا، تعداد..." className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-xs text-navy-900 outline-none focus:border-petrol-500 focus:bg-white" /></div>
        {error && <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600">{error}</div>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500 disabled:opacity-50">{loading ? <><Loader2 className="size-4 animate-spin" />در حال ارسال...</> : <>ارسال درخواست<ArrowLeft className="size-4" /></>}</button>
      </form>
    </div>
  );
}
