"use client";

import { ChevronDown } from "lucide-react";
import { SceneDefinition } from "@/types";

interface SceneSelectorProps {
  scenes: SceneDefinition[];
  selectedSceneId: string;
  onSceneChange: (sceneId: string) => void;
}

export function SceneSelector({
  scenes,
  selectedSceneId,
  onSceneChange,
}: SceneSelectorProps) {
  return (
    <label className="glass-panel pointer-events-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Scene</span>
      <select
        value={selectedSceneId}
        onChange={(event) => onSceneChange(event.target.value)}
        className="rounded-md bg-slate-950/70 px-2 py-1.5 text-sm text-slate-100 outline-none"
      >
        {scenes.map((scene) => (
          <option key={scene.id} value={scene.id}>
            {scene.name}
          </option>
        ))}
      </select>
      <ChevronDown className="h-4 w-4 text-slate-500" />
    </label>
  );
}
