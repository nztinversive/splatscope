"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  ChevronRight,
  ClipboardCopy,
  Download,
  History,
  MapPin,
  Waves,
} from "lucide-react";
import { QueryHistoryEntry, SceneDefinition, SemanticResult, ViewMode } from "@/types";

interface InfoPanelProps {
  scene: SceneDefinition;
  viewMode: ViewMode;
  sceneLoadProgress: number;
  isSceneLoading: boolean;
  queryHistory: QueryHistoryEntry[];
  results: SemanticResult[];
  onResultClick: (result: SemanticResult) => void;
  onExport: () => void;
  onShare: () => void;
}

export function InfoPanel({
  scene,
  viewMode,
  sceneLoadProgress,
  isSceneLoading,
  queryHistory,
  results,
  onResultClick,
  onExport,
  onShare,
}: InfoPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 flex max-h-[calc(100vh-2rem)] items-start gap-2">
      <button
        type="button"
        onClick={() => setIsCollapsed((previous) => !previous)}
        className="glass-panel pointer-events-auto mt-2 rounded-xl p-2 text-slate-200 transition hover:text-cyan-200"
        aria-label={isCollapsed ? "Expand info panel" : "Collapse info panel"}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed ? (
          <motion.aside
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.2 }}
            className="glass-panel pointer-events-auto w-[320px] overflow-hidden rounded-2xl border border-slate-700/70"
          >
            <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">Scene Info</h2>
                <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-200">
                  {scene.category}
                </span>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/55 p-3 text-sm text-slate-300">
                <p className="text-base font-medium text-slate-100">{scene.name}</p>
                <p className="text-xs text-slate-400">{scene.headline}</p>
                <p className="flex items-center gap-2 text-xs">
                  <Waves className="h-3.5 w-3.5 text-cyan-300" />
                  {scene.pointCount.toLocaleString()} points
                </p>
                <p className="flex items-center gap-2 text-xs">
                  <Camera className="h-3.5 w-3.5 text-cyan-300" />
                  View mode: {viewMode}
                </p>
                <p className="text-[11px] text-slate-500">{scene.source}</p>
                {isSceneLoading ? (
                  <p className="text-xs text-blue-200">Loading scene... {sceneLoadProgress}%</p>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-400/35 bg-blue-500/12 px-3 py-2 text-xs text-blue-100 transition hover:bg-blue-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export PNG
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/12 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy Link
                </button>
              </div>

              <section className="mt-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  Results
                </h3>
                <div className="space-y-2">
                  {results.length === 0 ? (
                    <p className="rounded-lg border border-slate-700/70 bg-slate-900/45 p-2 text-xs text-slate-400">
                      Search to see semantic matches and confidence scores.
                    </p>
                  ) : (
                    results.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => onResultClick(result)}
                        className="flex w-full items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/60 p-2 text-left transition hover:border-cyan-300/50"
                      >
                        <Image
                          src={result.thumbnail}
                          alt={result.label}
                          width={56}
                          height={40}
                          className="h-10 w-14 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-100">{result.label}</p>
                          <p className="truncate text-[11px] text-slate-400">{result.description}</p>
                        </div>
                        <p className="text-xs font-semibold text-cyan-200">
                          {(result.confidence * 100).toFixed(0)}%
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="mt-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <History className="h-4 w-4 text-cyan-300" />
                  Query History
                </h3>
                <div className="space-y-2">
                  {queryHistory.length === 0 ? (
                    <p className="rounded-lg border border-slate-700/70 bg-slate-900/45 p-2 text-xs text-slate-400">
                      No previous queries for this session.
                    </p>
                  ) : (
                    queryHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-slate-700/70 bg-slate-900/50 p-2 text-xs text-slate-300"
                      >
                        <p className="font-medium text-slate-100">{entry.query}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {entry.totalMatches} matches | Top{" "}
                          {(entry.topConfidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
