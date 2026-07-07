"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
}

/**
 * 3D-tilt card. Tracks pointer position over the card and applies a
 * perspective rotation + slight scale-up on hover. Respects reduced
 * motion (renders a static card in that case).
 */
export function TiltCard({
  children,
  className,
  maxTilt = 8,
  scale = 1.02,
}: TiltCardProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const sx = useSpring(px, { stiffness: 200, damping: 18 });
  const sy = useSpring(py, { stiffness: 200, damping: 18 });

  const rotateX = useTransform(sy, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(sx, [0, 1], [-maxTilt, maxTilt]);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default TiltCard;
