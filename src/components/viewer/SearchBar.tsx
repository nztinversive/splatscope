"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => Promise<void> | void;
  isSearching: boolean;
  summary: string | null;
  initialQuery?: string;
}

export function SearchBar({
  onSearch,
  isSearching,
  summary,
  initialQuery = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim() || isSearching) {
      return;
    }
    await onSearch(query.trim());
  };

  return (
    <div className="pointer-events-auto w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3">
          <Search className="h-4 w-4 text-cyan-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Try: "concrete", "vegetation", "damage"'
            className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="inline-flex h-8 items-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSearching ? "Analyzing..." : "Search"}
          </button>
        </div>

        <div className="px-3 pb-1 pt-2 text-xs text-slate-300">
          {isSearching ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-1.5 text-cyan-200"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running semantic analysis across the point cloud...
            </motion.span>
          ) : (
            summary ?? "Search any object in the scene — powered by SAM3 vision segmentation."
          )}
        </div>
      </form>
    </div>
  );
}
