"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { searchCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

type SearchMode = "keyword" | "intent";

export default function SearchModeBar({
  className,
  compact = false,
  defaultQuery = "",
  defaultMode = "keyword",
  onSubmitted,
}: {
  className?: string;
  compact?: boolean;
  defaultQuery?: string;
  defaultMode?: SearchMode;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [mode, setMode] = useState<SearchMode>(defaultMode);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("mode", mode);
    router.push(`/products?${params.toString()}`);
    onSubmitted?.();
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex w-full flex-col gap-2 rounded-[2rem] border border-white/80 bg-white/95 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:rounded-full lg:flex-row lg:items-center",
        compact ? "max-w-xl" : "max-w-4xl",
        className
      )}
    >
      <div className="flex h-11 flex-1 items-center gap-3 rounded-full bg-slate-50/90 px-4">
        {mode === "intent" ? <Sparkles size={18} className="text-slate-400" /> : <Search size={18} className="text-slate-400" />}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm sản phẩm hoặc cửa hàng..."
          className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      <div className="hidden rounded-full bg-slate-100 p-1 sm:flex">
        {([
          ["keyword", searchCopy.keyword],
          ["intent", searchCopy.intent],
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
      <button
        type="submit"
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {mode === "intent" && <Sparkles size={16} />}
        {searchCopy.button}
      </button>
    </form>
  );
}
