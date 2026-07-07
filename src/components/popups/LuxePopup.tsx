"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LuxePopupProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left" | "center";
  width?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Glass-effect slide-in popup. Mounts via a portal at document.body
 * so it overlays the whole page. Closes on backdrop click + Escape.
 *
 * Includes a top "drag handle" pill (visual only) and an internal
 * scroll area for content that overflows.
 */
export function LuxePopup({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  width = "md",
  className,
}: LuxePopupProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const widthClass =
    width === "lg"
      ? "sm:max-w-3xl"
      : width === "sm"
        ? "sm:max-w-sm"
        : "sm:max-w-lg";

  const sideClass =
    side === "left"
      ? "sm:items-stretch sm:justify-start"
      : side === "center"
        ? "sm:items-center sm:justify-center"
        : "sm:items-stretch sm:justify-end";

  const initialX = side === "left" ? "100%" : side === "right" ? "-100%" : 0;
  const initialY = side === "center" ? 40 : 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex flex-col justify-end sm:flex-row",
            sideClass,
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, x: initialX, y: initialY }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: initialX, y: initialY }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-navy-900/8 bg-pearl-100/95 shadow-luxe backdrop-blur-2xl sm:rounded-3xl sm:bg-white/85",
              widthClass,
              className,
            )}
          >
            {/* Drag handle (mobile) */}
            <div className="flex shrink-0 justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-12 rounded-full bg-navy-900/15" />
            </div>

            {/* Header */}
            {(title || true) && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-navy-900/6 px-5 py-4">
                <div className="min-w-0 flex-1 truncate text-sm font-bold text-navy-900 sm:text-base">
                  {title}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="بستن"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy-900/5 text-charcoal-700 transition hover:bg-navy-900/10"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>

            {/* Optional footer */}
            {footer && (
              <div className="shrink-0 border-t border-navy-900/6 bg-white/60 px-5 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default LuxePopup;
