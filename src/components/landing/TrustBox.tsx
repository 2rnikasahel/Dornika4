"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  Truck,
  Award,
  Headphones,
  CreditCard,
  Factory,
} from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "ضمانت اصالت کالا",
    desc: "تأیید شده توسط کارشناسان فنی",
  },
  {
    icon: Truck,
    title: "ارسال سریع",
    desc: "به سراسر ایران در کوتاه‌ترین زمان",
  },
  {
    icon: Award,
    title: "کیفیت تضمینی",
    desc: "تأمین از برندهای معتبر داخلی و خارجی",
  },
  {
    icon: CreditCard,
    title: "پرداخت امن",
    desc: "اتصال به درگاه‌های معتبر بانکی",
  },
  {
    icon: Factory,
    title: "تأمین B2B",
    desc: "حساب سازمانی و صورت‌حساب رسمی",
  },
  {
    icon: Headphones,
    title: "پشتیبانی تخصصی",
    desc: "کارشناسان فنی در دسترس شما",
  },
];

/**
 * Trust badges strip shown just below the hero. Animated reveal of
 * each badge with a stagger.
 */
export function TrustBox() {
  const prefersReduced = useReducedMotion();
  return (
    <section
      aria-label="trust badges"
      className="relative z-10 mx-auto -mt-8 w-full max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-navy-900/8 bg-white/80 p-4 shadow-luxe backdrop-blur-md sm:grid-cols-3 sm:gap-4 sm:p-6 lg:grid-cols-6">
        {ITEMS.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: idx * 0.06,
              ease: "easeOut",
            }}
            className="flex items-start gap-3 px-2 py-2 sm:items-center"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-petrol-500/10 text-petrol-600">
              <item.icon size={18} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-bold text-navy-900 sm:text-sm">
                {item.title}
              </span>
              <span className="text-[10px] text-charcoal-500 sm:text-xs">
                {item.desc}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default TrustBox;
