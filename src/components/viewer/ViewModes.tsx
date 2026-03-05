"use client";

import { ComponentType } from "react";
import { Contrast, Layers3, SplitSquareVertical } from "lucide-react";
import { ViewMode } from "@/types";

interface ViewModesProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const MODE_CONFIG: Array<{
  mode: ViewMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { mode: "normal", label: "Normal", icon: Layers3 },
  { mode: "semantic", label: "Semantic", icon: Contrast },
  { mode: "split", label: "Split", icon: SplitSquareVertical },
];

export function ViewModes({ mode, onChange }: ViewModesProps) {
  return (
    <div className="glass-panel pointer-events-auto inline-flex rounded-xl p-1">
      {MODE_CONFIG.map((item) => {
        const Icon = item.icon;
        const isActive = mode === item.mode;

        return (
          <button
            key={item.mode}
            type="button"
            onClick={() => onChange(item.mode)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-blue-500/90 to-cyan-500/90 text-white"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
