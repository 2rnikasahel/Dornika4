import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

import { getI18n } from "@/lib/i18n/server";
import { localeDirection } from "@/lib/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import {
  readOrGenerateSessionToken,
  getCommerceCounts,
} from "@/lib/commerce";

import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileNavWithPopups } from "@/components/layout/MobileNavWithPopups";
import { SessionInitializer } from "@/components/layout/SessionInitializer";
import { ChatWidget } from "@/components/chat/ChatWidget";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "درنیکا ساحل | مرجع تخصصی تجهیزات صنعتی و تأسیسات",
  description:
    "درنیکا ساحل — پلتفرم هوشمند تأمین تجهیزات صنعتی، تأسیسات و مواد اولیه با دستیار هوش مصنوعی، استعلام قیمت آنی و حساب B2B.",
  applicationName: "درنیکا ساحل",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "درنیکا ساحل",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/logo/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo/logo.svg" }],
  },
  keywords: [
    "تجهیزات صنعتی",
    "تأسیسات",
    "درنیکا ساحل",
    "تأمین قطعات",
    "B2B",
    "استعلام قیمت",
  ],
  authors: [{ name: "میلاد قلی‌پور" }],
};

export const viewport: Viewport = {
  themeColor: "#05101d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getI18n();
  const dir = localeDirection[locale] ?? "rtl";

  const user = await getCurrentUser();
  const { token: sessionToken, generated } = await readOrGenerateSessionToken();
  const counts = await getCommerceCounts(sessionToken);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const userName = user?.name || user?.username || user?.phone || null;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} antialiased bg-pearl-100 text-charcoal-900`}
      >
        <SmoothScroll />
        <div className="relative flex min-h-screen flex-col">
          <Navbar
            locale={locale}
            t={t}
            cartCount={counts.cartCount}
            wishlistCount={counts.wishlistCount}
            userName={userName}
            userRole={user?.role ?? null}
            isAdmin={isAdmin}
          />
          <AuroraBackground />
          <main className="relative z-10 flex-1 pt-44 sm:pt-48">
            {children}
          </main>
          <Footer locale={locale} />
        </div>

        <ChatWidget locale={locale} />
        <SessionInitializer generated={generated} />
        <MobileNavWithPopups
          cartCount={counts.cartCount}
          wishlistCount={counts.wishlistCount}
          isLoggedIn={!!user}
          userName={userName}
          searchPlaceholder={t?.search?.placeholder}
        />
        <Toaster />
      </body>
    </html>
  );
}
