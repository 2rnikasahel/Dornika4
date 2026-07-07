import { getI18n } from "@/lib/i18n/server";
import { FileText } from "lucide-react";
import { QuoteForm } from "@/components/shop/QuoteForm";
export const metadata = { title: "استعلام قیمت | درنیکا ساحل" };
export default async function QuotePage() {
  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-petrol-600/10 text-petrol-700"><FileText className="size-8" strokeWidth={1.5} /></div>
          <h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">استعلام قیمت</h1>
          <p className="mt-3 text-sm text-charcoal-500 sm:text-base">برای پروژه‌های صنعتی و خرید عمده، فرم استعلام را تکمیل کنید</p>
        </div>
        <QuoteForm />
      </div>
    </div>
  );
}
