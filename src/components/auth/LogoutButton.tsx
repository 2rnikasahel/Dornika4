"use client";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" className="flex items-center gap-1.5 rounded-full bg-navy-900/5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
        <LogOut className="size-3.5" strokeWidth={1.8} />
        <span className="hidden sm:inline">خروج</span>
      </button>
    </form>
  );
}
