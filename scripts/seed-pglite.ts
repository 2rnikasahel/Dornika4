import "dotenv/config";
import crypto from "node:crypto";
import { getDb } from "../src/db/index";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const db = await getDb();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512");
  return `pbkdf2$10000$${salt.toString("base64")}$${hash.toString("base64")}`;
}

console.log("🌱 Seeding...");

// Super admin
const adminUsername = "admin", adminPass = "Dornika@1403";
let existing = await db.select().from(schema.users).where(eq(schema.users.username, adminUsername)).limit(1);
if (existing.length === 0) {
  existing = await db.select().from(schema.users).where(eq(schema.users.phone, "09123456789")).limit(1);
}
if (existing.length === 0) {
  await db.insert(schema.users).values({ username: adminUsername, phone: "09123456789", email: "admin@dornika.ir", name: "میلاد قلی‌پور", passwordHash: hashPassword(adminPass), role: "super_admin", isActive: true });
  console.log("  ✓ Super admin created");
} else {
  await db.update(schema.users).set({ username: adminUsername, passwordHash: hashPassword(adminPass), role: "super_admin", email: "admin@dornika.ir", phone: "09123456789", name: "میلاد قلی‌پور", isActive: true }).where(eq(schema.users.id, existing[0].id));
  console.log("  → Super admin updated");
}

// Categories
const cats = [
  { slug: "valves", title: "شیرآلات صنعتی", sort: 1, children: [{ slug: "gate-valves", title: "شیر دروازه‌ای" }, { slug: "ball-valves", title: "شیر توپی" }, { slug: "check-valves", title: "شیر یک‌طرفه" }] },
  { slug: "pumps", title: "پمپ‌ها", sort: 2, children: [{ slug: "centrifugal-pumps", title: "سانتریفیوژ" }, { slug: "submersible-pumps", title: "غوطه‌ور" }] },
  { slug: "pipes", title: "لوله‌ها و اتصالات", sort: 3, children: [{ slug: "steel-pipes", title: "فولادی" }, { slug: "fittings", title: "اتصالات" }] },
  { slug: "hvac", title: "تأسیسات حرارتی", sort: 4, children: [{ slug: "chillers", title: "چیلرها" }] },
  { slug: "instrumentation", title: "ابزار دقیق", sort: 5, children: [{ slug: "pressure-gauges", title: "فشارسنج‌ها" }] },
  { slug: "electrical", title: "تجهیزات الکتریکی", sort: 6, children: [{ slug: "control-panels", title: "تابلوهای کنترل" }] },
];
const catIds: Record<string, number> = {};
for (const c of cats) {
  let [ex] = await db.select().from(schema.categories).where(eq(schema.categories.slug, c.slug)).limit(1);
  if (!ex) { [ex] = await db.insert(schema.categories).values({ slug: c.slug, title: c.title, sortOrder: c.sort, isActive: true }).returning(); }
  catIds[c.slug] = ex.id;
  for (const [i, sub] of c.children.entries()) {
    const [exSub] = await db.select().from(schema.categories).where(eq(schema.categories.slug, sub.slug)).limit(1);
    if (!exSub) await db.insert(schema.categories).values({ slug: sub.slug, title: sub.title, parentId: ex.id, sortOrder: i, isActive: true });
  }
}
console.log("  ✓ Categories seeded");

// Units
const units = [["meter","متر","Meter","m","length",1],["piece","عدد","Piece","عد","count",2],["device","دستگاه","Device","د","count",3],["kg","کیلوگرم","Kilogram","kg","mass",4],["liter","لیتر","Liter","L","volume",5],["bar","بار","Bar","bar","pressure",6],["kw","کیلووات","Kilowatt","kW","power",7],["ampere","آمپر","Ampere","A","electric",8],["volt","ولت","Volt","V","electric",9]];
for (const [slug,name,nameEn,symbol,cat,sort] of units) {
  const [ex] = await db.select().from(schema.units).where(eq(schema.units.slug, slug as string)).limit(1);
  if (!ex) await db.insert(schema.units).values({ slug: slug as string, name: name as string, nameEn: nameEn as string, symbol: symbol as string, category: cat as string, sortOrder: sort as number });
}
console.log("  ✓ Units seeded");

