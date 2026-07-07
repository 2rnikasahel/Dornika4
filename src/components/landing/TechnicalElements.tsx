"use client";

import type { ReactElement } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Pre-computed trig values                                            */
/* ------------------------------------------------------------------ */
//
// To avoid hydration mismatches we MUST NOT call Math.cos / Math.sin /
// Math.random at render time. Instead we pre-compute a small lookup
// table of unit-circle samples (16 steps around the circle) and pick
// values by index. Drift amounts and rotation deltas are likewise
// constant literals derived from those samples at design time.
//
const TRIG: Array<{ c: number; s: number }> = [
  { c: 1.0, s: 0.0 },
  { c: 0.924, s: 0.383 },
  { c: 0.707, s: 0.707 },
  { c: 0.383, s: 0.924 },
  { c: 0.0, s: 1.0 },
  { c: -0.383, s: 0.924 },
  { c: -0.707, s: 0.707 },
  { c: -0.924, s: 0.383 },
  { c: -1.0, s: 0.0 },
  { c: -0.924, s: -0.383 },
  { c: -0.707, s: -0.707 },
  { c: -0.383, s: -0.924 },
  { c: 0.0, s: -1.0 },
  { c: 0.383, s: -0.924 },
  { c: 0.707, s: -0.707 },
  { c: 0.924, s: -0.383 },
];

// Hand-picked drift vectors (px) and rotation ranges (deg) — derived
// from the table above so they look organic but stay deterministic.
type FloatSpec = {
  dx: number;
  dy: number;
  rotate: number;
  duration: number;
};

const FLOAT_SPECS: FloatSpec[] = [
  { dx: TRIG[1].c * 14, dy: TRIG[1].s * 14, rotate: 6, duration: 18 },
  { dx: TRIG[4].c * 12, dy: TRIG[4].s * 12, rotate: -5, duration: 22 },
  { dx: TRIG[7].c * 10, dy: TRIG[7].s * 10, rotate: 4, duration: 20 },
  { dx: TRIG[10].c * 16, dy: TRIG[10].s * 16, rotate: -7, duration: 24 },
  { dx: TRIG[13].c * 12, dy: TRIG[13].s * 12, rotate: 5, duration: 19 },
];

/* ------------------------------------------------------------------ */
/* SVG line-art industrial elements                                    */
/* ------------------------------------------------------------------ */

const STROKE = "rgba(45,151,173,0.45)"; // petrol-500 / 45%
const STROKE_SOFT = "rgba(108,188,203,0.30)"; // petrol-300 / 30%

function GaugeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
      <circle cx="32" cy="34" r="22" stroke={STROKE} strokeWidth="1.4" />
      <circle cx="32" cy="34" r="18" stroke={STROKE_SOFT} strokeWidth="1" />
      <path d="M16 38 A18 18 0 0 1 48 38" stroke={STROKE} strokeWidth="1.2" />
      <line x1="32" y1="34" x2="44" y2="24" stroke={STROKE} strokeWidth="1.4" />
      <circle cx="32" cy="34" r="2" fill={STROKE} />
      <line x1="22" y1="46" x2="22" y2="50" stroke={STROKE} strokeWidth="1" />
      <line x1="32" y1="48" x2="32" y2="52" stroke={STROKE} strokeWidth="1" />
      <line x1="42" y1="46" x2="42" y2="50" stroke={STROKE} strokeWidth="1" />
    </svg>
  );
}

function GateValveIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
      <rect x="14" y="40" width="36" height="8" stroke={STROKE} strokeWidth="1.4" />
      <path d="M22 40 L22 28 L42 28 L42 40" stroke={STROKE} strokeWidth="1.4" />
      <line x1="32" y1="28" x2="32" y2="14" stroke={STROKE} strokeWidth="1.4" />
      <circle cx="32" cy="12" r="6" stroke={STROKE} strokeWidth="1.4" />
      <line x1="26" y1="12" x2="38" y2="12" stroke={STROKE_SOFT} strokeWidth="1" />
      <line x1="32" y1="6" x2="32" y2="18" stroke={STROKE_SOFT} strokeWidth="1" />
    </svg>
  );
}

function FlangeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
      <circle cx="32" cy="32" r="20" stroke={STROKE} strokeWidth="1.4" />
      <circle cx="32" cy="32" r="10" stroke={STROKE_SOFT} strokeWidth="1" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = TRIG[(i * 3) % TRIG.length];
        const x = 32 + t.c * 16;
        const y = 32 + t.s * 16;
        return (
          <circle key={i} cx={x} cy={y} r="2" stroke={STROKE} strokeWidth="1" />
        );
      })}
    </svg>
  );
}

function ElbowIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
      <path d="M14 32 L40 32 A12 12 0 0 1 52 44 L52 56" stroke={STROKE} strokeWidth="1.6" />
      <path d="M14 26 L40 26 A18 18 0 0 1 58 44 L58 56" stroke={STROKE_SOFT} strokeWidth="1" />
      <path d="M14 38 L40 38 A6 6 0 0 1 46 44 L46 56" stroke={STROKE_SOFT} strokeWidth="1" />
    </svg>
  );
}

function TeeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
      <line x1="10" y1="32" x2="54" y2="32" stroke={STROKE} strokeWidth="1.6" />
      <line x1="32" y1="32" x2="32" y2="56" stroke={STROKE} strokeWidth="1.6" />
      <line x1="10" y1="26" x2="54" y2="26" stroke={STROKE_SOFT} strokeWidth="1" />
      <line x1="10" y1="38" x2="54" y2="38" stroke={STROKE_SOFT} strokeWidth="1" />
      <line x1="38" y1="32" x2="38" y2="56" stroke={STROKE_SOFT} strokeWidth="1" />
      <line x1="26" y1="32" x2="26" y2="56" stroke={STROKE_SOFT} strokeWidth="1" />
    </svg>
  );
}

function PumpIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
      <circle cx="32" cy="32" r="14" stroke={STROKE} strokeWidth="1.4" />
      <circle cx="32" cy="32" r="6" stroke={STROKE_SOFT} strokeWidth="1" />
      <path d="M18 32 L8 32 M56 32 L46 32 M32 18 L32 8 M32 56 L32 46" stroke={STROKE} strokeWidth="1.4" />
      <path
        d="M24 24 L40 24 L40 40 L24 40 Z"
        stroke={STROKE_SOFT}
        strokeWidth="1"
      />
    </svg>
  );
}

function PipeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
      <rect x="4" y="24" width="56" height="16" stroke={STROKE} strokeWidth="1.4" />
      <line x1="4" y1="32" x2="60" y2="32" stroke={STROKE_SOFT} strokeWidth="1" strokeDasharray="3 4" />
      <line x1="14" y1="24" x2="14" y2="40" stroke={STROKE} strokeWidth="1" />
      <line x1="50" y1="24" x2="50" y2="40" stroke={STROKE} strokeWidth="1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

type ElementKind =
  | "gauge"
  | "valve"
  | "flange"
  | "elbow"
  | "tee"
  | "pump"
  | "pipe";

const ICONS: Record<ElementKind, () => ReactElement> = {
  gauge: GaugeIcon,
  valve: GateValveIcon,
  flange: FlangeIcon,
  elbow: ElbowIcon,
  tee: TeeIcon,
  pump: PumpIcon,
  pipe: PipeIcon,
};

interface FloatElement {
  kind: ElementKind;
  top: string;
  left: string;
  size: number;
  opacity: number;
  specIndex: number;
}

const LAYOUT: FloatElement[] = [
  { kind: "gauge", top: "12%", left: "8%", size: 84, opacity: 0.55, specIndex: 0 },
  { kind: "valve", top: "22%", left: "82%", size: 96, opacity: 0.5, specIndex: 1 },
  { kind: "flange", top: "60%", left: "12%", size: 78, opacity: 0.5, specIndex: 2 },
  { kind: "elbow", top: "68%", left: "78%", size: 88, opacity: 0.55, specIndex: 3 },
  { kind: "tee", top: "38%", left: "46%", size: 72, opacity: 0.35, specIndex: 4 },
  { kind: "pump", top: "82%", left: "44%", size: 96, opacity: 0.4, specIndex: 0 },
  { kind: "pipe", top: "6%", left: "48%", size: 110, opacity: 0.3, specIndex: 2 },
];

/**
 * SVG line-art industrial elements (gauge, valve, flange, elbow, tee,
 * pump, pipe) that float slowly across the background of the hero.
 *
 * All motion values are derived from a pre-computed trig table so the
 * server-rendered markup matches the client's first paint (no
 * hydration mismatch).
 */
export function TechnicalElements() {
  const prefersReduced = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {LAYOUT.map((el, idx) => {
        const Icon = ICONS[el.kind];
        const spec = FLOAT_SPECS[el.specIndex % FLOAT_SPECS.length];
        const animate = prefersReduced
          ? {}
          : {
              x: [0, spec.dx, 0],
              y: [0, spec.dy, 0],
              rotate: [0, spec.rotate, 0],
            };
        return (
          <motion.div
            key={`${el.kind}-${idx}`}
            className="absolute"
            style={{
              top: el.top,
              left: el.left,
              width: el.size,
              height: el.size,
              opacity: el.opacity,
            }}
            animate={animate}
            transition={{
              duration: spec.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Icon />
          </motion.div>
        );
      })}
    </div>
  );
}

export default TechnicalElements;
