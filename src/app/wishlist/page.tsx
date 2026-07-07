import Link from "next/link";
import { Heart, Package } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";
import { getShopProducts } from "@/lib/shop";
import { formatRial } from "@/lib/utils";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";

export default async function WishlistPage() {
  const { t } = await getI18n();
  const sessionToken = await readSessionToken();
  const wishlistedIds = await getWishlistProductIds(sessionToken);
  const allProducts = await getShopProducts();
  const items = allProducts.filter(p => wishlistedIds.includes(String(p.id)));
  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8"><h1 className="text-gradient-navy text-3xl font-black sm:text-5xl">علاقه‌مندی‌ها</h1><p className="mt-2 text-sm text-charcoal-500">{items.length} محصول ذخیره شده</p></div>
        {items.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 rounded-[2rem] px-8 py-20 text-center"><Heart className="size-14 text-charcoal-400" strokeWidth={1.4} /><p className="text-charcoal-500">هنوز محصولی ذخیره نشده است</p><Link href="/shop" className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50">رفتن به فروشگاه</Link></div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(p => (
              <article key={p.id} className="card group relative overflow-hidden rounded-[1.75rem]">
                <WishlistToggleButton productId={p.id} initialWishlisted={true} compact className="absolute end-3 top-3 z-20 bg-pearl-100/90 backdrop-blur-md" />
                <Link href={`/shop/${p.slug}`} className="block">
                  {p.coverImage ? (<div className="aspect-[4/3] overflow-hidden bg-navy-900/5">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.coverImage} alt={p.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /></div>) : (<div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100"><Package className="size-16 text-navy-700/30" strokeWidth={1.2} /></div>)}
                  <div className="p-5"><h3 className="text-sm font-bold text-navy-900 group-hover:text-petrol-700">{p.title}</h3><p className="mt-2 text-xs font-semibold text-petrol-700">از {formatRial(p.minPrice || "0")}</p></div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
