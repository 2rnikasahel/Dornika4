import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { formatRial } from "@/lib/utils";
import { Package, MapPin, ShieldCheck } from "lucide-react";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/profile");
  const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id));
  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div><h1 className="text-gradient-navy text-3xl font-black sm:text-4xl">پروفایل من</h1><p className="mt-2 text-sm text-charcoal-500">{user.name} — {user.role === "super_admin" ? "سوپر ادمین" : user.role === "admin" ? "مدیر" : user.role === "b2b" ? "پیمانکار" : "مشتری"}</p></div>
          <LogoutButton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card rounded-[1.5rem] p-5"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><ShieldCheck className="size-4 text-petrol-700" strokeWidth={1.8} />اطلاعات حساب</div><div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-charcoal-500">نام:</span><span className="font-medium text-navy-900">{user.name}</span></div>{user.phone && <div className="flex justify-between"><span className="text-charcoal-500">موبایل:</span><span className="font-medium text-navy-900" dir="ltr">{user.phone}</span></div>}{user.email && <div className="flex justify-between"><span className="text-charcoal-500">ایمیل:</span><span className="font-medium text-navy-900" dir="ltr">{user.email}</span></div>}</div></div>
          <div className="card rounded-[1.5rem] p-5"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><Package className="size-4 text-petrol-700" strokeWidth={1.8} />سفارشات ({userOrders.length})</div>{userOrders.length === 0 ? <p className="text-xs text-charcoal-400">سفارشی ثبت نشده</p> : <div className="space-y-2">{userOrders.map(o => <div key={o.id} className="flex items-center justify-between rounded-lg bg-navy-900/[0.03] px-3 py-2"><span className="text-[10px] font-bold text-navy-900" dir="ltr">{o.orderNumber}</span><span className="text-[10px] font-semibold text-navy-900">{formatRial(o.totalAmount)}</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-700">{o.status}</span></div>)}</div>}</div>
        </div>
      </div>
    </div>
  );
}
