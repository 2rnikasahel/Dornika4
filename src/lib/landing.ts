/**
 * Landing page content data layer for "درنیکا ساحل" (Dornika Sahel).
 *
 * Slides and feature cards are stored in the database; when the DB is
 * empty (fresh sandbox), we fall back to sensible Persian defaults so
 * the homepage never renders blank.
 */

import { eq, asc } from "drizzle-orm";

import { db } from "@/db";
import { landingSlides, landingFeatures } from "@/db/schema";

export interface LandingSlide {
  id: string;
  badge: string | null;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  cta2Text: string | null;
  cta2Href: string | null;
  accentColor: string | null;
  image: string | null;
}

export interface LandingFeature {
  id: string;
  icon: string;
  title: string;
  desc: string | null;
}

/* ------------------------------------------------------------------ */
/* Defaults (used when DB rows are missing — fresh sandbox)            */
/* ------------------------------------------------------------------ */

const DEFAULT_SLIDES: LandingSlide[] = [
  {
    id: "default-1",
    badge: "صنعت · طراحی · کیفیت",
    title: "تأمین تخصصی تجهیزات صنعتی و تأسیسات",
    subtitle:
      "پلتفرم هوشمند درنیکا ساحل برای خرید آگاهانه، استعلام قیمت آنی و تأمین قطعات صنعتی با هوش مصنوعی.",
    ctaText: "مشاهده محصولات",
    ctaHref: "/shop",
    cta2Text: "درخواست مشاوره",
    cta2Href: "/contact",
    accentColor: "#2d97ad",
    image: null,
  },
];

const DEFAULT_FEATURES: LandingFeature[] = [
  {
    id: "f1",
    icon: "package",
    title: "تنوع گسترده محصولات",
    desc: "هزاران محصول صنعتی با مشخصات فنی دقیق و قابل مقایسه",
  },
  {
    id: "f2",
    icon: "sparkles",
    title: "دستیار هوش مصنوعی",
    desc: "پیدا کردن بهترین محصول و قیمت به‌روزرسانی شده با AI",
  },
  {
    id: "f3",
    icon: "building",
    title: "آماده B2B",
    desc: "حساب سازمانی، کد اقتصادی و صورت‌حساب رسمی برای شرکت‌ها",
  },
  {
    id: "f4",
    icon: "shield",
    title: "پرداخت امن",
    desc: "اتصال به درگاه‌های معتبر و رمزنگاری کامل اطلاعات سفارش",
  },
];

/* ------------------------------------------------------------------ */
/* Fetchers                                                            */
/* ------------------------------------------------------------------ */

export async function getLandingSlides(): Promise<LandingSlide[]> {
  try {
    const rows = (await db
      .select({
        id: landingSlides.id,
        badge: landingSlides.badge,
        title: landingSlides.title,
        subtitle: landingSlides.subtitle,
        ctaText: landingSlides.ctaText,
        ctaHref: landingSlides.ctaHref,
        cta2Text: landingSlides.cta2Text,
        cta2Href: landingSlides.cta2Href,
        accentColor: landingSlides.accentColor,
        image: landingSlides.image,
        isActive: landingSlides.isActive,
        sortOrder: landingSlides.sortOrder,
      })
      .from(landingSlides)
      .where(eq(landingSlides.isActive, true))
      .orderBy(asc(landingSlides.sortOrder))) as Array<{
      id: string;
      badge: string | null;
      title: string;
      subtitle: string | null;
      ctaText: string | null;
      ctaHref: string | null;
      cta2Text: string | null;
      cta2Href: string | null;
      accentColor: string | null;
      image: string | null;
      isActive: boolean;
      sortOrder: number;
    }>;

    if (rows.length === 0) return DEFAULT_SLIDES;
    return rows.map((r) => ({
      id: r.id,
      badge: r.badge,
      title: r.title,
      subtitle: r.subtitle,
      ctaText: r.ctaText,
      ctaHref: r.ctaHref,
      cta2Text: r.cta2Text,
      cta2Href: r.cta2Href,
      accentColor: r.accentColor,
      image: r.image,
    }));
  } catch {
    return DEFAULT_SLIDES;
  }
}

export async function getLandingFeatures(): Promise<LandingFeature[]> {
  try {
    const rows = (await db
      .select({
        id: landingFeatures.id,
        icon: landingFeatures.icon,
        title: landingFeatures.title,
        desc: landingFeatures.desc,
        isActive: landingFeatures.isActive,
        sortOrder: landingFeatures.sortOrder,
      })
      .from(landingFeatures)
      .where(eq(landingFeatures.isActive, true))
      .orderBy(asc(landingFeatures.sortOrder))) as Array<{
      id: string;
      icon: string;
      title: string;
      desc: string | null;
      isActive: boolean;
      sortOrder: number;
    }>;

    if (rows.length === 0) return DEFAULT_FEATURES;
    return rows.map((r) => ({
      id: r.id,
      icon: r.icon,
      title: r.title,
      desc: r.desc,
    }));
  } catch {
    return DEFAULT_FEATURES;
  }
}
