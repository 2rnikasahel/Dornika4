import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, ChevronLeft, Home } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getProductBySlug, getShopProducts } from "@/lib/shop";
import { WishlistToggleButton } from "@/components/commerce/WishlistToggleButton";
import { getWishlistProductIds, readSessionToken } from "@/lib/commerce";
import { formatRial } from "@/lib/utils";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getI18n();
  const sessionToken = await readSessionToken();
  const wishlistedIds = await getWishlistProductIds(sessionToken);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = (await getShopProducts()).filter(p => p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-charcoal-500">
          <Link href="/" className="hover:text-petrol-600"><Home className="size-3.5" strokeWidth={1.8} /></Link>
          <ChevronLeft className="size-3" strokeWidth={1.8} />
          <Link href="/shop" className="hover:text-petrol-600">{t.nav.shop}</Link>
          <ChevronLeft className="size-3" strokeWidth={1.8} />
          <span className="truncate font-medium text-navy-900">{product.title}</span>
        </nav>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card relative overflow-hidden rounded-[2rem]">
            {product.coverImage ? (<div className="relative aspect-[4/3]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.coverImage} alt={product.title} className="size-full object-cover" /></div>) : (<div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-navy-900/5 via-pearl-100 to-petrol-100"><Package className="size-28 text-navy-700/25" strokeWidth={1.1} /></div>)}
          </div>
          <div>
            <span className="mb-2 inline-block rounded-full bg-petrol-600/10 px-3 py-1 text-xs font-medium text-petrol-700">{product.categoryTitle}</span>
            <h1 className="text-2xl font-bold text-navy-900 sm:text-4xl">{product.title}</h1>
            {product.subtitle && <p className="mt-3 text-sm leading-7 text-charcoal-500">{product.subtitle}</p>}
            {product.description && <p className="mt-4 text-sm leading-7 text-charcoal-500">{product.description}</p>}
            {product.variants.length > 0 && (<div className="mt-4 rounded-2xl bg-navy-900/[0.03] px-4 py-3"><p className="text-xs text-charcoal-500">قیمت از:</p><p className="text-lg font-bold text-navy-900">{formatRial(Math.min(...product.variants.map(v => Number(v.price))))}</p></div>)}
            <div className="mt-8"><WishlistToggleButton productId={product.id} initialWishlisted={wishlistedIds.includes(String(product.id))} /></div>
          </div>
        </div>
        {related.length > 0 && (<div className="mt-16"><h2 className="mb-6 text-xl font-bold text-navy-900 sm:text-2xl">محصولات مرتبط</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map(p => (<Link key={p.id} href={`/shop/${p.slug}`} className="card group overflow-hidden rounded-[1.5rem] hover:shadow-lg"><div className="aspect-[4/3] overflow-hidden bg-navy-900/5">{p.coverImage ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.coverImage} alt={p.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /></> : <div className="flex h-full items-center justify-center"><Package className="size-12 text-navy-700/20" strokeWidth={1.2} /></div>}</div><div className="p-4"><h3 className="line-clamp-1 text-sm font-bold text-navy-900 group-hover:text-petrol-700">{p.title}</h3><p className="mt-2 text-xs font-semibold text-petrol-700">از {formatRial(p.minPrice)}</p></div></Link>))}</div></div>)}
      </div>
    </div>
  );
}
