"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "ghost" | "outline" | "default";
}

/**
 * Toggles between `fa` and `en` by setting the locale cookie and
 * reloading the page so the server re-renders with the new dictionary.
 */
export function LanguageSwitcher({
  className,
  variant = "ghost",
}: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(() => {
      // Read current locale from <html lang="…">
      const current = document.documentElement.lang || "fa";
      const next = current === "fa" ? "en" : "fa";
      document.cookie = `dornika_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
      document.documentElement.lang = next;
      document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
      router.refresh();
      // Force a full reload so server components pick up the new cookie.
      window.location.reload();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      onClick={toggle}
      disabled={isPending}
      aria-label="Toggle language"
      className={cn("h-9 w-9", className)}
    >
      <Globe className="h-4 w-4" />
    </Button>
  );
}

export default LanguageSwitcher;
