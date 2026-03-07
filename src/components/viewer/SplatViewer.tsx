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
import { SceneDefinition, SegmentMask, SemanticRegion, Vector3Like, ViewMode } from "@/types";
import { buildShapePolygon } from "@/lib/search";

type LoadState = "idle" | "loading" | "ready" | "error";

interface SplatViewerProps {
  scene: SceneDefinition;
  mode: ViewMode;
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  showStatusOverlay?: boolean;
  semanticRegions?: SemanticRegion[];
  segmentMasks?: SegmentMask[];
  onLoadProgress?: (progress: number) => void;
  onLoadStateChange?: (state: LoadState) => void;
  onSceneLoaded?: (pointCount: number) => void;
  onCameraStop?: () => void;
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

/** Project a 3D world position to 2D screen percentage using camera matrices */
function projectToScreen(
  target: Vector3Like,
  camera: SPLAT.Camera,
  width: number,
  height: number
): { x: number; y: number } | null {
  // Build view matrix from camera position + rotation
  const pos = camera.position;
  const rot = camera.rotation;

  // Get forward/right/up from quaternion
  const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;

  // Direction from camera to target
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dz = target.z - pos.z;

  // Rotate direction by inverse quaternion to get camera-space coords
  // Inverse quaternion: conjugate for unit quaternion
  const ix = -qx, iy = -qy, iz = -qz, iw = qw;

  // Quaternion multiply: inv_q * vec (as quaternion with w=0) * q
  // First: inv_q * (0, dx, dy, dz)
  const tw = -ix * dx - iy * dy - iz * dz;
  const tx = iw * dx + iy * dz - iz * dy;
  const ty = iw * dy + iz * dx - ix * dz;
  const tz = iw * dz + ix * dy - iy * dx;

  // Then: result * q
  const cx = tw * (-qx) + tx * qw + ty * (-qz) - tz * (-qy);
  const cy = tw * (-qy) + ty * qw + tz * (-qx) - tx * (-qz);
  const cz = tw * (-qz) + tz * qw + tx * (-qy) - ty * (-qx);

  // cz is depth (positive = in front in gsplat's convention, but let's check both)
  // gsplat uses a right-hand system; forward is -Z typically
  // If behind camera, skip
  if (cz >= -0.01) return null; // behind camera

  // Perspective projection
  const fov = camera.data.fx > 0 ? camera.data.fx : width; // focal length in pixels
  const fy = camera.data.fy > 0 ? camera.data.fy : fov;

  const screenX = (cx / -cz) * fov + width / 2;
  const screenY = (cy / -cz) * fy + height / 2;

  // Convert to percentage
  const px = (screenX / width) * 100;
  const py = (screenY / height) * 100;

  if (px < -20 || px > 120 || py < -20 || py > 120) return null;

  return { x: px, y: py };
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
      segmentMasks = [],
      onLoadProgress,
      onLoadStateChange,
      onSceneLoaded,
      onCameraStop,
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
    const lastCamPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
    const cameraStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onCameraStopRef = useRef(onCameraStop);
    onCameraStopRef.current = onCameraStop;
    const [loadState, setLoadState] = useState<LoadState>("idle");
    const [loadProgress, setLoadProgress] = useState(0);
    const [projectedPolygons, setProjectedPolygons] = useState<
      { polygon: string; color: string; key: string }[]
    >([]);
    const semanticRegionsRef = useRef(semanticRegions);

    // Keep the ref in sync
    useEffect(() => {
      semanticRegionsRef.current = semanticRegions;
      if (semanticRegions.length === 0) setProjectedPolygons([]);
    }, [semanticRegions]);

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
        exportPNG: () => {
          const canvas = rendererRef.current?.canvas;
          if (!canvas) return null;
          // Downscale to max 1024px wide for SAM3 performance
          const maxW = 1024;
          if (canvas.width <= maxW) return canvas.toDataURL("image/jpeg", 0.85);
          const scale = maxW / canvas.width;
          const offscreen = document.createElement("canvas");
          offscreen.width = maxW;
          offscreen.height = Math.round(canvas.height * scale);
          const ctx = offscreen.getContext("2d");
          if (!ctx) return canvas.toDataURL("image/jpeg", 0.85);
          ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
          return offscreen.toDataURL("image/jpeg", 0.85);
        },
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

      // Monkey-patch getContext so gsplat's WebGLRenderer gets preserveDrawingBuffer,
      // which is required for canvas.toDataURL() to return actual pixels (for SAM3 export).
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, attrs?: Record<string, unknown>) {
        if (type === "webgl2" || type === "webgl") {
          attrs = { ...attrs, preserveDrawingBuffer: true };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return origGetContext.call(this, type as any, attrs as any);
      } as typeof origGetContext;

      const renderer = new SPLAT.WebGLRenderer();

      // Restore original getContext immediately
      HTMLCanvasElement.prototype.getContext = origGetContext;
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

        // Detect camera stop for re-segmentation (debounced 800ms)
        const cp = cameraInstance.position;
        const lp = lastCamPosRef.current;
        const moved = !lp || Math.abs(cp.x - lp.x) > 0.001 || Math.abs(cp.y - lp.y) > 0.001 || Math.abs(cp.z - lp.z) > 0.001;
        if (moved) {
          lastCamPosRef.current = { x: cp.x, y: cp.y, z: cp.z };
          if (cameraStopTimerRef.current) clearTimeout(cameraStopTimerRef.current);
          cameraStopTimerRef.current = setTimeout(() => {
            onCameraStopRef.current?.();
          }, 800);
        }

        // Project semantic regions to screen coordinates every 6 frames
        if (semanticRegionsRef.current.length > 0 && Math.round(time / 100) % 2 === 0) {
          const container = containerRef.current;
          if (container) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const projected: { polygon: string; color: string; key: string }[] = [];
            for (const region of semanticRegionsRef.current) {
              if (!region.target || !region.label) continue;
              const screen = projectToScreen(region.target, cameraInstance, w, h);
              if (screen) {
                const poly = buildShapePolygon(screen.x, screen.y, region.size, region.label);
                projected.push({
                  polygon: poly,
                  color: region.color,
                  key: `${region.label}-${region.target.x}-${region.target.y}`,
                });
              }
            }
            setProjectedPolygons(projected);
          }
        }