// Products
const prods = [
  { slug: "gate-valve-150-psi", title: "شیر دروازه‌ای ۱۵۰ PSI", subtitle: "بدنه فولادی، فلنج دار", cat: "valves", cover: "/products/gate-valve-150-psi.jpg", price: "1850000", variants: [{ sku: "GV-150-DN50", name: "DN50", price: "1850000", stock: 45 }, { sku: "GV-150-DN100", name: "DN100", price: "4250000", stock: 28 }] },
  { slug: "centrifugal-pump-5hp", title: "پمپ سانتریفیوژ ۵ اسب بخار", subtitle: "تک‌مرحله‌ای، بدنه چدنی", cat: "pumps", cover: "/products/centrifugal-pump-5hp.jpg", price: "28500000", variants: [{ sku: "CP-5HP", name: "استاندارد", price: "28500000", stock: 8 }] },
  { slug: "steel-pipe-dn100", title: "لوله فولادی DN100", subtitle: "گالوانیزه، ۶ متری", cat: "pipes", cover: "/products/steel-pipe-dn100.jpg", price: "3200000", variants: [{ sku: "SP-DN100-6M", name: "۶ متری", price: "3200000", stock: 120 }] },
  { slug: "chiller-30kw", title: "چیلر تراکمی ۳۰ کیلووات", subtitle: "خنک‌کننده هوایی", cat: "hvac", cover: "/products/chiller-30kw.jpg", price: "185000000", variants: [{ sku: "CH-30KW", name: "استاندارد", price: "185000000", stock: 3 }] },
  { slug: "pressure-gauge-100mm", title: "فشارسنج ۱۰۰ میلی‌متری", subtitle: "بدنه استیل، گلیسیرین‌دار", cat: "instrumentation", cover: "/products/pressure-gauge-100mm.jpg", price: "850000", variants: [{ sku: "PG-100-16BAR", name: "۰-۱۶ بار", price: "850000", stock: 80 }] },
  { slug: "control-panel-3phase", title: "تابلو کنترل سه‌فاز", subtitle: "IP54، با کنتاکتور", cat: "electrical", cover: "/products/control-panel-3phase.jpg", price: "4500000", variants: [{ sku: "CP-3PH-32A", name: "۳۲ آمپر", price: "4500000", stock: 18 }] },
];
for (const p of prods) {
  const [ex] = await db.select().from(schema.products).where(eq(schema.products.slug, p.slug)).limit(1);
  let pid: number;
  if (!ex) { const [ins] = await db.insert(schema.products).values({ slug: p.slug, title: p.title, subtitle: p.subtitle, categoryId: catIds[p.cat], coverImage: p.cover, images: [p.cover], isActive: true, status: "active", sortOrder: 0 }).returning(); pid = ins.id; }
  else { pid = ex.id; await db.update(schema.products).set({ coverImage: p.cover, images: [p.cover] }).where(eq(schema.products.id, pid)); }
  for (const v of p.variants) {
    const [exV] = await db.select().from(schema.productVariants).where(eq(schema.productVariants.sku, v.sku)).limit(1);
    if (!exV) await db.insert(schema.productVariants).values({ productId: pid, sku: v.sku, name: v.name, price: v.price, stock: v.stock, isActive: true });
  }
}
console.log("  ✓ Products seeded");

// Slides
const slides = [
  { badge: "محصولات جدید ۲۰۲۶", title: "تجهیزات صنعتی نسل نو", subtitle: "مرجع تخصصی تجهیزات صنعتی", ctaText: "مشاهده محصولات", ctaHref: "/shop", image: "/slides/industrial-pipes.jpg", sortOrder: 0 },
  { badge: "تخفیف ویژه", title: "شیرآلات صنعتی با ضمانت", subtitle: "تا ۲۵٪ تخفیف", ctaText: "خرید کنید", ctaHref: "/shop?cat=valves", image: "/slides/gate-valves.jpg", sortOrder: 1 },
  { badge: "تأسیسات حرفه‌ای", title: "چیلر و پمپ‌های صنعتی", subtitle: "راهکارهای تأسیسات", ctaText: "مشاهده", ctaHref: "/shop?cat=hvac", image: "/slides/control-panel.jpg", sortOrder: 2 },
];
for (const s of slides) {
  const [ex] = await db.select().from(schema.landingSlides).where(eq(schema.landingSlides.sortOrder, s.sortOrder)).limit(1);
  if (ex) await db.update(schema.landingSlides).set({ badge: s.badge, title: s.title, subtitle: s.subtitle, ctaText: s.ctaText, ctaHref: s.ctaHref, image: s.image, isActive: true }).where(eq(schema.landingSlides.id, ex.id));
  else await db.insert(schema.landingSlides).values({ ...s, isActive: true });
}
console.log("  ✓ Slides seeded");

// Features
const feats = [
  { icon: "ShieldCheck", title: "ضمانت اصالت کالا", desc: "تمام محصولات با گارانتی اصالت" },
  { icon: "Truck", title: "ارسال سراسری", desc: "تحویل سریع به تمام ایران" },
  { icon: "Headphones", title: "مشاوره تخصصی", desc: "کارشناسان فنی همراه شما" },
  { icon: "Wrench", title: "خدمات پس از فروش", desc: "نصب و راه‌اندازی" },
  { icon: "Globe", title: "واردات از برندهای معتبر", desc: "نماینده رسمی برندها" },
  { icon: "CreditCard", title: "پرداخت امن", desc: "درگاه‌های پرداخت معتبر" },
];
for (const [i, f] of feats.entries()) {
  const [ex] = await db.select().from(schema.landingFeatures).where(eq(schema.landingFeatures.sortOrder, i)).limit(1);
  if (!ex) await db.insert(schema.landingFeatures).values({ ...f, isActive: true, sortOrder: i });
}
console.log("  ✓ Features seeded");

// Settings
const settings = [
  { key: "site_name", value: "درنیکا ساحل", group: "general", locale: "fa", description: "نام سایت" },
  { key: "tagline", value: "مرجع تخصصی تجهیزات صنعتی و تأسیسات", group: "general", locale: "fa", description: "شعار" },
  { key: "currency", value: "ریال", group: "commerce", locale: "fa", description: "واحد پول" },
  { key: "footer_credit", value: "ساخته شده توسط میلاد قلی‌پور", group: "general", locale: "fa", description: "امضا" },
];
for (const s of settings) {
  const [ex] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, s.key)).limit(1);
  if (!ex) await db.insert(schema.siteSettings).values(s);
}
console.log("  ✓ Settings seeded");

console.log("\n✅ Seed complete!");
console.log("Username: admin | Password: Dornika@1403");
