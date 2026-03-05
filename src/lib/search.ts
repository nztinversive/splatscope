import { SceneDefinition, SemanticResult, SemanticSearchResponse } from "@/types";

const COLOR_SWATCH = ["#3B82F6", "#06B6D4", "#22D3EE", "#38BDF8", "#60A5FA"];

const TOKEN_LIBRARY: Array<{
  token: string;
  labels: string[];
  descriptions: string[];
}> = [
  {
    token: "vegetation",
    labels: ["Canopy cluster", "Leaf mass", "Root-adjacent growth", "Tree-line patch"],
    descriptions: [
      "High chlorophyll profile in upper canopy.",
      "Dense leaf distribution near edge geometry.",
      "Organic material concentrated around soil contact zones.",
      "Repeated vegetation signal in depth-consistent region.",
    ],
  },
  {
    token: "concrete",
    labels: ["Concrete slab", "Support column", "Footing zone", "Hardscape boundary"],
    descriptions: [
      "High structural consistency and low texture variance.",
      "Vertical load-bearing region with planar normal clustering.",
      "Ground-level area matching reinforced concrete signatures.",
      "Rigid material segment intersecting scene perimeter.",
    ],
  },
  {
    token: "damage",
    labels: ["Surface anomaly", "Fracture candidate", "Impact zone", "Edge degradation"],
    descriptions: [
      "Irregular geometry pattern likely tied to material degradation.",
      "Potential crack signature from directional discontinuity.",
      "Localized deformation in high-detail section.",
      "Low-confidence abrasion pattern near exposed surface.",
    ],
  },
  {
    token: "metal",
    labels: ["Metallic frame", "Reflective assembly", "Fastener region", "Machined part"],
    descriptions: [
      "High specular response and rigid contour profile.",
      "Surface reflectance indicates metallic composition.",
      "Compact high-density region around fixture points.",
      "Detected repetitive industrial geometry.",
    ],
  },
  {
    token: "default",
    labels: ["Primary object", "Secondary cluster", "Occluded segment", "Context anchor"],
    descriptions: [
      "Strong embedding similarity with input query.",
      "Moderate semantic overlap and stable spatial confidence.",
      "Partial match inferred from nearby context embeddings.",
      "Low-noise region suitable for focused inspection.",
    ],
  },
];

function hashToSeed(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

function createSeededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pickTokenProfile(query: string) {
  const normalized = query.toLowerCase();
  return (
    TOKEN_LIBRARY.find((entry) => normalized.includes(entry.token)) ??
    TOKEN_LIBRARY.find((entry) => entry.token === "default")!
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildTarget(
  random: () => number,
  scene: SceneDefinition
): { x: number; y: number; z: number } {
  const spread = 1.1;
  return {
    x: scene.cameraTarget.x + (random() - 0.5) * spread,
    y: scene.cameraTarget.y + (random() - 0.5) * 0.8,
    z: scene.cameraTarget.z + (random() - 0.5) * spread,
  };
}

function buildRegion(random: () => number, index: number) {
  return {
    x: clamp(14 + random() * 68 + index * 3, 10, 90),
    y: clamp(16 + random() * 62 + index * 2, 10, 90),
    size: 8 + random() * 14,
    color: COLOR_SWATCH[index % COLOR_SWATCH.length],
  };
}

export async function runMockSemanticSearch(
  query: string,
  scene: SceneDefinition
): Promise<SemanticSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: trimmed,
      sceneId: scene.id,
      durationMs: 0,
      totalMatches: 0,
      results: [],
    };
  }

  const profile = pickTokenProfile(trimmed);
  const seed = hashToSeed(`${scene.id}-${trimmed}`);
  const random = createSeededRandom(seed);
  const resultCount = 3 + Math.floor(random() * 3);
  const startedAt = Date.now();

  const results: SemanticResult[] = Array.from({ length: resultCount }).map(
    (_, index) => {
      const confidence = 0.68 + random() * 0.3;
      const label = profile.labels[index % profile.labels.length];
      const description = profile.descriptions[index % profile.descriptions.length];

      return {
        id: `${scene.id}-${trimmed}-${index}`,
        label,
        description,
        confidence: Number(confidence.toFixed(2)),
        thumbnail: scene.previewImage,
        target: buildTarget(random, scene),
        region: buildRegion(random, index),
      };
    }
  );

  const waitMs = 1100 + Math.floor(random() * 800);
  await new Promise((resolve) => {
    setTimeout(resolve, waitMs);
  });

  return {
    query: trimmed,
    sceneId: scene.id,
    durationMs: Date.now() - startedAt,
    totalMatches: 8 + Math.floor(random() * 15),
    results: results.sort((a, b) => b.confidence - a.confidence),
  };
}
