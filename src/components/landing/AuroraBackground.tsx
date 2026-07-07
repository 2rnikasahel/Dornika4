"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

import { FloatingElements3D } from "./three/FloatingElements3D";

/**
 * Aurora-style animated background for the homepage hero area.
 *
 * Layer composition (back → front):
 *   1. Pearl gradient base
 *   2. Four animated blur orbs that drift on a slow loop
 *   3. Grid dots overlay
 *   4. Horizontal gradient lines at 1/3 and 2/3 height
 *   5. (xl+ only) Lazy-loaded 3D floating industrial elements
 *
 * Mouse position drives a subtle parallax on the orb layer via spring
 * motion values. Respects prefers-reduced-motion.
 */
export function AuroraBackground() {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [show3D, setShow3D] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 18, mass: 0.6 });

  // Lazy-mount 3D scene only on xl+ screens to keep mobile buttery.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setShow3D(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (prefersReduced || typeof window === "undefined") return;
    function onMove(e: MouseEvent) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      mx.set((e.clientX / w - 0.5) * 2);
      my.set((e.clientY / h - 0.5) * 2);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, prefersReduced]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Pearl gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-pearl-50 via-pearl-100 to-pearl-200" />

      {/* Animated blur orbs */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: prefersReduced ? 0 : sx,
          y: prefersReduced ? 0 : sy,
        }}
      >
        <div className="absolute -top-32 -right-24 h-[40rem] w-[40rem] rounded-full bg-petrol-300/25 blur-3xl animate-aurora" />
        <div className="absolute top-1/4 -left-32 h-[36rem] w-[36rem] rounded-full bg-white/70 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 h-[28rem] w-[28rem] rounded-full bg-navy-500/12 blur-3xl animate-aurora" />
        <div className="absolute -bottom-24 -left-24 h-[32rem] w-[32rem] rounded-full bg-pearl-300/50 blur-3xl animate-float-slow" />
      </motion.div>

      {/* Grid dots overlay */}
      <div className="absolute inset-0 grid-dots-dark opacity-50" />

      {/* Horizontal gradient lines at 1/3 and 2/3 */}
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-navy-900/15 to-transparent" />
      <div className="absolute inset-x-0 top-2/3 h-px bg-gradient-to-r from-transparent via-petrol-500/20 to-transparent" />

      {/* 3D floating elements (xl+) */}
      {show3D && (
        <div className="absolute inset-0 hidden xl:block">
          <FloatingElements3D />
        </div>
      )}
    </div>
  );
}

export default AuroraBackground;
