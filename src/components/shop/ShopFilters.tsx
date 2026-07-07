"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";

type Category = { slug: string; title: string; productCount: number };

export function ShopFilters({ categories, currentCat, currentSearch, currentSort }: { categories: Category[]; currentCat?: string; currentSearch?: string; currentSort?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/shop?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <select value={currentCat || ""} onChange={e => update("cat", e.target.value)} className="appearance-none rounded-full border border-navy-900/10 bg-white py-2.5 pe-9 ps-4 text-xs font-medium text-navy-900 outline-none hover:border-petrol-400 focus:border-petrol-500">
          <option value="">همه دسته‌ها</option>
          {categories.map(c => <option key={c.slug} value={c.slug}>{c.title} ({c.productCount})</option>)}
        </select>
        <svg className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      <div className="relative">
        <select value={currentSort || ""} onChange={e => update("sort", e.target.value)} className="appearance-none rounded-full border border-navy-900/10 bg-white py-2.5 pe-9 ps-4 text-xs font-medium text-navy-900 outline-none hover:border-petrol-400 focus:border-petrol-500">
          <option value="">مرتب‌سازی</option>
          <option value="newest">جدیدترین</option>
          <option value="cheapest">ارزان‌ترین</option>
          <option value="expensive">گران‌ترین</option>
        </select>
        <svg className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); update("q", fd.get("q") as string); }} className="flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-2.5">
        <Search className="size-4 shrink-0 text-charcoal-400" strokeWidth={1.6} />
        <input name="q" defaultValue={currentSearch || ""} placeholder="جستجو..." className="w-28 bg-transparent text-xs text-navy-900 placeholder-charcoal-400 outline-none sm:w-40" />
        <button type="submit" className="rounded-full bg-petrol-600 px-3 py-1 text-[10px] font-semibold text-pearl-50">برو</button>
      </form>
    </div>
  );
}
