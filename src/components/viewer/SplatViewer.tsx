"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import * as SPLAT from "gsplat";
import { SceneDefinition, SemanticRegion, Vector3Like, ViewMode } from "@/types";

type LoadState = "idle" | "loading" | "ready" | "error";

interface SplatViewerProps {
  scene: SceneDefinition;
  mode: ViewMode;
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  showStatusOverlay?: boolean;
  semanticRegions?: SemanticRegion[];
  onLoadProgress?: (progress: number) => void;
  onLoadStateChange?: (state: LoadState) => void;
  onSceneLoaded?: (pointCount: number) => void;
}

interface FlightState {
  from: Vector3Like;
  to: Vector3Like;
  target: Vector3Like;
  start: number;
  duration: number;
}

export interface SplatViewerHandle {
  focusOnTarget: (target: Vector3Like) => void;
  exportPNG: () => string | null;
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

export const SplatViewer = forwardRef<SplatViewerHandle, SplatViewerProps>(
  function SplatViewer(
    {
      scene,
      mode,
      className,
      autoRotate = false,
      interactive = true,
      showStatusOverlay = true,
      semanticRegions = [],
      onLoadProgress,
      onLoadStateChange,
      onSceneLoaded,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<SPLAT.Scene | null>(null);
    const cameraRef = useRef<SPLAT.Camera | null>(null);
    const rendererRef = useRef<SPLAT.WebGLRenderer | null>(null);
    const controlsRef = useRef<SPLAT.OrbitControls | null>(null);
    const splatRef = useRef<SPLAT.Splat | null>(null);
    const animationRef = useRef<number | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const loadTokenRef = useRef(0);
    const flightRef = useRef<FlightState | null>(null);
    const autoRotationRef = useRef(0);
    const [loadState, setLoadState] = useState<LoadState>("idle");
    const [loadProgress, setLoadProgress] = useState(0);

    const setStateAndNotify = useCallback(
      (state: LoadState) => {
        setLoadState(state);
        onLoadStateChange?.(state);
      },
      [onLoadStateChange]
    );

    const focusOnTarget = useCallback(
      (target: Vector3Like) => {
        const camera = cameraRef.current;
        if (!camera) {
          return;
        }

        const from: Vector3Like = {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        };

        flightRef.current = {
          from,
          to: {
            x: target.x + scene.cameraOffset.x * 0.55,
            y: target.y + scene.cameraOffset.y * 0.6 + 0.18,
            z: target.z + scene.cameraOffset.z * 0.55,
          },
          target,
          start: performance.now(),
          duration: 900,
        };
      },
      [scene.cameraOffset.x, scene.cameraOffset.y, scene.cameraOffset.z]
    );

    useImperativeHandle(
      ref,
      () => ({
        focusOnTarget,
        exportPNG: () => rendererRef.current?.canvas.toDataURL("image/png") ?? null,
      }),
      [focusOnTarget]
    );

    useEffect(() => {
      const canvas = rendererRef.current?.canvas;
      if (!canvas) {
        return;
      }

      if (mode === "semantic") {
        canvas.style.filter = "saturate(1.18) contrast(1.07) hue-rotate(-14deg)";
      } else {
        canvas.style.filter = "none";
      }
    }, [mode]);

    useEffect(() => {
      const host = containerRef.current;
      if (!host) {
        return;
      }

      const gsplatScene = new SPLAT.Scene();
      const camera = new SPLAT.Camera();
      const renderer = new SPLAT.WebGLRenderer();
      const controls = new SPLAT.OrbitControls(
        camera,
        renderer.canvas,
        0.5,
        0.35,
        4,
        interactive,
        new SPLAT.Vector3(0, 0, 0)
      );

      renderer.backgroundColor = new SPLAT.Color32(10, 10, 15, 255);
      renderer.canvas.style.width = "100%";
      renderer.canvas.style.height = "100%";
      renderer.canvas.style.display = "block";
      renderer.canvas.style.pointerEvents = interactive ? "auto" : "none";

      controls.minZoom = 0.5;
      controls.maxZoom = 18;
      controls.dampening = 0.11;
      controls.orbitSpeed = 1;

      host.innerHTML = "";
      host.appendChild(renderer.canvas);

      sceneRef.current = gsplatScene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = controls;

      const resize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) {
          return;
        }
        const width = Math.max(containerRef.current.clientWidth, 1);
        const height = Math.max(containerRef.current.clientHeight, 1);
        rendererRef.current.setSize(width, height);
        cameraRef.current.data.setSize(width, height);
      };

      resizeObserverRef.current = new ResizeObserver(resize);
      resizeObserverRef.current.observe(host);
      resize();

      const frame = (time: number) => {
        const sceneInstance = sceneRef.current;
        const cameraInstance = cameraRef.current;
        const rendererInstance = rendererRef.current;
        const controlsInstance = controlsRef.current;
        if (!sceneInstance || !cameraInstance || !rendererInstance || !controlsInstance) {
          return;
        }

        const flight = flightRef.current;
        if (flight) {
          const elapsed = time - flight.start;
          const progress = Math.min(elapsed / flight.duration, 1);
          const eased = easeInOutCubic(progress);

          const x = lerp(flight.from.x, flight.to.x, eased);
          const y = lerp(flight.from.y, flight.to.y, eased);
          const z = lerp(flight.from.z, flight.to.z, eased);
          const position = new SPLAT.Vector3(x, y, z);
          cameraInstance.position = position;

          const direction = new SPLAT.Vector3(
            flight.target.x - x,
            flight.target.y - y,
            flight.target.z - z
          ).normalize();
          cameraInstance.rotation = SPLAT.Quaternion.LookRotation(direction);

          if (progress >= 1) {
            controlsInstance.setCameraTarget(
              new SPLAT.Vector3(flight.target.x, flight.target.y, flight.target.z)
            );
            flightRef.current = null;
          }
        } else {
          controlsInstance.update();
        }

        if (autoRotate && splatRef.current) {
          autoRotationRef.current += 0.0025;
          splatRef.current.rotation = SPLAT.Quaternion.FromEuler(
            new SPLAT.Vector3(0, autoRotationRef.current, 0)
          );
        }

        rendererInstance.render(sceneInstance, cameraInstance);
        animationRef.current = requestAnimationFrame(frame);
      };

      animationRef.current = requestAnimationFrame(frame);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        resizeObserverRef.current?.disconnect();
        controls.dispose();
        renderer.dispose();
        renderer.canvas.remove();
        sceneRef.current = null;
        cameraRef.current = null;
        rendererRef.current = null;
        controlsRef.current = null;
        splatRef.current = null;
        flightRef.current = null;
      };
    }, [interactive, autoRotate]);

