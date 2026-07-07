"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  ImagePlus,
  Sparkles,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  products?: Array<{ id: string; title: string; slug: string; price?: number }>;
  ts: number;
}

interface ChatWidgetProps {
  locale?: string;
}

const QUICK_REPLIES = [
  "استعلام قیمت",
  "مشاهده محصولات",
  "تماس با کارشناس",
  "پیگیری سفارش",
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "سلام! من دستیار هوشمند درنیکا ساحل هستم. چطور می‌تونم کمکتون کنم؟",
  ts: Date.now(),
};

/**
 * Floating chat button + slide-up panel.
 *
 * Features:
 *  - Welcome message on first open
 *  - Quick-reply suggestion buttons
 *  - Text + image sending (multipart/form-data to /api/chat)
 *  - Product suggestions rendered inline when the assistant returns
 *    `products` in the response payload
 */
export function ChatWidget({ locale: _locale = "fa" }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function send(text: string, imageFile?: File) {
    if ((!text && !imageFile) || sending) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setImagePreview(null);
    setSending(true);

    try {
      let res: Response;
      if (imageFile) {
        const fd = new FormData();
        fd.append("message", text);
        fd.append("image", imageFile);
        res = await fetch("/api/chat", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
      }
      if (!res.ok) throw new Error("failed");
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        products?: ChatMessage["products"];
        image?: string;
      };
      const botMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content:
          data.reply ??
          "متأسفم، الان نمی‌تونم پاسخ بدم. لطفاً کمی بعد دوباره تلاش کنید.",
        products: data.products,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: "خطا در ارتباط با سرور. لطفاً مجدداً تلاش کنید.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "بستن چت" : "باز کردن چت"}
        className="fixed bottom-20 left-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-petrol-500 text-white shadow-luxe transition hover:bg-petrol-600 lg:bottom-6"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-36 left-4 z-40 flex h-[32rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-navy-900/8 bg-white/95 shadow-luxe backdrop-blur-xl lg:bottom-24"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 bg-gradient-to-l from-navy-900 to-navy-800 px-4 py-3 text-pearl-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-petrol-500/20">
                  <Sparkles size={16} />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold">دستیار درنیکا ساحل</span>
                  <span className="text-[10px] text-petrol-300">آنلاین</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="بستن"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-pearl-100/40 p-3"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "bg-petrol-500 text-white"
                        : "bg-white text-navy-900 shadow-sm",
                    )}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="attachment"
                        className="mb-1.5 max-h-32 w-full rounded-lg object-cover"
                      />
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </p>
                    {m.products && m.products.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {m.products.map((p) => (
                          <li
                            key={p.id}
                            className="rounded-lg border border-navy-900/8 bg-pearl-100/60 p-2"
                          >
                            <a
                              href={`/shop/${p.slug}`}
                              className="block text-xs font-semibold text-navy-900 hover:text-petrol-600"
                            >
                              {p.title}
                            </a>
                            {p.price != null && (
                              <span className="text-[10px] text-charcoal-500">
                                {p.price.toLocaleString("fa-IR")} ریال
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-sm text-charcoal-500 shadow-sm">
                    <Loader2 size={14} className="animate-spin" />
                    در حال پاسخ...
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 border-t border-navy-900/6 bg-white/60 p-2">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="rounded-full border border-petrol-500/30 bg-petrol-500/5 px-2.5 py-1 text-xs text-petrol-700 transition hover:bg-petrol-500/15"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-center gap-2 border-t border-navy-900/6 bg-white p-2"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickImage}
                className="hidden"
              />
              <button
                type="button"
                aria-label="افزودن تصویر"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal-500 hover:bg-navy-900/5 hover:text-petrol-600"
              >
                <ImagePlus size={18} />
              </button>
              {imagePreview ? (
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="حذف تصویر"
                    onClick={() => setImagePreview(null)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : null}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سوال خود را بنویسید..."
                className="h-9 flex-1 rounded-full border border-navy-900/8 bg-pearl-100/40 px-3 text-sm text-navy-900 focus:border-petrol-500 focus:outline-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || (!input && !imagePreview)}
                className="h-9 w-9 shrink-0 rounded-full"
              >
                <Send size={16} />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWidget;
