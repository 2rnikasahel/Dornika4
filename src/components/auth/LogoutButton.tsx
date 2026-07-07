"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Calls `/api/auth/logout` to clear the auth cookie, then forces a
 * full page reload so server components re-evaluate the session.
 */
export function LogoutButton({ className, children }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("logout failed");
      toast.success("خارج شدید");
      window.setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("خروج ناموفق بود");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 text-sm text-charcoal-700 transition hover:text-rose-600",
        className,
      )}
    >
      <LogOut size={16} />
      {children ?? "خروج"}
    </button>
  );
}

export default LogoutButton;
