"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import {
  getUploadedScenes,
  removeUploadedScene,
  saveUploadedScene,
  saveUploadedPlyScene,
  toSceneDefinition,
  USER_SCENES_STORAGE_KEY,
  USER_SCENES_UPDATED_EVENT,
} from "@/lib/userScenes";
import { UploadedSceneRecord } from "@/types";

const DynamicSplatViewer = dynamic(
  () => import("@/components/viewer/SplatViewer").then((module) => module.SplatViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#070913] text-slate-400">
        Booting Gaussian splat renderer...
      </div>
    ),
  }
);

interface StatusMessage {
  tone: "success" | "warning" | "error";
  text: string;
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedScenes, setUploadedScenes] = useState<UploadedSceneRecord[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [sceneLoadProgress, setSceneLoadProgress] = useState(0);
  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isConverting, setIsConverting] = useState(false);

  const syncUploadedScenes = useCallback(() => {
    setUploadedScenes(getUploadedScenes());
  }, []);

  useEffect(() => {
    syncUploadedScenes();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key !== USER_SCENES_STORAGE_KEY) {
        return;
      }
      syncUploadedScenes();
    };
    const handleScenesUpdated = () => {
      syncUploadedScenes();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(USER_SCENES_UPDATED_EVENT, handleScenesUpdated);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(USER_SCENES_UPDATED_EVENT, handleScenesUpdated);
    };
  }, [syncUploadedScenes]);

  useEffect(() => {
    if (uploadedScenes.length === 0) {
      setSelectedSceneId(null);
      return;
    }

    const exists = uploadedScenes.some((scene) => scene.id === selectedSceneId);
    if (!exists) {
      setSelectedSceneId(uploadedScenes[0].id);
    }
  }, [selectedSceneId, uploadedScenes]);

  const selectedScene = useMemo(() => {
    if (!selectedSceneId) {
      return null;
    }

    const match = uploadedScenes.find((scene) => scene.id === selectedSceneId);
    return match ? toSceneDefinition(match) : null;
  }, [selectedSceneId, uploadedScenes]);

  const handleSingleFile = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();

      if (!lower.endsWith(".splat") && !lower.endsWith(".ply")) {
        setStatus({
          tone: "error",
          text: "Unsupported file type. Only .splat and .ply are accepted.",
        });
        return;
      }

      try {
        let saved;

        if (lower.endsWith(".ply")) {
          setIsConverting(true);
          setStatus({
            tone: "warning",
            text: `Converting ${file.name} from PLY to splat format...`,
          });
          saved = await saveUploadedPlyScene(file);
          setIsConverting(false);
        } else {
          saved = saveUploadedScene(file);
        }

        setSelectedSceneId(saved.id);
        setSceneLoadProgress(0);
        setIsSceneLoading(true);
        setStatus({
          tone: "success",
          text: `Uploaded ${saved.filename} and loaded it into the viewer.`,
        });
        syncUploadedScenes();
      } catch (err) {
        setIsConverting(false);
        setStatus({
          tone: "error",
          text: err instanceof Error
            ? `Conversion failed: ${err.message}`
            : "Upload failed. Please try another file.",
        });
      }
    },
    [syncUploadedScenes]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length === 0) {
        return;
      }

      handleSingleFile(files[0]);
    },
    [handleSingleFile]
  );

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleSingleFile(file);
      }
      event.target.value = "";
    },
    [handleSingleFile]
  );

  const handleDeleteScene = useCallback(
    (sceneId: string) => {
      removeUploadedScene(sceneId);
      setStatus({ tone: "success", text: "Scene removed from local storage." });
      syncUploadedScenes();
    },
    [syncUploadedScenes]
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Upload</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-100 md:text-5xl">
            Bring Your Own Scene
          </h1>
          <p className="mt-4 max-w-3xl text-slate-300">
            Drag and drop local Gaussian splat files to preview them instantly.
            Uploads are saved in browser localStorage under
            <span className="text-slate-200"> splatscope-scenes</span>.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.15fr]">
          <section className="space-y-5">
            <motion.div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              whileHover={{ y: -2 }}
              className={`glass-panel rounded-2xl border border-slate-700/70 p-7 transition ${
                isDragging ? "accent-ring border-cyan-300/70 bg-slate-900/80" : ""
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".splat,.ply"
                onChange={handleFileInput}
                className="hidden"
              />

              <div className="flex flex-col items-center text-center">
                <div className="rounded-2xl border border-cyan-400/45 bg-cyan-500/10 p-4 text-cyan-200">
                  {isDragging ? (
                    <UploadCloud className="h-8 w-8" />
                  ) : (
                    <FileUp className="h-8 w-8" />
                  )}
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-100">
                  Drop .splat or .ply files
                </h2>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  .splat loads immediately. .ply files are converted to splat
                  format client-side before loading.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 rounded-full border border-blue-400/45 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 transition hover:border-cyan-300/80 hover:bg-cyan-500/15"
                >
                  Select File
                </button>
              </div>
            </motion.div>

            <AnimatePresence initial={false}>
              {status ? (
                <motion.div
                  key={status.text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`glass-panel flex items-start gap-2 rounded-xl border p-3 text-sm ${
                    status.tone === "success"
                      ? "border-emerald-400/35 text-emerald-200"
                      : status.tone === "warning"
                        ? "border-amber-400/35 text-amber-200"
                        : "border-rose-400/35 text-rose-200"
                  }`}
                >
                  {status.tone === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p>{status.text}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="glass-panel rounded-2xl border border-slate-700/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">Saved Scenes</h2>
                <span className="text-xs text-slate-400">
                  {uploadedScenes.length} local scene{uploadedScenes.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2">
                {uploadedScenes.length === 0 ? (
                  <p className="rounded-lg border border-slate-700/70 bg-slate-900/55 p-3 text-sm text-slate-400">
                    No uploaded scenes yet.
                  </p>
                ) : (
                  uploadedScenes.map((scene) => {
                    const isSelected = scene.id === selectedSceneId;
                    return (
                      <div
                        key={scene.id}
                        className={`rounded-xl border bg-slate-900/55 p-3 transition ${
                          isSelected
                            ? "border-cyan-300/60 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
                            : "border-slate-700/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedSceneId(scene.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-sm font-medium text-slate-100">
                              {scene.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {scene.filename} | {formatBytes(scene.sizeBytes)}
                            </p>
                          </button>
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
                              onClick={() => handleDeleteScene(scene.id)}
                              className="rounded-lg border border-rose-400/35 p-1.5 text-rose-200 transition hover:border-rose-300 hover:bg-rose-500/10"
                              aria-label={`Delete ${scene.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className="glass-panel overflow-hidden rounded-2xl border border-slate-700/70">
            <div className="flex items-center justify-between border-b border-slate-800/90 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-100">
                {selectedScene ? `${selectedScene.name} Preview` : "Preview"}
              </h2>
              <p className="text-xs text-slate-400">
                {isConverting ? "Converting PLY..." : isSceneLoading ? `Loading ${sceneLoadProgress}%` : "Ready"}
              </p>
            </div>

            <div className="relative h-[460px] md:h-[560px]">
              {selectedScene ? (
                <DynamicSplatViewer
                  scene={selectedScene}
                  mode="normal"
                  className="h-full w-full"
                  onLoadProgress={setSceneLoadProgress}
                  onLoadStateChange={(state) => setIsSceneLoading(state === "loading")}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#05070D] p-6 text-center text-slate-400">
                  Upload a .splat file to start previewing it in the gsplat
                  viewer.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