    useEffect(() => {
      const gsplatScene = sceneRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!gsplatScene || !camera || !controls) {
        return;
      }

      const loadToken = loadTokenRef.current + 1;
      loadTokenRef.current = loadToken;

      setLoadProgress(0);
      onLoadProgress?.(0);
      setStateAndNotify("loading");

      gsplatScene.reset();
      splatRef.current = null;
      autoRotationRef.current = 0;

      const target = new SPLAT.Vector3(
        scene.cameraTarget.x,
        scene.cameraTarget.y,
        scene.cameraTarget.z
      );
      const startCamera = new SPLAT.Vector3(
        scene.cameraTarget.x + scene.cameraOffset.x,
        scene.cameraTarget.y + scene.cameraOffset.y,
        scene.cameraTarget.z + scene.cameraOffset.z
      );

      camera.position = startCamera;
      camera.rotation = SPLAT.Quaternion.LookRotation(target.subtract(startCamera).normalize());
      controls.setCameraTarget(target);

      let disposed = false;
      void SPLAT.Loader.LoadAsync(scene.splatUrl, gsplatScene, (progress) => {
        if (disposed || loadTokenRef.current !== loadToken) {
          return;
        }

        const normalized = progress > 1 ? progress / 100 : progress;
        const percent = Math.min(100, Math.max(0, Math.round(normalized * 100)));
        setLoadProgress(percent);
        onLoadProgress?.(percent);
      })
        .then((splat) => {
          if (disposed || loadTokenRef.current !== loadToken) {
            return;
          }

          splatRef.current = splat;
          setLoadProgress(100);
          onLoadProgress?.(100);
          setStateAndNotify("ready");
          onSceneLoaded?.(splat.data.vertexCount);
        })
        .catch(() => {
          if (disposed || loadTokenRef.current !== loadToken) {
            return;
          }
          setStateAndNotify("error");
        });

      return () => {
        disposed = true;
      };
    }, [
      scene,
      onLoadProgress,
      onSceneLoaded,
      setStateAndNotify,
      scene.cameraOffset.x,
      scene.cameraOffset.y,
      scene.cameraOffset.z,
      scene.cameraTarget.x,
      scene.cameraTarget.y,
      scene.cameraTarget.z,
    ]);

    return (
      <div className={`relative bg-[#05070D] ${className ?? ""}`}>
        <div ref={containerRef} className="absolute inset-0" />

        {mode === "split" ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-cyan-400/12 backdrop-saturate-150" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-cyan-300/60 shadow-[0_0_25px_rgba(6,182,212,0.6)]" />
          </>
        ) : null}

        {mode !== "normal"
          ? semanticRegions.map((region, index) => {
              const size = Math.max(36, Math.round(region.size * 3.8));
              return (
                <motion.div
                  key={`${region.x}-${region.y}-${index}`}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.4, type: "spring", stiffness: 200 }}
                  className="pointer-events-none absolute rounded-full border-2"
                  style={{
                    left: `${region.x}%`,
                    top: `${region.y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    borderColor: region.color,
                    backgroundColor: `${region.color}22`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: `0 0 20px ${region.color}55, 0 0 40px ${region.color}33, inset 0 0 15px ${region.color}22`,
                    animation: "semantic-pulse 2.5s ease-in-out infinite",
                  }}
                />
              );
            })
          : null}

        {showStatusOverlay && loadState !== "ready" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="glass-panel rounded-xl px-4 py-3 text-center text-xs text-slate-200">
              {loadState === "loading"
                ? `Loading scene... ${loadProgress}%`
                : "Scene unavailable. Try another demo scene."}
            </div>
          </div>
        ) : null}

        {interactive ? (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-slate-700/70 bg-slate-950/60 px-2.5 py-1.5 text-[11px] text-slate-300">
            Drag: orbit | Scroll: zoom | Right-drag: pan
          </div>
        ) : null}
      </div>
    );
  }
);
