"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { DEFAULT_SCENE_ID, DEMO_SCENES, getSceneById } from "@/lib/scenes";
import {
  getUploadedSceneDefinitions,
  USER_SCENES_STORAGE_KEY,
  USER_SCENES_UPDATED_EVENT,
} from "@/lib/userScenes";
import { runMockSemanticSearch, runRealSegmentation } from "@/lib/search";
import { QueryHistoryEntry, SceneDefinition, SegmentMask, SemanticResult, ViewMode } from "@/types";
import { InfoPanel } from "./InfoPanel";
import { SceneSelector } from "./SceneSelector";
import { SearchBar } from "./SearchBar";
import type { SplatViewerHandle } from "./SplatViewer";
import { ViewModes } from "./ViewModes";

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

interface ExploreExperienceProps {
  initialSceneId?: string | null;
}

export function ExploreExperience({ initialSceneId }: ExploreExperienceProps) {
  const router = useRouter();
  const [uploadedScenes, setUploadedScenes] = useState<SceneDefinition[]>([]);
  const [uploadedScenesReady, setUploadedScenesReady] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState(
    initialSceneId ?? DEFAULT_SCENE_ID
  );
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [isSearching, setIsSearching] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [sceneLoadProgress, setSceneLoadProgress] = useState(0);
  const [isSceneLoading, setIsSceneLoading] = useState(true);
  const [runtimePointCount, setRuntimePointCount] = useState<number | null>(null);
  const [segmentMasks, setSegmentMasks] = useState<SegmentMask[]>([]);
  const viewerRef = useRef<SplatViewerHandle | null>(null);
  const searchTokenRef = useRef(0);
  const lastQueryRef = useRef<string | null>(null);
  const reSegmentingRef = useRef(false);

  const availableScenes = useMemo(
    () => [...DEMO_SCENES, ...uploadedScenes],
    [uploadedScenes]
  );
  const selectedScene = useMemo(
    () =>
      availableScenes.find((scene) => scene.id === selectedSceneId) ??
      getSceneById(DEFAULT_SCENE_ID),
    [availableScenes, selectedSceneId]
  );
  const semanticRegions = useMemo(
    () => results.slice(0, 6).map((result) => result.region),
    [results]
  );
  const handleLoadStateChange = useCallback((state: "idle" | "loading" | "ready" | "error") => {
    setIsSceneLoading(state === "loading");
  }, []);

  const syncUploadedScenes = useCallback(() => {
    setUploadedScenes(getUploadedSceneDefinitions());
  }, []);

  useEffect(() => {
    syncUploadedScenes();
    setUploadedScenesReady(true);

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

  const handleSceneChange = useCallback(
    (sceneId: string) => {
      searchTokenRef.current += 1;
      setSelectedSceneId(sceneId);
      setViewMode("normal");
      setSummary(null);
      setResults([]);
      setSegmentMasks([]);
      setSceneLoadProgress(0);
      setRuntimePointCount(null);
      setIsSceneLoading(true);
      setIsSearching(false);
      router.replace(`/explore?scene=${sceneId}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    if (!uploadedScenesReady) {
      return;
    }

    const sceneExists = availableScenes.some((scene) => scene.id === selectedSceneId);
    if (!sceneExists) {
      handleSceneChange(DEFAULT_SCENE_ID);
    }
  }, [availableScenes, handleSceneChange, selectedSceneId, uploadedScenesReady]);

  const handleSearch = useCallback(
    async (query: string) => {
      const token = searchTokenRef.current + 1;
      searchTokenRef.current = token;
      setIsSearching(true);
      setSegmentMasks([]);
      setSummary(`Analyzing "${query}" with SAM3 vision model...`);

      // Try real SAM3 segmentation first
      const viewportPng = viewerRef.current?.exportPNG();
      let usedRealSegmentation = false;

      if (viewportPng) {
        // Get viewport dimensions from the canvas
        const img = new Image();
        const dimensions = await new Promise<{ w: number; h: number }>((resolve) => {
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 1280, h: 720 });
          img.src = viewportPng;
        });

        const masks = await runRealSegmentation(
          query,
          viewportPng,
          dimensions.w,
          dimensions.h,
          query
        );
        if (searchTokenRef.current !== token) return;

        if (masks.length > 0) {
          usedRealSegmentation = true;
          lastQueryRef.current = query;
          setSegmentMasks(masks);
          setViewMode("semantic");
          setIsSearching(false);
          setSummary(
            `SAM3 found ${masks.length} region${masks.length > 1 ? "s" : ""} matching "${query}"`
          );

          const historyEntry: QueryHistoryEntry = {
            id: `${selectedScene.id}-${Date.now()}`,
            query,
            createdAt: new Date().toISOString(),
            totalMatches: masks.length,
            topConfidence: masks[0]?.confidence ?? 0,
          };
          setHistory((previous) => [historyEntry, ...previous].slice(0, 8));
          // Don't move camera — mask is already on the current view
          return;
        }
      }

      // Fallback to mock search
      if (!usedRealSegmentation) {
        setSummary(`Analyzing "${query}" with semantic embeddings...`);
        const response = await runMockSemanticSearch(query, selectedScene);
        if (searchTokenRef.current !== token) return;

        setResults(response.results);
        setIsSearching(false);
        setViewMode("semantic");
        setSummary(
          `Found ${response.totalMatches} regions matching "${response.query}" in ${(response.durationMs / 1000).toFixed(1)}s`
        );

        const topConfidence = response.results[0]?.confidence ?? 0;
        const historyEntry: QueryHistoryEntry = {
          id: `${response.sceneId}-${Date.now()}`,
          query: response.query,
          createdAt: new Date().toISOString(),
          totalMatches: response.totalMatches,
          topConfidence,
        };
        setHistory((previous) => [historyEntry, ...previous].slice(0, 8));

        if (response.results[0]) {
          viewerRef.current?.focusOnTarget(response.results[0].target);
        }
      }
    },
    [selectedScene]
  );

  const handleCameraStop = useCallback(async () => {
    const query = lastQueryRef.current;
    if (!query || reSegmentingRef.current || isSearching) return;

    const viewportPng = viewerRef.current?.exportPNG();
    if (!viewportPng) return;

    reSegmentingRef.current = true;
    setSummary(`Re-analyzing "${query}" from new angle...`);

    try {
      const img = new Image();
      const dimensions = await new Promise<{ w: number; h: number }>((resolve) => {
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 1280, h: 720 });
        img.src = viewportPng;
      });

      const masks = await runRealSegmentation(query, viewportPng, dimensions.w, dimensions.h, query);
      if (masks.length > 0) {
        setSegmentMasks(masks);
        setSummary(`SAM3 found ${masks.length} region${masks.length > 1 ? "s" : ""} matching "${query}"`);
      }
    } catch {
      // silently fail re-segmentation
    } finally {
      reSegmentingRef.current = false;
    }
  }, [isSearching]);

  const handleResultClick = useCallback((result: SemanticResult) => {
    viewerRef.current?.focusOnTarget(result.target);
    setSummary(
      `Navigating to "${result.label}" (${(result.confidence * 100).toFixed(0)}% confidence)`
    );
  }, []);

  const handleExport = useCallback(() => {
    const image = viewerRef.current?.exportPNG();
    if (!image) {
      setSummary("Export failed: scene is not ready yet.");
      return;
    }

    const link = document.createElement("a");
    link.href = image;
    link.download = `${selectedScene.id}-view.png`;
    link.click();
    setSummary("PNG export completed.");
  }, [selectedScene.id]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/explore?scene=${selectedScene.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSummary("Share link copied to clipboard.");
    } catch {
      setSummary(`Share URL: ${shareUrl}`);
    }
  }, [selectedScene.id]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#0A0A0F]">
      <DynamicSplatViewer
        ref={viewerRef}
        scene={selectedScene}
        mode={viewMode}
        semanticRegions={semanticRegions}
        segmentMasks={segmentMasks}
        className="h-full w-full"
        onLoadProgress={setSceneLoadProgress}
        onLoadStateChange={handleLoadStateChange}
        onSceneLoaded={setRuntimePointCount}
        onCameraStop={handleCameraStop}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
        <span className="rounded-md bg-blue-500/20 p-1 text-blue-200">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        SplatScope Explorer
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(92vw,820px)] -translate-x-1/2 px-2 pt-12 md:pt-0">
        <SearchBar onSearch={handleSearch} isSearching={isSearching} summary={summary} />
      </div>

      <div className="absolute left-4 top-[5.5rem] z-20 flex flex-col gap-3">
        <SceneSelector
          scenes={availableScenes}
          selectedSceneId={selectedScene.id}
          onSceneChange={handleSceneChange}
        />
        <ViewModes mode={viewMode} onChange={setViewMode} />
      </div>

      <InfoPanel
        scene={{ ...selectedScene, pointCount: runtimePointCount ?? selectedScene.pointCount }}
        viewMode={viewMode}
        sceneLoadProgress={sceneLoadProgress}
        isSceneLoading={isSceneLoading}
        queryHistory={history}
        results={results}
        onResultClick={handleResultClick}
        onExport={handleExport}
        onShare={handleShare}
      />
    </main>
  );
}
