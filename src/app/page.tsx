import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, PackageSearch } from "lucide-react";

import { getI18n } from "@/lib/i18n/server";
import {
  getLandingSlides,
  getLandingFeatures,
  type LandingSlide,
  type LandingFeature,
} from "@/lib/landing";
import { getShopProducts, type ShopProductCard } from "@/lib/shop";

import { Hero } from "@/components/landing/Hero";
import { LandingSlider } from "@/components/landing/LandingSlider";
import { TrustBox } from "@/components/landing/TrustBox";
import { Reveal } from "@/components/landing/Reveal";
import { TiltCard } from "@/components/landing/TiltCard";
import { IconMap } from "@/components/landing/IconMap";
import { Button } from "@/components/ui/button";
import { formatRial } from "@/lib/utils";

export default async function HomePage() {
  const { t } = await getI18n();
  const [slides, features, products] = await Promise.all([
    getLandingSlides(),
    getLandingFeatures(),
    getShopProducts({ limit: 4 }),
  ]);

  const heroSlide: LandingSlide | undefined = slides[0];
  const hero = {
    badge: t?.hero?.badge ?? "صنعت · طراحی · کیفیت",
    title: t?.hero?.title ?? "درنیکا ساحل",
    subtitle:
      t?.hero?.subtitle ??
      "پلتفرم تخصصی تأمین مواد اولیه و تجهیزات صنعتی با فناوری هوش مصنوعی",
    cta1Text: t?.hero?.cta1 ?? "مشاهده محصولات",
    cta1Href: "/shop",
    cta2Text: t?.hero?.cta2 ?? "درخواست مشاوره",
    cta2Href: "/contact",
  };
  void heroSlide;

  return (
    <>
      {/* Hero */}
      <Hero {...hero} />

      {/* Trust badges */}
      <TrustBox />

      {/* Slider */}
      <section className="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:mt-16 lg:px-8">
        <Reveal>
          <LandingSlider slides={slides} />
        </Reveal>
      </section>

      {/* Featured products */}
      {products.length > 0 && (
        <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:mt-24 lg:px-8">
          <Reveal>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
                  محصولات منتخب
                </h2>
                <p className="mt-1 text-sm text-charcoal-500">
                  انتخابی از پرفروش‌ترین و پربازدیدترین محصولات صنعتی
                </p>
              </div>
              <Button asChild variant="outline" className="gap-1.5">
                <Link href="/shop">
                  مشاهده همه
                  <ArrowLeft size={14} />
                </Link>
              </Button>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, idx) => (
              <Reveal key={p.id} delay={idx * 0.08}>
                <TiltCard className="h-full">
                  <ProductCard product={p} />
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {products.length === 0 && (
        <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:mt-24 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-navy-900/15 bg-white/60 p-12 text-center">
            <PackageSearch className="text-charcoal-300" size={36} />
            <p className="text-sm text-charcoal-500">
              هنوز محصولی ثبت نشده است. به‌زودی محصولات جدید اضافه می‌شوند.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/contact">درخواست مشاوره</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:mt-24 lg:px-8">
        <Reveal>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
              {t?.features?.title ?? "چرا درنیکا ساحل؟"}
            </h2>
            <p className="mt-2 text-sm text-charcoal-500">
              {t?.features?.subtitle ?? "راهکار هوشمند برای خرید صنعتی"}
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f: LandingFeature, idx: number) => (
            <Reveal key={f.id} delay={idx * 0.08}>
              <div className="h-full rounded-2xl border border-navy-900/8 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition hover:shadow-luxe">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-petrol-500/10 text-petrol-600">
                  <IconMap name={f.icon} size={22} />
                </span>
                <h3 className="mt-3 text-base font-bold text-navy-900">
                  {f.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-charcoal-500">
                  {f.desc ?? ""}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto mt-16 w-full max-w-7xl px-4 pb-20 sm:px-6 lg:mt-24 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-navy-900 via-navy-800 to-petrol-700 p-8 sm:p-12">
            <div className="relative z-10 flex flex-col items-start gap-4">
              <h3 className="text-2xl font-extrabold text-pearl-100 sm:text-3xl">
                آماده‌اید خرید هوشمند را تجربه کنید؟
              </h3>
              <p className="max-w-2xl text-sm text-pearl-200/80 sm:text-base">
                همین حالا حساب کاربری بسازید، از دستیار هوش مصنوعی ما برای
                پیدا کردن بهترین محصول کمک بگیرید و از قیمت‌های به‌روزرسانی شده
                مطلع شوید.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-petrol-300 text-navy-900 hover:bg-petrol-400">
                  <Link href="/shop">شروع خرید</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-pearl-100/30 bg-transparent text-pearl-100 hover:bg-pearl-100/10 hover:text-pearl-100"
                >
                  <Link href="/contact">درخواست مشاوره</Link>
                </Button>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-petrol-300/10 blur-3xl"
            />
          </div>
        </Reveal>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Product card (server component — no client interaction needed)      */
/* ------------------------------------------------------------------ */

function ProductCard({ product }: { product: ShopProductCard }) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-900/8 bg-white shadow-sm transition hover:shadow-luxe"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-navy-900/5">
        {product.coverImage ? (
          <Image
            src={product.coverImage}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-charcoal-300">
            <PackageSearch size={36} />
          </div>
        )}
        {!product.inStock && (
          <span className="absolute right-2 top-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            ناموجود
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.categoryTitle && (
          <span className="text-[10px] font-medium text-petrol-700">
            {product.categoryTitle}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-bold text-navy-900 transition group-hover:text-petrol-600">
          {product.title}
        </h3>
        {product.subtitle && (
          <p className="line-clamp-1 text-xs text-charcoal-500">
            {product.subtitle}
          </p>
        )}
        <div className="mt-auto pt-2">
          {product.minPrice != null ? (
            <span className="text-sm font-extrabold text-navy-900">
              از {formatRial(product.minPrice, { withUnit: false })}
              <span className="mr-1 text-[10px] font-normal text-charcoal-500">
                ریال
              </span>
            </span>
          ) : (
            <span className="text-xs text-charcoal-500">استعلام قیمت</span>
          )}
        </div>
      </div>
    </Link>
  );
}
