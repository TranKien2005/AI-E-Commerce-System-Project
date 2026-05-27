"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { searchCopy } from "@/lib/copy";
import SearchModeBar from "./SearchModeBar";

export default function AiSearchOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const suggestions = searchCopy.suggestions;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-2xl"
        >
          <button onClick={onClose} className="premium-icon-button absolute right-6 top-6" aria-label="Close search">
            <X size={20} />
          </button>
          <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-24">
            <div className="w-full max-w-5xl rounded-[2.5rem] border border-white/80 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-2xl md:p-12">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-300/80">
                <Sparkles size={26} />
              </motion.div>
              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="eyebrow mb-4">
                Marketplace search
              </motion.p>
              <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-auto mb-8 max-w-3xl text-5xl font-light tracking-tight text-slate-950 md:text-7xl">
                {searchCopy.overlayTitle}
              </motion.h2>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mx-auto mb-10 flex justify-center">
                <SearchModeBar onSubmitted={onClose} />
              </motion.div>
              <div className="flex flex-wrap justify-center gap-3">
                {suggestions.map((suggestion, index) => (
                  <motion.a
                    key={suggestion}
                    href={`/products?q=${encodeURIComponent(suggestion)}`}
                    onClick={onClose}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.04 }}
                    className="rounded-full border border-slate-200 bg-white/75 px-5 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
                  >
                    {suggestion}
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
