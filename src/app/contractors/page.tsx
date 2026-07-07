import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "پنل پیمانکاران | درنیکا ساحل" };

export default async function ContractorsPage() {
  const { t } = await getI18n();
  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">پنل پیمانکاران</h1>
          <p className="mt-3 text-sm text-charcoal-500 sm:text-base">پورتال B2B</p>
        </div>
        <div className="card flex flex-col items-center gap-6 rounded-[2rem] px-8 py-16 text-center">
          <h2 className="text-xl font-bold text-navy-900">بزودی...</h2>
          <p className="max-w-md text-sm text-charcoal-500">این بخش در حال توسعه است و به‌زودی فعال خواهد شد.</p>
          <Link href="/shop" className="flex items-center gap-2 rounded-full bg-petrol-600 px-6 py-3 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500">مشاهده محصولات<ArrowLeft className="size-4" strokeWidth={2} /></Link>
        </div>
      </div>
    </div>
  );
}
