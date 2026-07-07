import Link from "next/link";
import { Search, Package, Image as ImageIcon } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getShopProducts, getAllCategories } from "@/lib/shop";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { QuickAddToCart } from "@/components/commerce/QuickAddToCart";
import { formatRial } from "@/lib/utils";
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; sort?: string }> }) {
  const { t } = await getI18n();
  const params = await searchParams;
  const sessionToken = await readSessionToken();
  const [categories, wishlistedIds, products] = await Promise.all([getAllCategories(), getWishlistProductIds(sessionToken), getShopProducts({ categorySlug: params.cat, search: params.q })]);
  let sortedProducts = [...products];
  if (params.sort === "cheapest") sortedProducts.sort((a, b) => Number(a.minPrice) - Number(b.minPrice));
  else if (params.sort === "expensive") sortedProducts.sort((a, b) => Number(b.minPrice) - Number(a.minPrice));
  const activeCat = categories.find(c => c.slug === params.cat);

  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-gradient-navy text-3xl font-black sm:text-4xl">{t.nav.shop}</h1>
            <p className="mt-1 text-sm text-charcoal-500">{sortedProducts.length} محصول{activeCat ? ` در دسته «${activeCat.title}»` : ""}</p>
          </div>
          <ShopFilters categories={categories} currentCat={params.cat} currentSearch={params.q} currentSort={params.sort} />
        </div>
        {sortedProducts.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 rounded-[2rem] px-8 py-20 text-center">
            <Package className="size-12 text-charcoal-400" strokeWidth={1.3} />
            <p className="text-charcoal-500">محصولی یافت نشد</p>
            <Link href="/shop" className="rounded-full bg-petrol-600 px-5 py-2 text-xs font-semibold text-pearl-50">نمایش همه</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {sortedProducts.map(p => (
              <article key={p.id} className="card group relative overflow-hidden rounded-2xl transition-all hover:shadow-lg sm:rounded-[1.75rem]">
                <WishlistToggleButton productId={p.id} initialWishlisted={wishlistedIds.includes(String(p.id))} compact className="absolute end-2 top-2 z-20 bg-pearl-100/90 backdrop-blur-md sm:end-3 sm:top-3" />
                <Link href={`/shop/${p.slug}`} className="block">
                  {p.coverImage ? (
                    <div className="aspect-square overflow-hidden bg-navy-900/5 sm:aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.coverImage} alt={p.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100 sm:aspect-[4/3]">
                      <ImageIcon className="size-12 text-navy-700/30 sm:size-16" strokeWidth={1.2} />
                    </div>
                  )}
                  <div className="p-3 sm:p-5">
                    <span className="mb-1.5 inline-block rounded-full bg-petrol-600/10 px-2 py-0.5 text-[9px] font-medium text-petrol-700 sm:px-2.5 sm:text-[10px]">{p.categoryTitle}</span>
                    <h3 className="line-clamp-2 text-xs font-bold leading-5 text-navy-900 group-hover:text-petrol-700 sm:text-sm sm:leading-6">{p.title}</h3>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-navy-900 sm:text-xs">از {formatRial(p.minPrice || 0, { withUnit: false })}</span>
                      <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[9px] text-charcoal-500 sm:text-[10px]">{p.variantCount} تنوع</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
