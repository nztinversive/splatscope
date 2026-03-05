import { SceneDefinition } from "@/types";

export const DEMO_SCENES: SceneDefinition[] = [
  {
    id: "garden",
    name: "Garden",
    headline: "Dense vegetation and micro-structures",
    description:
      "Outdoor capture with rich foliage and layered depth, useful for vegetation and conservation workflows.",
    category: "Nature",
    tags: ["Vegetation", "Conservation", "Depth"],
    pointCount: 7000,
    source: "HuggingFace 3DGS demo dataset",
    splatUrl:
      "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/garden/garden-7k.splat",
    previewImage: "/previews/garden.svg",
    cameraTarget: { x: 0, y: 0.1, z: 0 },
    cameraOffset: { x: 2.1, y: 1.2, z: 2.4 },
  },
  {
    id: "bonsai",
    name: "Bonsai",
    headline: "Compact architecture-grade detail",
    description:
      "A low-memory scene with precise object edges. Ideal for quick demos and constrained devices.",
    category: "Architecture",
    tags: ["Architecture", "Interior", "Fine detail"],
    pointCount: 7000,
    source: "HuggingFace 3DGS demo dataset",
    splatUrl:
      "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat",
    previewImage: "/previews/bonsai.svg",
    cameraTarget: { x: 0, y: 0, z: 0 },
    cameraOffset: { x: 1.9, y: 1.1, z: 2.2 },
  },
  {
    id: "bicycle",
    name: "Construction Site",
    headline: "Object-centric reconstruction for inspection",
    description:
      "A scene suited for asset-level checks. Great for simulating defect and material searches.",
    category: "Industrial",
    tags: ["Inspection", "Asset tracking", "Damage detection"],
    pointCount: 7000,
    source: "HuggingFace 3DGS demo dataset",
    splatUrl:
      "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bicycle/bicycle-7k.splat",
    previewImage: "/previews/bicycle.svg",
    cameraTarget: { x: 0, y: 0, z: 0 },
    cameraOffset: { x: 2.4, y: 1.4, z: 2.5 },
  },
  {
    id: "counter",
    name: "Building Exterior",
    headline: "Urban context for large-scale navigation",
    description:
      "A wider context scene for street-level mapping and digital twin validation in urban environments.",
    category: "Urban",
    tags: ["Urban", "Digital twin", "Navigation"],
    pointCount: 7000,
    source: "HuggingFace 3DGS demo dataset",
    splatUrl:
      "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/counter/counter-7k.splat",
    previewImage: "/previews/counter.svg",
    cameraTarget: { x: 0.1, y: 0, z: 0 },
    cameraOffset: { x: 2.3, y: 1.5, z: 2.8 },
  },
];

const sceneMap = new Map(DEMO_SCENES.map((scene) => [scene.id, scene]));

export const DEFAULT_SCENE_ID = "garden";

export function getSceneById(sceneId?: string | null): SceneDefinition {
  if (!sceneId) {
    return sceneMap.get(DEFAULT_SCENE_ID)!;
  }

  return sceneMap.get(sceneId) ?? sceneMap.get(DEFAULT_SCENE_ID)!;
}
