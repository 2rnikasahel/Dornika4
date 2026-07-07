import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCartPageData, readSessionToken } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { formatRial } from "@/lib/utils";
import { CartItemRow } from "@/components/commerce/CartItemRow";

export default async function CartPage() {
  const { t } = await getI18n();
  const sessionToken = await readSessionToken();
  const [cart, user] = await Promise.all([getCartPageData(sessionToken), getCurrentUser()]);
  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div><h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">{t.nav.cart}</h1><p className="mt-2 text-sm text-charcoal-500">{cart.count > 0 ? `${cart.count} آیتم در سبد` : "سبد خرید خالی است"}</p></div>
          <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-xs font-semibold text-pearl-50"><ArrowLeft className="size-4" strokeWidth={1.8} />ادامه خرید</Link>
        </div>
        {cart.items.length === 0 ? (
          <div className="card flex flex-col items-center gap-5 rounded-[2rem] px-8 py-20 text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-navy-900/5 text-navy-700"><ShoppingBag className="size-10" strokeWidth={1.2} /></div>
            <div><h2 className="text-lg font-bold text-navy-900">سبد خرید شما خالی است</h2><p className="mt-2 max-w-sm text-sm text-charcoal-500">هنوز چیزی به سبد اضافه نشده. محصولات را از فروشگاه انتخاب کنید.</p></div>
            <Link href="/shop" className="flex items-center gap-2 rounded-full bg-petrol-600 px-6 py-3 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500"><ArrowLeft className="size-4" strokeWidth={1.8} />رفتن به فروشگاه</Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">{cart.items.map(item => <CartItemRow key={item.id} item={item} />)}</div>
            <div className="card rounded-[2rem] p-6">
              <h2 className="mb-4 text-sm font-bold text-navy-900">خلاصه سفارش</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-charcoal-500"><span>جمع کل</span><span className="font-semibold text-navy-900">{formatRial(cart.subtotal)}</span></div>
                <div className="flex justify-between text-charcoal-500"><span>ارسال</span><span className="text-green-600">رایگان</span></div>
              </div>
              <div className="mt-4 border-t border-navy-900/10 pt-4"><div className="flex justify-between"><span className="text-sm font-bold text-navy-900">مبلغ نهایی</span><span className="text-lg font-black text-navy-900">{formatRial(cart.subtotal)}</span></div></div>
              <Link href="/checkout" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500">تایید و پرداخت<ArrowLeft className="size-4" strokeWidth={2} /></Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
