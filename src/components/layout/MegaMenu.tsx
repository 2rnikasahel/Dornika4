"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Phone, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryNode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children: CategoryNode[];
}

interface MegaMenuProps {
  /** Active locale ("fa" / "en") */
  locale: string;
  /** Localized labels */
  labels: {
    categories: string;
    all: string;
    support: string;
    phone: string;
    email: string;
  };
}

/**
 * Two-column mega-menu dropdown.
 *
 * Right column: top-level category list (with "All" link at top).
 * Left column: subcategories of the currently-hovered parent.
 * Bottom: support info (phone + email) full width.
 *
 * Behaviour: opens on mouse enter, closes 200ms after mouse leave,
 * with a `pt-3` bridge between button and dropdown so the cursor
 * never crosses an empty gap.
 */
export function MegaMenu({ labels }: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const fetched = useRef(false);

  async function fetchTree() {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/categories?tree=1");
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { tree?: CategoryNode[] };
      const t = json.tree ?? [];
      setTree(t);
      if (t.length > 0) setActiveId(t[0].id);
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  }

  function enter() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
    void fetchTree();
  }

  function leave() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 200);
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const active = tree.find((n) => n.id === activeId) ?? null;

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-pearl-100/90 transition hover:bg-white/10 hover:text-pearl-100"
        aria-expanded={open}
      >
        {labels.categories}
        <ChevronLeft size={14} className="rotate-[-90deg]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 pt-3">
          <div className="w-[42rem] max-w-[90vw] overflow-hidden rounded-2xl border border-navy-900/8 bg-white/95 shadow-luxe backdrop-blur-xl">
            <div className="grid grid-cols-2">
              {/* Right column: parent categories */}
              <div className="border-l border-navy-900/6 bg-navy-900/2 p-2">
                <Link
                  href="/shop"
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition",
                    !activeId
                      ? "bg-petrol-500/15 text-petrol-700"
                      : "text-charcoal-700 hover:bg-navy-900/5",
                  )}
                >
                  {labels.all}
                  <ChevronLeft size={14} />
                </Link>
                {loading && (
                  <div className="flex items-center justify-center py-6 text-charcoal-400">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
                {!loading &&
                  tree.map((node) => (
                    <Link
                      key={node.id}
                      href={`/shop?category=${encodeURIComponent(node.slug)}`}
                      onMouseEnter={() => setActiveId(node.id)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                        activeId === node.id
                          ? "bg-petrol-500/15 font-semibold text-petrol-700"
                          : "text-charcoal-700 hover:bg-navy-900/5",
                      )}
                    >
                      {node.title}
                      <ChevronLeft size={14} />
                    </Link>
                  ))}
              </div>

              {/* Left column: subcategories of active parent */}
              <div className="max-h-80 overflow-y-auto p-2">
                {active && active.children.length > 0 ? (
                  active.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/shop?category=${encodeURIComponent(child.slug)}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm text-charcoal-700 transition hover:bg-navy-900/5 hover:text-petrol-700"
                    >
                      <span className="block font-medium">{child.title}</span>
                      {child.description && (
                        <span className="mt-0.5 block text-xs text-charcoal-400 line-clamp-1">
                          {child.description}
                        </span>
                      )}
                    </Link>
                  ))
                ) : (
                  <Link
                    href={active ? `/shop?category=${encodeURIComponent(active.slug)}` : "/shop"}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm text-charcoal-700 hover:bg-navy-900/5"
                  >
                    مشاهده همه محصولات این دسته
                  </Link>
                )}
              </div>
            </div>

            {/* Bottom: support info */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-navy-900/6 bg-navy-900/2 px-4 py-3 text-xs text-charcoal-600">
              <span className="font-semibold text-navy-900">
                {labels.support}:
              </span>
              <a
                href="tel:+982100000000"
                className="inline-flex items-center gap-1.5 hover:text-petrol-700"
                dir="ltr"
              >
                <Phone size={12} />
                {labels.phone}
              </a>
              <a
                href="mailto:info@dornikasahel.ir"
                className="inline-flex items-center gap-1.5 hover:text-petrol-700"
                dir="ltr"
              >
                <Mail size={12} />
                {labels.email}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MegaMenu;
