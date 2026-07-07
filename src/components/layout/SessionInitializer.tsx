"use client";

import { useEffect } from "react";

interface SessionInitializerProps {
  /** When true, mint a fresh session cookie on mount. */
  generated: boolean;
}

/**
 * Tiny client-side component that, when `generated` is true, fires a
 * POST to `/api/session/init` to mint a real session cookie. The
 * server layout generates an ephemeral token only for read-only use
 * during SSR; this component ensures subsequent requests carry the
 * cookie so cart/wishlist operations actually persist.
 *
 * Renders nothing.
 */
export function SessionInitializer({ generated }: SessionInitializerProps) {
  useEffect(() => {
    if (!generated) return;
    void fetch("/api/session/init", { method: "POST" }).catch(() => {});
  }, [generated]);

  return null;
}

export default SessionInitializer;
