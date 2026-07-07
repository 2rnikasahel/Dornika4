"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchHit {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  kind: "product" | "category";
}

interface AutoCompleteSearchProps {
  className?: string;
  placeholder?: string;
  onPick?: (hit: SearchHit) => void;
}

/**
 * Debounced autocomplete search input. Queries `/api/search?q=…` 250ms
 * after the user stops typing. Shows a dropdown of results.
 */
export function AutoCompleteSearch({
  className,
  placeholder = "جستجوی محصول، دسته یا کد SKU...",
  onPick,
}: AutoCompleteSearchProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { hits?: SearchHit[] };
        setHits(json.hits ?? []);
        setOpen(true);
        setActiveIndex(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[activeIndex];
      if (hit) pick(hit);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function pick(hit: SearchHit) {
    onPick?.(hit);
    setOpen(false);
    setQuery(hit.title);
    if (hit.kind === "category") {
      window.location.href = `/shop?category=${encodeURIComponent(hit.slug)}`;
    } else {
      window.location.href = `/shop/${hit.slug}`;
    }
  }

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-10 w-full rounded-full border border-navy-900/10 bg-white/80 pr-9 pl-9 text-sm text-navy-900 placeholder:text-charcoal-400 focus:border-petrol-500 focus:outline-none focus:ring-2 focus:ring-petrol-500/20"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-petrol-600"
          />
        )}
        {!loading && query && (
          <button
            type="button"
            aria-label="پاک کردن"
            onClick={() => {
              setQuery("");
              setHits([]);
              setOpen(false);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && hits.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-navy-900/8 bg-white/95 p-1 shadow-luxe backdrop-blur-md"
        >
          {hits.map((hit, idx) => (
            <li
              key={hit.id}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => pick(hit)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                idx === activeIndex
                  ? "bg-petrol-500/10 text-navy-900"
                  : "text-charcoal-700",
              )}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900/5 text-xs font-bold text-petrol-600">
                {hit.kind === "category" ? "د" : "P"}
              </span>
              <span className="flex flex-col">
                <span className="font-medium">{hit.title}</span>
                {hit.subtitle && (
                  <span className="text-xs text-charcoal-400">
                    {hit.subtitle}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutoCompleteSearch;
