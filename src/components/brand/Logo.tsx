import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "white" | "dark";
  className?: string;
  showWordmark?: boolean;
  size?: number;
}

/**
 * Brand logo for "درنیکا ساحل" (Dornika Sahel).
 *
 * Renders the SVG mark + bilingual wordmark. The `variant` prop
 * toggles between the white (for dark backgrounds) and dark mark.
 */
export function Logo({
  variant = "dark",
  className,
  showWordmark = true,
  size = 40,
}: LogoProps) {
  const src = variant === "white" ? "/logo/logo.svg" : "/logo/logo.svg";
  // We currently ship a single logo.svg; both variants fall back to it
  // so the build never breaks on a missing file. Replace `src` with
  // `/logo/logo-white.svg` once the white variant is published.
  const markSrc = "/logo/logo.svg";
  void src;
  const wordmarkColor =
    variant === "white" ? "text-pearl-100" : "text-navy-900";
  const subColor = variant === "white" ? "text-petrol-300" : "text-petrol-600";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 select-none",
        className,
      )}
    >
      <Image
        src={markSrc}
        alt="درنیکا ساحل"
        width={size}
        height={size}
        priority
        className="shrink-0"
      />
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-extrabold text-base sm:text-lg tracking-tight",
              wordmarkColor,
            )}
          >
            درنیکا ساحل
          </span>
          <span
            className={cn(
              "text-[10px] sm:text-[11px] font-medium tracking-[0.2em] uppercase mt-0.5",
              subColor,
            )}
            dir="ltr"
          >
            Dornika Sahel
          </span>
        </span>
      )}
    </span>
  );
}

export default Logo;
