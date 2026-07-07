"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Sparkles, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { TiltCard } from "./TiltCard";
import { TechnicalElements } from "./TechnicalElements";

interface HeroProps {
  badge: string;
  title: string;
  subtitle: string;
  cta1Text: string;
  cta1Href: string;
  cta2Text: string;
  cta2Href: string;
}

interface FloatingCardSpec {
  title: string;
  value: string;
  hint: string;
  top: string;
  side: "left" | "right";
  delay: number;
}

const FLOATING_CARDS: FloatingCardSpec[] = [
  {
    title: "محصول فعال",
    value: "۱٬۲۴۰+",
    hint: "در ۳۶ دسته‌بندی",
    top: "16%",
    side: "right",
    delay: 0.4,
  },
  {
    title: "استعلام آنی",
    value: "AI",
    hint: "پاسخ زیر ۲ ثانیه",
    top: "58%",
    side: "left",
    delay: 0.6,
  },
];

/**
 * Homepage hero — large headline + dual CTAs, with floating cards and
 * line-art industrial elements drifting in the background.
 */
export function Hero({
  badge,
  title,
  subtitle,
  cta1Text,
  cta1Href,
  cta2Text,
  cta2Href,
}: HeroProps) {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background line-art elements */}
      <TechnicalElements />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:grid-cols-12 lg:gap-8 lg:px-8">
        {/* Headline column */}
        <div className="lg:col-span-7">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-petrol-500/25 bg-petrol-500/10 px-4 py-1.5 text-xs font-semibold text-petrol-700">
              <Sparkles size={14} />
              {badge}
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-navy-900 sm:text-5xl lg:text-6xl">
              {title}
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-charcoal-700 sm:text-lg">
              {subtitle}
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href={cta1Href}>
                  {cta1Text}
                  <ArrowLeft size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href={cta2Href}>
                  <PhoneCall size={16} />
                  {cta2Text}
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* Floating cards column */}
        <div className="relative hidden h-[28rem] lg:col-span-5 lg:block">
          {FLOATING_CARDS.map((card, idx) => (
            <motion.div
              key={idx}
              initial={prefersReduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: card.delay, ease: "easeOut" }}
              className="absolute"
              style={{
                top: card.top,
                [card.side === "right" ? "right" : "left"]: 0,
              }}
            >
              <TiltCard className="block">
                <div className="w-60 rounded-2xl border border-navy-900/8 bg-white/85 p-5 shadow-luxe backdrop-blur-md">
                  <div className="text-xs font-medium text-charcoal-500">
                    {card.title}
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-navy-900">
                    {card.value}
                  </div>
                  <div className="mt-1 text-xs text-petrol-700">{card.hint}</div>
                </div>
              </TiltCard>
            </motion.div>
          ))}

          {/* Central decorative ring */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={
                prefersReduced
                  ? undefined
                  : { rotate: 360 }
              }
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="h-72 w-72 rounded-full border border-dashed border-petrol-500/20"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
