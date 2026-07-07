"use client";

import { useState } from "react";

import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { CartPopup } from "@/components/popups/CartPopup";
import { WishlistPopup } from "@/components/popups/WishlistPopup";
import { AuthPopup } from "@/components/popups/AuthPopup";

interface MobileNavWithPopupsProps {
  cartCount: number;
  wishlistCount: number;
  isLoggedIn: boolean;
  userName: string | null;
  searchPlaceholder?: string;
}

/**
 * Client-side wrapper around MobileBottomNav that owns the popup state
 * (cart / wishlist / auth) so the server-side root layout can stay a
 * server component.
 */
export function MobileNavWithPopups({
  cartCount,
  wishlistCount,
  isLoggedIn,
  userName,
  searchPlaceholder,
}: MobileNavWithPopupsProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <MobileBottomNav
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        isLoggedIn={isLoggedIn}
        userName={userName}
        onCartClick={() => setCartOpen(true)}
        onWishlistClick={() => setWishOpen(true)}
        onAuthClick={() => setAuthOpen(true)}
        searchPlaceholder={searchPlaceholder}
      />
      <CartPopup open={cartOpen} onClose={() => setCartOpen(false)} />
      <WishlistPopup open={wishOpen} onClose={() => setWishOpen(false)} />
      <AuthPopup open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export default MobileNavWithPopups;