        animationRef.current = requestAnimationFrame(frame);
      };

      animationRef.current = requestAnimationFrame(frame);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (cameraStopTimerRef.current) clearTimeout(cameraStopTimerRef.current);
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

        {mode !== "normal" && projectedPolygons.length > 0 ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {projectedPolygons.map((_, index) => (
                <filter key={`glow-${index}`} id={`region-glow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feFlood floodColor={projectedPolygons[index].color} floodOpacity="0.6" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>
            {projectedPolygons.map((item, index) => (
              <polygon
                key={item.key}
                points={item.polygon}
                fill={`${item.color}35`}
                stroke={item.color}
                strokeWidth="0.3"
                strokeLinejoin="round"
                filter={`url(#region-glow-${index})`}
                style={{ mixBlendMode: "screen", opacity: 0.7 }}
              />
            ))}
          </svg>
        ) : null}

        {/* SAM3 real segmentation masks — clean fills, no glow */}
        {mode !== "normal" && segmentMasks.length > 0 ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {segmentMasks.map((mask, index) => {
              // Parse polygon to find centroid for label
              const points = mask.polygon.split(" ").map(p => {
                const [x, y] = p.split(",").map(Number);
                return { x, y };
              });
              const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
              const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
              const confPct = Math.round(mask.confidence * 100);
              const labelText = mask.label ? `${mask.label} · ${confPct}%` : `${confPct}%`;

              return (
                <g key={`sam-mask-${index}`}>
                  <motion.polygon
                    points={mask.polygon}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.06, duration: 0.25 }}
                    fill={mask.color}
                    fillOpacity={0.35}
                    stroke={mask.color}
                    strokeOpacity={0.8}
                    strokeWidth="0.25"
                    strokeLinejoin="round"
                  />
                  {mask.confidence > 0.5 && (
                    <motion.g
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.06 + 0.15, duration: 0.2 }}
                    >
                      <rect
                        x={cx - labelText.length * 0.38}
                        y={cy - 1.2}
                        width={labelText.length * 0.76}
                        height={2.2}
                        rx={0.6}
                        fill="#1a1a2e"
                        fillOpacity={0.9}
                      />
                      <text
                        x={cx}
                        y={cy + 0.45}
                        textAnchor="middle"
                        fill="white"
                        fontSize="1.4"
                        fontWeight="bold"
                        fontFamily="system-ui, sans-serif"
                      >
                        {labelText}
                      </text>
                    </motion.g>
                  )}
                </g>
              );
            })}
          </svg>
        ) : null}

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
