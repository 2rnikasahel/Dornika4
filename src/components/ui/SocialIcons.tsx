import {
  Instagram,
  Send,
  Linkedin,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SocialIconProps {
  name: "instagram" | "telegram" | "linkedin" | "phone";
  className?: string;
  size?: number;
}

const ICONS: Record<SocialIconProps["name"], LucideIcon> = {
  instagram: Instagram,
  telegram: Send,
  linkedin: Linkedin,
  phone: Phone,
};

export function SocialIcon({ name, className, size = 18 }: SocialIconProps) {
  const Icon = ICONS[name];
  return <Icon className={cn(className)} size={size} aria-hidden="true" />;
}

export const SOCIAL_LINKS: Array<{
  name: SocialIconProps["name"];
  href: string;
  label: string;
}> = [
  { name: "instagram", href: "https://instagram.com", label: "Instagram" },
  { name: "telegram", href: "https://t.me", label: "Telegram" },
  { name: "linkedin", href: "https://linkedin.com", label: "LinkedIn" },
  { name: "phone", href: "tel:+982100000000", label: "Phone" },
];

export default SocialIcon;
