import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminLayout } from "./AdminLayout";

export default async function AdminPage() {
  const user = await requireAdmin();
  if (!user) redirect("/login?redirect=/admin");
  const counts = { products: 0, variants: 0, units: 0, orders: 0, users: 0, categories: 0, slides: 0, features: 0, files: 0, quotes: 0, recentOrders: [] };
  return <AdminLayout user={user} counts={counts} />;
}
