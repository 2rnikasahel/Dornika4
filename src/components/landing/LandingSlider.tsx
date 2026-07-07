"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { LandingSlide } from "@/lib/landing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LandingSliderProps {
  slides: LandingSlide[];
  intervalMs?: number;
}

/**
 * Full-bleed auto-advancing slider used on the homepage hero.
 * Each slide shows a badge, title, subtitle and up to two CTA
 * buttons. RTL-aware: chevrons swap direction automatically.
 */
export function LandingSlider({
  slides,
  intervalMs = 6500,
}: LandingSliderProps) {
  const prefersReduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const safeSlides = slides.length > 0 ? slides : [];

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(safeSlides.length, 1));
  }, [safeSlides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + safeSlides.length) % Math.max(safeSlides.length, 1));
  }, [safeSlides.length]);

  useEffect(() => {
    if (paused || prefersReduced || safeSlides.length <= 1) return;
    const t = setInterval(next, intervalMs);
    return () => clearInterval(t);
  }, [paused, prefersReduced, safeSlides.length, intervalMs, next]);

  if (safeSlides.length === 0) return null;

  const current = safeSlides[index];

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-navy-900/8 bg-gradient-to-br from-navy-900 via-navy-800 to-charcoal-900 shadow-luxe"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlights"
    >
      <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-10 lg:p-14"
          >
            {current.badge && (
              <span className="inline-flex w-fit items-center rounded-full border border-petrol-300/30 bg-petrol-300/10 px-3 py-1 text-xs font-semibold text-petrol-300">
                {current.badge}
              </span>
            )}
            <h2 className="max-w-3xl text-2xl font-extrabold leading-tight text-pearl-100 sm:text-3xl lg:text-5xl">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="max-w-2xl text-sm text-pearl-200/80 sm:text-base lg:text-lg">
                {current.subtitle}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              {current.ctaText && current.ctaHref && (
                <Button asChild size="lg">
                  <a href={current.ctaHref}>{current.ctaText}</a>
                </Button>
              )}
              {current.cta2Text && current.cta2Href && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-pearl-100/30 bg-transparent text-pearl-100 hover:bg-pearl-100/10 hover:text-pearl-100"
                >
                  <a href={current.cta2Href}>{current.cta2Text}</a>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      {safeSlides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute top-1/2 right-3 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-pearl-100 backdrop-blur-sm transition hover:bg-white/20 sm:right-5"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute top-1/2 left-3 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-pearl-100 backdrop-blur-sm transition hover:bg-white/20 sm:left-5"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {safeSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-petrol-300" : "w-1.5 bg-pearl-100/30",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LandingSlider;
