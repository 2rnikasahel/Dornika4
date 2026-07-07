"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Phone, Mail, Lock, User, Building2, ArrowLeft, Smartphone, KeyRound, UserCircle, ShieldCheck, Timer, Loader2 } from "lucide-react";

type Tab = "phone-otp" | "email-otp" | "password";
type Phase = "input" | "otp";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const [tab, setTab] = useState<Tab>("phone-otp");
  const [phase, setPhase] = useState<Phase>("input");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"customer" | "contractor">("customer");
  const [regCompany, setRegCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => { if (resendTimer > 0) { const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000); return () => clearTimeout(t); } }, [resendTimer]);

  async function sendOtp(channel: "sms" | "email", destination: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, destination }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "خطا در ارسال کد.");
      setDevCode(data.devCode || ""); setPhase("otp"); setResendTimer(60);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  async function verifyOtp(channel: "sms" | "email", destination: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, destination, code: otpCode }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "کد اشتباه است.");
      setSuccess(true); setLoading(false);
      setTimeout(() => { window.location.href = redirect; }, 600);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  async function loginWithPassword() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "password", identifier, password }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "خطا در ورود.");
      setSuccess(true); setLoading(false);
      setTimeout(() => { window.location.href = redirect; }, 600);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  async function handleRegister() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: regPhone, email: regEmail, name: regName, password: regPassword, role: regRole, companyName: regRole === "contractor" ? regCompany : undefined }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "خطا در ثبت‌نام.");
      setSuccess(true); setLoading(false);
      setTimeout(() => { window.location.href = redirect; }, 600);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isRegister) { handleRegister(); return; }
    if (tab === "password") loginWithPassword();
    else if (tab === "phone-otp") { if (phase === "input") sendOtp("sms", phone); else verifyOtp("sms", phone); }
    else if (tab === "email-otp") { if (phase === "input") sendOtp("email", email); else verifyOtp("email", email); }
  }
  function resetTab(t: Tab) { setTab(t); setPhase("input"); setError(""); setOtpCode(""); setDevCode(""); }

  return (
    <div className="min-h-screen px-4 py-32 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-navy-900 text-pearl-50 shadow-lg">
            <ShieldCheck className="size-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-gradient-navy text-2xl font-black sm:text-3xl">{isRegister ? "ثبت‌نام در درنیکا ساحل" : "ورود به حساب کاربری"}</h1>
          <p className="mt-2 text-xs text-charcoal-500 sm:text-sm">{isRegister ? "حساب کاربری جدید بسازید" : "با روش دلخواه وارد شوید"}</p>
        </div>
        <div className="card rounded-[2rem] p-6 shadow-xl sm:p-8">
          {success && (
            <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ورود موفق! در حال بارگذاری...
            </div>
          )}
          {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">{error}</div>}
          {isRegister ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-navy-900/5 p-1.5">
                <button type="button" onClick={() => setRegRole("customer")} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold ${regRole === "customer" ? "bg-petrol-600 text-pearl-50 shadow-md" : "text-charcoal-500 hover:text-navy-900"}`}><User className="size-4" strokeWidth={1.8} />مشتری حقیقی</button>
                <button type="button" onClick={() => setRegRole("contractor")} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold ${regRole === "contractor" ? "bg-petrol-600 text-pearl-50 shadow-md" : "text-charcoal-500 hover:text-navy-900"}`}><Building2 className="size-4" strokeWidth={1.8} />پیمانکار</button>
              </div>
              <Field icon={<User className="size-4" strokeWidth={1.6} />} label="نام و نام خانوادگی" value={regName} onChange={setRegName} placeholder="نام شما" />
              {regRole === "contractor" && <Field icon={<Building2 className="size-4" strokeWidth={1.6} />} label="نام شرکت" value={regCompany} onChange={setRegCompany} placeholder="نام شرکت" />}
              <Field icon={<Phone className="size-4" strokeWidth={1.6} />} label="شماره موبایل" value={regPhone} onChange={setRegPhone} placeholder="09123456789" ltr />
              <Field icon={<Mail className="size-4" strokeWidth={1.6} />} label="ایمیل (اختیاری)" value={regEmail} onChange={setRegEmail} placeholder="example@email.com" ltr />
              <Field icon={<Lock className="size-4" strokeWidth={1.6} />} label="کلمه عبور (حداقل ۶ کاراکتر)" type="password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" ltr />
              <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500 disabled:opacity-50">{loading ? <><Loader2 className="size-4 animate-spin" />در حال پردازش...</> : <>ثبت‌نام و ورود<ArrowLeft className="size-4" strokeWidth={2} /></>}</button>
            </form>
          ) : (
            <>
              {phase === "input" && (
                <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl bg-navy-900/5 p-1.5">
                  <TabBtn active={tab === "phone-otp"} onClick={() => resetTab("phone-otp")} icon={<Smartphone className="size-3.5" strokeWidth={1.8} />} label="موبایل" />
                  <TabBtn active={tab === "email-otp"} onClick={() => resetTab("email-otp")} icon={<Mail className="size-3.5" strokeWidth={1.8} />} label="ایمیل" />
                  <TabBtn active={tab === "password"} onClick={() => resetTab("password")} icon={<KeyRound className="size-3.5" strokeWidth={1.8} />} label="رمز عبور" />
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === "phone-otp" && phase === "input" && <Field icon={<Phone className="size-4" strokeWidth={1.6} />} label="شماره موبایل" value={phone} onChange={setPhone} placeholder="09123456789" ltr />}
                {tab === "email-otp" && phase === "input" && <Field icon={<Mail className="size-4" strokeWidth={1.6} />} label="ایمیل" value={email} onChange={setEmail} placeholder="example@email.com" ltr />}
                {tab === "password" && (<><Field icon={<UserCircle className="size-4" strokeWidth={1.6} />} label="نام کاربری / ایمیل / شماره" value={identifier} onChange={setIdentifier} placeholder="admin یا admin@dornika.ir" ltr /><Field icon={<Lock className="size-4" strokeWidth={1.6} />} label="کلمه عبور" type="password" value={password} onChange={setPassword} placeholder="••••••••" ltr /></>)}
                {phase === "otp" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-petrol-50 p-4 text-center">
                      <p className="text-xs font-medium text-petrol-800">کد ۶ رقمی به <span className="font-bold" dir="ltr">{tab === "phone-otp" ? phone : email}</span> ارسال شد.</p>
                      {devCode && <p className="mt-2 text-[10px] text-petrol-600">(حالت تست) کد: <span className="font-bold tracking-widest" dir="ltr">{devCode}</span></p>}
                    </div>
                    <Field icon={<KeyRound className="size-4" strokeWidth={1.6} />} label="کد تایید" value={otpCode} onChange={v => setOtpCode(v.replace(/\D/g, "").slice(0, 6))} placeholder="000000" ltr />
                    <div className="flex items-center justify-between text-xs">
                      <button type="button" onClick={() => { setPhase("input"); setOtpCode(""); setDevCode(""); }} className="font-medium text-charcoal-500 hover:text-navy-900">تغییر شماره/ایمیل</button>
                      {resendTimer > 0 ? <span className="flex items-center gap-1 text-charcoal-400"><Timer className="size-3.5" />ارسال مجدد در {resendTimer} ثانیه</span> : <button type="button" onClick={() => tab === "phone-otp" ? sendOtp("sms", phone) : sendOtp("email", email)} className="font-medium text-petrol-700 hover:text-navy-900">ارسال مجدد</button>}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-petrol-600 px-6 py-3.5 text-sm font-semibold text-pearl-50 shadow-[var(--shadow-glow-petrol)] hover:bg-petrol-500 disabled:opacity-50">{loading ? <><Loader2 className="size-4 animate-spin" />در حال پردازش...</> : <>{tab === "password" ? "ورود به حساب" : phase === "input" ? "ارسال کد تایید" : "تایید و ورود"}<ArrowLeft className="size-4" strokeWidth={2} /></>}</button>
              </form>
            </>
          )}
          <div className="mt-6 border-t border-navy-900/10 pt-6 text-center">
            <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); setPhase("input"); }} className="text-xs font-medium text-petrol-700 hover:text-navy-900">{isRegister ? "قبلاً حساب دارید؟ وارد شوید" : "حساب ندارید؟ ثبت‌نام کنید"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-semibold sm:text-xs ${active ? "bg-petrol-600 text-pearl-50 shadow-md" : "text-charcoal-500 hover:text-navy-900"}`}>{icon}{label}</button>;
}
function Field({ icon, label, value, onChange, placeholder, type = "text", ltr = false }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; ltr?: boolean }) {
  return <div><label className="mb-1.5 block text-xs font-semibold text-navy-900">{label}</label><div className="relative"><span className="absolute start-3.5 top-3.5 text-charcoal-400">{icon}</span><input type={type} required value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-navy-900/10 bg-navy-900/[0.02] py-3 pe-4 ps-10 text-xs text-navy-900 outline-none focus:border-petrol-500 focus:bg-white sm:text-sm" dir={ltr ? "ltr" : undefined} /></div></div>;
}
