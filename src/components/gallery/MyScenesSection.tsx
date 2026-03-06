"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock3,
  ExternalLink,
  HardDrive,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  getUploadedScenes,
  removeUploadedScene,
  USER_SCENES_STORAGE_KEY,
  USER_SCENES_UPDATED_EVENT,
} from "@/lib/userScenes";
import { UploadedSceneRecord } from "@/types";

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatCreatedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }
  return parsed.toLocaleString();
}

export function MyScenesSection() {
  const [scenes, setScenes] = useState<UploadedSceneRecord[]>([]);

  const syncScenes = useCallback(() => {
    setScenes(getUploadedScenes().filter((scene) => scene.extension === "splat"));
  }, []);

  useEffect(() => {
    syncScenes();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key !== USER_SCENES_STORAGE_KEY) {
        return;
      }
      syncScenes();
    };
    const handleScenesUpdated = () => {
      syncScenes();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(USER_SCENES_UPDATED_EVENT, handleScenesUpdated);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(USER_SCENES_UPDATED_EVENT, handleScenesUpdated);
    };
  }, [syncScenes]);

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">My Scenes</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-100">Uploaded Library</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Local scenes saved in this browser. Upload more files to expand your
            personal scene set.
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-full border border-blue-400/45 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 transition hover:border-cyan-300/80 hover:bg-cyan-500/15"
        >
          Upload More
        </Link>
      </div>

      {scenes.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-slate-700/70 p-6 text-center">
          <div className="mx-auto mb-3 w-fit rounded-full border border-cyan-400/35 bg-cyan-500/10 p-3 text-cyan-200">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-300">
            No local uploads yet. Add your first .splat scene.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scenes.map((scene, index) => (
            <motion.article
              key={scene.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="glass-panel rounded-2xl border border-slate-700/70 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-100">
                    {scene.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">{scene.filename}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/explore?scene=${scene.id}`}
                    className="rounded-lg border border-cyan-400/35 p-1.5 text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/10"
                    aria-label={`Open ${scene.name} in explorer`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      removeUploadedScene(scene.id);
                      syncScenes();
                    }}
                    className="rounded-lg border border-rose-400/35 p-1.5 text-rose-200 transition hover:border-rose-300 hover:bg-rose-500/10"
                    aria-label={`Delete ${scene.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-700/70 bg-slate-900/50 p-3 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-cyan-300" />
                  {formatBytes(scene.sizeBytes)}
                </p>
                <p className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5 text-cyan-300" />
                  {formatCreatedAt(scene.createdAt)}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
