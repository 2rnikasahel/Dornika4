"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Settings,
  LogOut,
  Package,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { MegaMenu } from "./MegaMenu";
import { AutoCompleteSearch } from "./AutoCompleteSearch";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { CartPopup } from "@/components/popups/CartPopup";
import { WishlistPopup } from "@/components/popups/WishlistPopup";
import { AuthPopup } from "@/components/popups/AuthPopup";
import { LogoutButton } from "@/components/auth/LogoutButton";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  locale: string;
  t: Record<string, any>;
  cartCount: number;
  wishlistCount: number;
  userName?: string | null;
  userRole?: string | null;
  isAdmin?: boolean;
}

export function Navbar({
  locale,
  t,
  cartCount,
  wishlistCount,
  userName,
  userRole,
  isAdmin,
}: NavbarProps) {
  const pathname = usePathname() || "/";
  const [scrolled, setScrolled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu whenever the pathname changes. We use the
  // store-and-compare pattern (instead of an effect) so we don't
  // trigger a cascading render.
  const [storedPath, setStoredPath] = useState(pathname);
  if (pathname !== storedPath) {
    setStoredPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = (t?.nav ?? {}) as Record<string, string>;

  const links: { href: string; label: string }[] = [
    { href: "/", label: nav.home ?? "خانه" },
    { href: "/shop", label: nav.shop ?? "فروشگاه" },
    { href: "/blog", label: nav.blog ?? "بلاگ" },
    { href: "/contact", label: nav.contact ?? "تماس" },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50",
        scrolled ? "header-scrolled" : "header-top",
      )}
    >
      {/* Top row: logo + mobile buttons */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="درنیکا ساحل">
          <Logo variant="white" size={36} />
        </Link>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher className="text-pearl-100 hover:bg-white/10" />
          <button
            type="button"
            aria-label="جستجو"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-pearl-100 transition hover:bg-white/10 lg:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Search size={18} />}
          </button>
          <button
            type="button"
            aria-label="منو"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-pearl-100 transition hover:bg-white/10 lg:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Bottom row (desktop) */}
      <div className="hidden border-t border-white/10 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <MegaMenu
            locale={locale}
            labels={{
              categories: nav.categories ?? "دسته‌بندی‌ها",
              all: nav.all ?? "همه",
              support: t?.footer?.support ?? "پشتیبانی",
              phone: "+98 21 0000 0000",
              email: "info@dornikasahel.ir",
            }}
          />

          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition",
                  isActive(l.href)
                    ? "bg-white/15 text-pearl-100"
                    : "text-pearl-100/80 hover:bg-white/10 hover:text-pearl-100",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1 px-2">
            <AutoCompleteSearch placeholder={t?.search?.placeholder} />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWishOpen(true)}
              aria-label={nav.wishlist ?? "علاقه‌مندی"}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-pearl-100 transition hover:bg-white/10"
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <Badge>{wishlistCount}</Badge>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={nav.cart ?? "سبد خرید"}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-pearl-100 transition hover:bg-white/10"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && <Badge>{cartCount}</Badge>}
            </button>

            {userName ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-sm font-medium text-pearl-100 transition hover:bg-white/15"
                  >
                    <User size={16} />
                    <span className="hidden max-w-[8rem] truncate sm:inline">
                      {userName}
                    </span>
                    <ChevronDown size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56"
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">{userName}</span>
                    <span className="text-xs text-charcoal-500">
                      {userRole ?? "customer"}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <User size={14} />
                      حساب کاربری
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">
                      <Package size={14} />
                      سفارش‌ها
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/settings">
                      <Settings size={14} />
                      تنظیمات
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <LayoutDashboard size={14} />
                          پنل مدیریت
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <LogoutButton />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => setAuthOpen(true)}
                className="gap-1.5 bg-petrol-500 text-white hover:bg-petrol-600"
              >
                <User size={14} />
                {t?.nav?.login ?? "ورود"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-navy-900/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <AutoCompleteSearch placeholder={t?.search?.placeholder} />
          <nav className="mt-3 grid grid-cols-2 gap-1.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium",
                  isActive(l.href)
                    ? "bg-white/15 text-pearl-100"
                    : "text-pearl-100/80 hover:bg-white/10",
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/shop"
              className="rounded-xl px-3 py-2 text-sm font-medium text-pearl-100/80 hover:bg-white/10"
            >
              {nav.categories ?? "دسته‌بندی‌ها"}
            </Link>
            {!userName && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setAuthOpen(true);
                }}
                className="rounded-xl bg-petrol-500 px-3 py-2 text-sm font-medium text-white"
              >
                {t?.nav?.login ?? "ورود"}
              </button>
            )}
          </nav>
        </div>
      )}

      <CartPopup open={cartOpen} onClose={() => setCartOpen(false)} />
      <WishlistPopup open={wishOpen} onClose={() => setWishOpen(false)} />
      <AuthPopup open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-petrol-300 px-1 text-[10px] font-bold text-navy-900">
      {children}
    </span>
  );
}

export default Navbar;
