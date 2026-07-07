"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  categories: Array<{ slug: string; title: string }>;
  initialCategory?: string;
}

/**
 * Legacy category dropdown. Kept for backward compatibility — the
 * `ShopFilters` component includes category selection inside the
 * filter bar. New code should use `ShopFilters` instead.
 */
export function CategoryFilter({
  categories,
  initialCategory = "all",
}: CategoryFilterProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(initialCategory);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCurrent(params.get("category") || "all");
  }, [params]);

  const active = categories.find((c) => c.slug === current);

  function select(slug: string) {
    setOpen(false);
    startTransition(() => {
      const sp = new URLSearchParams(params.toString());
      if (slug === "all") sp.delete("category");
      else sp.set("category", slug);
      const search = sp.toString();
      router.push(search ? `/shop?${search}` : "/shop");
    });
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        {active ? active.title : "همه دسته‌ها"}
        <ChevronDown size={14} className={cn("transition", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-navy-900/8 bg-white p-1 shadow-luxe">
          <button
            type="button"
            onClick={() => select("all")}
            className={cn(
              "block w-full rounded-lg px-3 py-1.5 text-right text-sm transition",
              current === "all"
                ? "bg-petrol-500/10 text-petrol-700"
                : "text-charcoal-700 hover:bg-navy-900/5",
            )}
          >
            همه دسته‌ها
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => select(c.slug)}
              className={cn(
                "block w-full rounded-lg px-3 py-1.5 text-right text-sm transition",
                current === c.slug
                  ? "bg-petrol-500/10 text-petrol-700"
                  : "text-charcoal-700 hover:bg-navy-900/5",
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
      {pending && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-charcoal-400">
          ...
        </span>
      )}
    </div>
  );
}

export default CategoryFilter;
