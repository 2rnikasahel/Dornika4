"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrderTimelineItem {
  id: string;
  orderNumber: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  totalAmount: number;
  paymentMethod: string | null;
  createdAt: string; // ISO
}

interface OrderTimelineProps {
  orders: OrderTimelineItem[];
  emptyMessage?: string;
}

const STAGES: Array<{
  key: OrderTimelineItem["status"];
  label: string;
  icon: typeof Clock;
  color: string;
}> = [
  { key: "pending", label: "ثبت سفارش", icon: Clock, color: "text-amber-600" },
  { key: "confirmed", label: "تأیید سفارش", icon: CheckCircle2, color: "text-emerald-600" },
  { key: "processing", label: "در حال آماده‌سازی", icon: Loader2, color: "text-petrol-600" },
  { key: "shipped", label: "ارسال شده", icon: Truck, color: "text-petrol-700" },
  { key: "delivered", label: "تحویل شده", icon: CheckCircle2, color: "text-emerald-700" },
];

const FAILURE_STATUSES = new Set(["cancelled", "refunded"]);

function stageIndex(status: OrderTimelineItem["status"]): number {
  if (status === "cancelled" || status === "refunded") return -1;
  return STAGES.findIndex((s) => s.key === status);
}

/**
 * Vertical timeline of an order's lifecycle. Renders each order as a
 * separate row with its current stage highlighted.
 */
export function OrderTimeline({
  orders,
  emptyMessage = "سفارشی ثبت نشده است",
}: OrderTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    orders[0]?.id ?? null,
  );

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-navy-900/15 bg-white/60 p-12 text-center">
        <Package className="text-charcoal-300" size={40} />
        <p className="text-sm text-charcoal-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => {
        const idx = stageIndex(order.status);
        const failed = idx === -1;
        const expanded = expandedId === order.id;
        const date = new Date(order.createdAt);
        return (
          <div
            key={order.id}
            className="overflow-hidden rounded-2xl border border-navy-900/8 bg-white/80"
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : order.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-right transition hover:bg-navy-900/2"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full",
                    failed
                      ? "bg-rose-50 text-rose-600"
                      : "bg-petrol-500/10 text-petrol-700",
                  )}
                >
                  {failed ? (
                    <XCircle size={16} />
                  ) : (
                    <Package size={16} />
                  )}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-navy-900" dir="ltr">
                    {order.orderNumber}
                  </span>
                  <span className="text-[10px] text-charcoal-500">
                    {date.toLocaleDateString("fa-IR")} -{" "}
                    {date.toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-sm font-extrabold text-navy-900">
                  {new Intl.NumberFormat("fa-IR").format(
                    Math.round(Number(order.totalAmount) || 0),
                  )}{" "}
                  ریال
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    failed
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  {failed
                    ? order.status === "cancelled"
                      ? "لغو شده"
                      : "برگشت خورده"
                    : STAGES[idx]?.label ?? "در حال پردازش"}
                </span>
              </div>
            </button>

            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-t border-navy-900/6 p-4"
              >
                {failed ? (
                  <p className="text-xs text-rose-600">
                    این سفارش {order.status === "cancelled" ? "لغو" : "برگشت"} شده است.
                  </p>
                ) : (
                  <ol className="relative flex flex-col gap-3 pr-6">
                    {STAGES.map((stage, i) => {
                      const Icon = stage.icon;
                      const reached = i <= idx;
                      const isCurrent = i === idx;
                      return (
                        <li key={stage.key} className="relative flex items-start gap-3">
                          <span
                            className={cn(
                              "absolute right-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full",
                              reached
                                ? "bg-petrol-500 text-white"
                                : "bg-navy-900/8 text-charcoal-400",
                              isCurrent && "ring-2 ring-petrol-300 ring-offset-1",
                            )}
                          >
                            <Icon
                              size={10}
                              className={
                                stage.key === "processing" && isCurrent
                                  ? "animate-spin"
                                  : ""
                              }
                            />
                          </span>
                          {i < STAGES.length - 1 && (
                            <span
                              className={cn(
                                "absolute right-[9px] top-6 h-4 w-0.5",
                                i < idx ? "bg-petrol-500" : "bg-navy-900/8",
                              )}
                            />
                          )}
                          <div className="flex-1 pr-2">
                            <p
                              className={cn(
                                "text-xs font-semibold",
                                reached ? "text-navy-900" : "text-charcoal-400",
                              )}
                            >
                              {stage.label}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default OrderTimeline;
