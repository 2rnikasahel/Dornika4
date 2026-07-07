import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { SocialIcon, SOCIAL_LINKS } from "@/components/ui/SocialIcons";

interface FooterProps {
  locale?: string;
}

const FOOTER_LINKS: Array<{ href: string; label: string }> = [
  { href: "/shop", label: "فروشگاه" },
  { href: "/shop?categories", label: "دسته‌بندی محصولات" },
  { href: "/finder", label: "جستجوی هوشمند" },
  { href: "/blog", label: "بلاگ" },
  { href: "/quote", label: "درخواست استعلام" },
  { href: "/contractors", label: "پیمانکاران" },
  { href: "/contact", label: "تماس با ما" },
];

/**
 * Site footer — server component. Renders brand, tagline, social icons,
 * eNamad placeholder, footer links and the "Built by Milad Gholipour"
 * credit at the bottom.
 */
export function Footer({ locale: _locale = "fa" }: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-navy-900/8 bg-gradient-to-b from-navy-900 to-charcoal-900 text-pearl-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Logo variant="white" size={40} />
            <p className="text-sm leading-relaxed text-pearl-200/70">
              مرجع تخصصی تجهیزات صنعتی و تأسیسات — تأمین هوشمند قطعات و
              مواد اولیه با فناوری هوش مصنوعی.
            </p>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-pearl-100 transition hover:bg-white/15"
                >
                  <SocialIcon name={s.name} size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-pearl-100">دسترسی سریع</h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-pearl-200/70 transition hover:text-petrol-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* eNamad + contact */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-pearl-100">اعتماد و امنیت</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-center text-[10px] text-pearl-200/70">
                نماد
                <br />
                اعتماد
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-center text-[10px] text-pearl-200/70">
                ساماندهی
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-center text-[10px] text-pearl-200/70">
                SSL
                <br />
                Secure
              </div>
            </div>
            <p className="text-xs text-pearl-200/60" dir="ltr">
              info@dornikasahel.ir · 021-00000000
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-pearl-200/60 sm:flex-row">
          <p>© {year} درنیکا ساحل — تمامی حقوق محفوظ است.</p>
          <p>
            ساخته شده توسط{" "}
            <span className="font-semibold text-petrol-300">میلاد قلی‌پور</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
