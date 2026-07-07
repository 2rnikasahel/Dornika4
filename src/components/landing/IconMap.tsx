"use client";

import {
  Package,
  Sparkles,
  Building2,
  ShieldCheck,
  Truck,
  Headphones,
  type LucideIcon,
} from "lucide-react";

interface IconMapProps {
  name: string;
  className?: string;
  size?: number;
}

const MAP: Record<string, LucideIcon> = {
  package: Package,
  sparkles: Sparkles,
  building: Building2,
  shield: ShieldCheck,
  truck: Truck,
  headphones: Headphones,
  ai: Sparkles,
  b2b: Building2,
  secure: ShieldCheck,
  variants: Package,
};

/**
 * Maps a feature icon name (stored in the DB) to a Lucide icon
 * component. Falls back to `Sparkles` when the name isn't recognised.
 */
export function IconMap({ name, className, size = 28 }: IconMapProps) {
  const Icon = MAP[name?.toLowerCase()] ?? Sparkles;
  return <Icon className={className} size={size} aria-hidden="true" />;
}

export default IconMap;
