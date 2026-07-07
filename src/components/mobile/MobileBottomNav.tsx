"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { AutoCompleteSearch } from "@/components/layout/AutoCompleteSearch";

interface MobileBottomNavProps {
  cartCount: number;
  wishlistCount: number;
  isLoggedIn?: boolean;
  userName?: string | null;
  onAuthClick?: () => void;
  onCartClick?: () => void;
  onWishlistClick?: () => void;
  searchPlaceholder?: string;
}

const TABS = [
  { id: "home", href: "/", icon: Home, label: "خانه" },
  { id: "search", href: "#search", icon: Search, label: "جستجو" },
  { id: "cart", href: "#cart", icon: ShoppingCart, label: "سبد" },
  { id: "wishlist", href: "#wishlist", icon: Heart, label: "علاقه‌مندی" },
  { id: "profile", href: "#profile", icon: User, label: "حساب" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Mobile bottom navigation — 5 tabs (home, search, cart, wishlist,
 * profile). The search tab opens a full-screen overlay containing the
 * AutoCompleteSearch component. The other tabs either navigate (home)
 * or invoke a callback (cart / wishlist / profile) so the parent can
 * open the relevant popup.
 */
export function MobileBottomNav({
  cartCount,
  wishlistCount,
  isLoggedIn,
  userName,
  onAuthClick,
  onCartClick,
  onWishlistClick,
  searchPlaceholder,
}: MobileBottomNavProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  function onClick(tab: TabId) {
    switch (tab) {
      case "home":
        // Navigate via Link
        break;
      case "search":
        setSearchOpen(true);
        break;
      case "cart":
        onCartClick?.();
        break;
      case "wishlist":
        onWishlistClick?.();
        break;
      case "profile":
        if (!isLoggedIn) onAuthClick?.();
        else router.push("/account");
        break;
    }
  }

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-900/8 bg-white/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map((tab) => {
            const active =
              tab.id === "home"
                ? pathname === "/"
                : false;
            const badge =
              tab.id === "cart"
                ? cartCount
                : tab.id === "wishlist"
                  ? wishlistCount
                  : 0;
            const isLink = tab.id === "home";
            const content = (
              <span
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                  active ? "text-petrol-600" : "text-charcoal-500",
                )}
              >
                <tab.icon size={20} />
                {tab.label}
                {badge > 0 && (
                  <span className="absolute right-1/2 top-1 inline-flex h-4 min-w-4 translate-x-3 items-center justify-center rounded-full bg-petrol-500 px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "۹۹+" : badge}
                  </span>
                )}
                {tab.id === "profile" && !isLoggedIn && userName === undefined && (
                  <span className="absolute right-1/2 top-1 h-2 w-2 translate-x-3 rounded-full bg-rose-500" />
                )}
              </span>
            );
            return (
              <li key={tab.id}>
                {isLink ? (
                  <Link href={tab.href} className="block w-full">
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => onClick(tab.id)}
                    className="block w-full"
                    aria-label={tab.label}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Full-screen search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-navy-900/95 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-semibold text-pearl-100">جستجو</span>
            <button
              type="button"
              aria-label="بستن"
              onClick={() => setSearchOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-pearl-100"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <AutoCompleteSearch
              placeholder={searchPlaceholder}
              className="w-full"
            />
            <p className="mt-6 text-center text-xs text-pearl-200/60">
              برای شروع جستجو چند حرف تایپ کنید.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileBottomNav;
