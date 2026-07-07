"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Smartphone,
  Mail,
  KeyRound,
  ShieldCheck,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { LuxePopup } from "./LuxePopup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AuthPopupProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "phone" | "email" | "password" | "register";
}

type Tab = "phone" | "email" | "password" | "register";

const TABS: { id: Tab; label: string; icon: typeof Smartphone }[] = [
  { id: "phone", label: "تلفن", icon: Smartphone },
  { id: "email", label: "ایمیل", icon: Mail },
  { id: "password", label: "رمز", icon: KeyRound },
  { id: "register", label: "ثبت‌نام", icon: ShieldCheck },
];

export function AuthPopup({
  open,
  onClose,
  defaultTab = "phone",
}: AuthPopupProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [economicCode, setEconomicCode] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setOtpSent(false);
      setSuccess(null);
    }
  }, [open, defaultTab]);

  async function sendOtp(channel: "sms" | "email", destination: string) {
    if (!destination) {
      toast.error("مقصد را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, destination }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "ارسال کد ناموفق بود");
      setOtpSent(true);
      toast.success("کد یکبار مصرف ارسال شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ارسال کد");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(channel: "sms" | "email", destination: string) {
    if (!otp) {
      toast.error("کد را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, destination, code: otp }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "تأیید کد ناموفق بود");
      setSuccess("با موفقیت وارد شدید");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "کد نادرست است");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPassword() {
    if (!identifier || !password) {
      toast.error("نام کاربری و رمز را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "ورود ناموفق بود");
      setSuccess("با موفقیت وارد شدید");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "اطلاعات نادرست است");
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    if (!name || !phone) {
      toast.error("نام و تلفن را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          companyName,
          economicCode,
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "ثبت‌نام ناموفق بود");
      setSuccess("حساب کاربری ساخته شد");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ثبت‌نام ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "phone") {
      if (!otpSent) void sendOtp("sms", phone);
      else void verifyOtp("sms", phone);
    } else if (tab === "email") {
      if (!otpSent) void sendOtp("email", email);
      else void verifyOtp("email", email);
    } else if (tab === "password") {
      void loginWithPassword();
    } else {
      void register();
    }
  }

  return (
    <LuxePopup
      open={open}
      onClose={onClose}
      title="ورود / ثبت‌نام"
      width="md"
      side="center"
    >
      <div className="flex flex-col gap-4">
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            <CheckCircle2 size={18} />
            {success}
          </motion.div>
        )}

        {/* Tab bar */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-navy-900/5 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setOtpSent(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition sm:flex-row sm:justify-center sm:gap-1.5 sm:text-xs",
                tab === t.id
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-charcoal-500 hover:text-navy-900",
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === "phone" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-phone">شماره تلفن</Label>
                <Input
                  id="auth-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder="09xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                />
              </div>
              {otpSent && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-phone-otp">کد یکبار مصرف</Label>
                  <Input
                    id="auth-phone-otp"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {tab === "email" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-email">ایمیل</Label>
                <Input
                  id="auth-email"
                  type="email"
                  dir="ltr"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                />
              </div>
              {otpSent && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-email-otp">کد یکبار مصرف</Label>
                  <Input
                    id="auth-email-otp"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {tab === "password" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-id">نام کاربری / ایمیل / تلفن</Label>
                <Input
                  id="auth-id"
                  dir="ltr"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-pass">رمز عبور</Label>
                <Input
                  id="auth-pass"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          {tab === "register" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-name">نام و نام خانوادگی</Label>
                <Input
                  id="reg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-phone">تلفن</Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-email">ایمیل</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-company">نام شرکت</Label>
                  <Input
                    id="reg-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-economic">کد اقتصادی</Label>
                  <Input
                    id="reg-economic"
                    dir="ltr"
                    value={economicCode}
                    onChange={(e) => setEconomicCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-pass">رمز عبور</Label>
                <Input
                  id="reg-pass"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="mt-2 gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {tab === "register"
              ? "ثبت‌نام"
              : tab === "password"
                ? "ورود"
                : otpSent
                  ? "تأیید کد"
                  : "ارسال کد"}
          </Button>
        </form>
      </div>
    </LuxePopup>
  );
}

export default AuthPopup;
