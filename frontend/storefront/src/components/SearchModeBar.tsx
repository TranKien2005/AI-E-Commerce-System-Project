"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchMode = "keyword" | "intent";

export default function SearchModeBar({
  className,
  compact = false,
  defaultQuery = "",
}: {
  className?: string;
  compact?: boolean;
  defaultQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [mode, setMode] = useState<SearchMode>("keyword");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("mode", mode);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex w-full items-center gap-2 rounded-full border border-white/80 bg-white/80 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl",
        compact ? "max-w-xl" : "max-w-3xl",
        className
      )}
    >
      <div className="flex h-11 flex-1 items-center gap-3 rounded-full bg-slate-50/80 px-4">
        <Search size={18} className="text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nhập từ khóa hoặc mô tả nhu cầu mua sắm..."
          className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      <div className="hidden rounded-full bg-slate-100 p-1 sm:flex">
        {([
          ["keyword", "Thường"],
          ["intent", "Intent AI"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all",
              mode === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <select
        value={mode}
        onChange={(event) => setMode(event.target.value as SearchMode)}
        className="h-11 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none sm:hidden"
        aria-label="Chọn kiểu tìm kiếm"
      >
        <option value="keyword">Thường</option>
        <option value="intent">Intent AI</option>
      </select>
      <button
        type="submit"
        className="flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {mode === "intent" && <Sparkles size={16} />}
        Tìm
      </button>
    </form>
  );
}
