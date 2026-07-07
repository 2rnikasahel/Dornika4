import Link from "next/link";
import { Home, Search } from "lucide-react";
export const metadata = { title: "صفحه یافت نشد | درنیکا ساحل" };
export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 pb-24">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-8 text-[8rem] font-black leading-none text-gradient-navy sm:text-[12rem]">۴۰۴</h1>
        <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">صفحه مورد نظر یافت نشد</h2>
        <p className="mt-3 text-sm text-charcoal-500">صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500"><Home className="size-4" strokeWidth={1.8} />بازگشت به خانه</Link>
          <Link href="/shop" className="flex items-center justify-center gap-2 rounded-full bg-navy-900/5 px-6 py-3 text-sm font-semibold text-navy-900 hover:bg-navy-900/10"><Search className="size-4" strokeWidth={1.8} />مشاهده فروشگاه</Link>
        </div>
      </div>
    </div>
  );
}
