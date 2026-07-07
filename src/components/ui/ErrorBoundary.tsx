"use client";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 pb-24">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle className="size-8" strokeWidth={1.5} /></div>
        <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">خطایی رخ داد</h2>
        <p className="mt-3 text-sm text-charcoal-500">متأسفانه در بارگذاری این صفحه خطایی پیش آمد. لطفاً دوباره تلاش کنید.</p>
        {process.env.NODE_ENV === "development" && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-left"><p className="text-[10px] font-mono text-red-600" dir="ltr">{error.message}</p></div>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={reset} className="flex items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500"><RefreshCw className="size-4" strokeWidth={1.8} />تلاش مجدد</button>
          <Link href="/" className="flex items-center justify-center gap-2 rounded-full bg-navy-900/5 px-6 py-3 text-sm font-semibold text-navy-900 hover:bg-navy-900/10"><Home className="size-4" strokeWidth={1.8} />بازگشت به خانه</Link>
        </div>
      </div>
    </div>
  );
}
