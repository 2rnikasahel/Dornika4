"use client";
import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Package, Layers, ShoppingCart, Users, Settings, Menu, X, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";

type SectionId = "dashboard" | "products" | "categories" | "orders" | "users" | "settings" | "ai" | "color";

export function AdminLayout({ user, counts }: { user: any; counts: any }) {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = [
    { id: "dashboard" as SectionId, label: "داشبورد", icon: LayoutDashboard },
    { id: "products" as SectionId, label: "محصولات", icon: Package },
    { id: "categories" as SectionId, label: "دسته‌بندی‌ها", icon: Layers },
    { id: "orders" as SectionId, label: "سفارشات", icon: ShoppingCart },
    { id: "users" as SectionId, label: "کاربران", icon: Users },
    { id: "ai" as SectionId, label: "هوش مصنوعی", icon: Sparkles },
    { id: "color" as SectionId, label: "تم رنگی", icon: Sparkles },
    { id: "settings" as SectionId, label: "تنظیمات", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-pearl-100" dir="rtl">
      {sidebarOpen && <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn("fixed inset-y-0 right-0 z-50 w-64 flex-col bg-navy-900 transition-transform lg:flex", sidebarOpen ? "flex translate-x-0" : "hidden lg:flex translate-x-full lg:translate-x-0")}>
        <div className="flex items-center gap-3 border-b border-pearl-100/10 p-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-petrol-600 text-pearl-50"><LayoutDashboard className="size-5" strokeWidth={1.8} /></div>
          <div><p className="text-sm font-bold text-pearl-50">درنیکا ساحل</p><p className="text-[10px] text-pearl-200/50">پنل مدیریت</p></div>
          <button onClick={() => setSidebarOpen(false)} className="ms-auto flex size-8 items-center justify-center rounded-full bg-pearl-100/10 text-pearl-100 lg:hidden"><X className="size-4" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            return <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }} className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all", active ? "bg-petrol-600 text-pearl-50 shadow-md" : "text-pearl-200/70 hover:bg-pearl-100/5 hover:text-pearl-50")}><Icon className="size-4 shrink-0" strokeWidth={1.8} />{item.label}</button>;
          })}
        </nav>
        <div className="border-t border-pearl-100/10 p-3"><p className="text-center text-[10px] text-pearl-200/40">ساخته شده توسط میلاد قلی‌پور</p></div>
      </aside>
      <div className="flex flex-1 flex-col lg:mr-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-navy-900/10 bg-white/95 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="flex size-9 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900 lg:hidden"><Menu className="size-5" strokeWidth={1.8} /></button>
            <h1 className="text-sm font-bold text-navy-900">{navItems.find(i => i.id === section)?.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 rounded-full bg-navy-900/5 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-navy-900/10"><Home className="size-3.5" strokeWidth={1.8} /><span className="hidden sm:inline">سایت</span></Link>
            <div className="flex items-center gap-2 rounded-full bg-navy-900/5 px-3 py-1.5"><div className="flex size-6 items-center justify-center rounded-full bg-petrol-600 text-[10px] font-bold text-pearl-50">{user.name.charAt(0)}</div><span className="hidden text-xs font-medium text-navy-900 sm:inline">{user.name}</span></div>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {section === "dashboard" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[{ l: "محصولات", v: counts.products, i: Package }, { l: "سفارشات", v: counts.orders, i: ShoppingCart }, { l: "کاربران", v: counts.users, i: Users }, { l: "دسته‌ها", v: counts.categories, i: Layers }].map(s => {
                  const Icon = s.i;
                  return <div key={s.l} className="rounded-2xl border border-navy-900/10 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-2xl font-black text-navy-900">{s.v}</p><p className="mt-1 text-xs text-charcoal-500">{s.l}</p></div><div className="flex size-12 items-center justify-center rounded-2xl bg-petrol-600/10 text-petrol-700"><Icon className="size-6" strokeWidth={1.5} /></div></div></div>;
                })}
              </div>
              <div className="rounded-2xl border border-navy-900/10 bg-white p-5"><h3 className="mb-4 text-sm font-bold text-navy-900">خوش آمدید</h3><p className="text-xs text-charcoal-500">به پنل مدیریت درنیکا ساحل خوش آمدید. از منوی کناری می‌توانید به بخش‌های مختلف دسترسی پیدا کنید.</p></div>
            </div>
          )}
          {section !== "dashboard" && <div className="rounded-2xl border border-navy-900/10 bg-white p-12 text-center"><p className="text-xs text-charcoal-400">این بخش در حال توسعه است.</p></div>}
        </main>
      </div>
    </div>
  );
}
