"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth-scroll provider backed by Lenis.
 *
 * Mounted once near the root of the tree. Renders nothing — it only
 * sets up the global rAF loop that drives Lenis' smoothing.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Respect users who prefer reduced motion.
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}

export default SmoothScroll;
