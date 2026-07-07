# Task Record — Dornika Sahel Landing/Layout Build

## Summary

Created the landing page, layout, navbar, and supporting components for the
"درنیکا ساحل" (Dornika Sahel) Next.js 16 project at `/home/z/my-project/`.

## Files Created

### Library / Data layer
- `src/lib/commerce.ts` — session token reader, cart page data,
  wishlist product IDs, combined counts
- `src/lib/shop.ts` — products, categories, category tree
- `src/lib/landing.ts` — slides + features with sensible Persian defaults

### App
- `src/app/layout.tsx` — server-component root layout with Vazirmatn font,
  Navbar, AuroraBackground, SmoothScroll, ChatWidget, MobileNavWithPopups,
  Footer, full metadata + viewport
- `src/app/page.tsx` — homepage (Hero, TrustBox, LandingSlider, featured
  products, features, CTA)
- `src/app/api/session/init/route.ts` — POST handler that mints the session
  cookie on first visit (the layout is a server component and cannot
  write cookies itself)

### Brand / UI primitives
- `src/components/brand/Logo.tsx`
- `src/components/ui/LanguageSwitcher.tsx`
- `src/components/ui/SocialIcons.tsx`

### Layout
- `src/components/layout/Navbar.tsx`
- `src/components/layout/MegaMenu.tsx`
- `src/components/layout/AutoCompleteSearch.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/MobileNavWithPopups.tsx` (client wrapper)
- `src/components/layout/SessionInitializer.tsx`

### Landing
- `src/components/landing/SmoothScroll.tsx` (Lenis)
- `src/components/landing/AuroraBackground.tsx`
- `src/components/landing/TechnicalElements.tsx` (pre-computed trig)
- `src/components/landing/three/FloatingElements3D.tsx` (R3F)
- `src/components/landing/Hero.tsx`
- `src/components/landing/Reveal.tsx`
- `src/components/landing/TiltCard.tsx`
- `src/components/landing/TrustBox.tsx`
- `src/components/landing/LandingSlider.tsx`
- `src/components/landing/IconMap.tsx`

### Popups
- `src/components/popups/LuxePopup.tsx`
- `src/components/popups/AuthPopup.tsx`
- `src/components/popups/CartPopup.tsx`
- `src/components/popups/WishlistPopup.tsx`

### Commerce / Auth / Chat / Mobile
- `src/components/commerce/WishlistToggleButton.tsx`
- `src/components/auth/LogoutButton.tsx`
- `src/components/chat/ChatWidget.tsx`
- `src/components/mobile/MobileBottomNav.tsx`

### Public
- `public/manifest.json` — PWA manifest, RTL, standalone
- `public/logo/logo.svg` — copy of logo into `/logo/` directory

## Notes / Decisions

1. **Session cookie**: Server Components can only *read* cookies via
   `cookies()`. So `readSessionToken` is read-only; the layout uses
   `readOrGenerateSessionToken` (returns `{ token, generated }`) and a
   tiny `<SessionInitializer>` client component POSTs to
   `/api/session/init` on first visit to mint the actual cookie.
2. **getWishlistProductIds return type**: schema uses text PKs, so the
   return type is `string[]` (the spec mentioned `number[]`, but text
   IDs are required by the schema).
3. **getCartPageData**: doesn't auto-create a cart row — it now returns
   an empty cart when the session has no cart yet, and the cart row is
   created lazily by the (future) `/api/cart` POST handler.
4. **TechnicalElements**: pre-computed trig table (16 sample points
   around the unit circle) is used for all drift / rotation values to
   avoid hydration mismatches.
5. **TSC and lint both pass** for our source code (only the unrelated
   `examples/` and `skills/` folders still emit TS errors).
6. The dev server logs a 500 for an early test request before the
   `cookies().set()` fix; the latest GETs return 200 in ~80-110ms.

## Verification

- `bunx tsc --noEmit` — clean for `src/**`
- `bun run lint` — clean
- `curl http://localhost:3000/` → HTTP 200, title is
  "درنیکا ساحل | مرجع تخصصی تجهیزات صنعتی و تأسیسات"
