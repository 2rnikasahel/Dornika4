import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getCartPageData, readSessionToken } from "@/lib/commerce";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutForm } from "./CheckoutForm";
import { formatRial } from "@/lib/utils";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/checkout");
  const sessionToken = await readSessionToken();
  const cart = await getCartPageData(sessionToken);
  if (cart.items.length === 0) redirect("/cart");
  return (
    <div className="min-h-screen px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-gradient-navy text-3xl font-black sm:text-4xl">تسویه حساب</h1>
        <CheckoutForm user={user} subtotal={cart.subtotal} count={cart.count} />
      </div>
    </div>
  );
}
