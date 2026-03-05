import { SceneDefinition, SemanticResult, SemanticSearchResponse, SemanticRegion } from "@/types";

const COLOR_SWATCH = ["#3B82F6", "#06B6D4", "#22D3EE", "#38BDF8", "#60A5FA"];

interface LabeledRegion {
  label: string;
  aliases: string[];
  x: number;
  y: number;
  size: number;
  target: { x: number; y: number; z: number };
  description: string;
}

const SCENE_REGIONS: Record<string, LabeledRegion[]> = {
  garden: [
    { label: "Grass", aliases: ["lawn", "turf", "ground cover", "green"], x: 50, y: 78, size: 18, target: { x: 0, y: -0.3, z: 0 }, description: "Dense grass coverage across the ground plane." },
    { label: "Flowers", aliases: ["petals", "blooms", "plants", "flora"], x: 35, y: 45, size: 14, target: { x: -0.5, y: 0.1, z: 0.3 }, description: "Colorful flower bed with mixed species." },
    { label: "Sky", aliases: ["clouds", "atmosphere", "above", "open air"], x: 50, y: 12, size: 22, target: { x: 0, y: 1.5, z: 0 }, description: "Open sky region above the garden canopy." },
    { label: "Table", aliases: ["furniture", "surface", "desk", "platform"], x: 42, y: 58, size: 12, target: { x: -0.2, y: -0.1, z: 0.1 }, description: "Outdoor table surface in the garden center." },
    { label: "Tree", aliases: ["trunk", "branches", "wood", "oak", "pine"], x: 22, y: 32, size: 16, target: { x: -1.0, y: 0.5, z: -0.3 }, description: "Large tree with visible trunk and canopy." },
    { label: "Path", aliases: ["walkway", "trail", "stone", "pavement", "sidewalk"], x: 50, y: 72, size: 14, target: { x: 0, y: -0.2, z: 0.5 }, description: "Stone pathway running through the garden." },
    { label: "Fence", aliases: ["barrier", "railing", "border", "enclosure", "gate"], x: 78, y: 48, size: 12, target: { x: 1.2, y: 0, z: 0 }, description: "Wooden fence along the garden perimeter." },
    { label: "Bench", aliases: ["seat", "chair", "sitting", "rest"], x: 55, y: 62, size: 11, target: { x: 0.2, y: -0.1, z: 0.2 }, description: "Garden bench near the main path." },
    { label: "Leaves", aliases: ["foliage", "canopy", "greenery", "leaf"], x: 30, y: 38, size: 15, target: { x: -0.7, y: 0.4, z: -0.1 }, description: "Dense leaf coverage in the upper canopy." },
    { label: "Hedge", aliases: ["bush", "shrub", "topiary", "border plant"], x: 65, y: 42, size: 13, target: { x: 0.6, y: 0.1, z: -0.2 }, description: "Trimmed hedge row along the garden edge." },
  ],
  bonsai: [
    { label: "Bonsai tree", aliases: ["bonsai", "tree", "miniature tree", "plant"], x: 50, y: 42, size: 16, target: { x: 0, y: 0.1, z: 0 }, description: "Central bonsai specimen with detailed branching." },
    { label: "Pot", aliases: ["planter", "container", "ceramic", "vessel"], x: 50, y: 65, size: 12, target: { x: 0, y: -0.15, z: 0 }, description: "Ceramic pot holding the bonsai." },
    { label: "Table", aliases: ["surface", "stand", "desk", "platform", "furniture"], x: 50, y: 72, size: 14, target: { x: 0, y: -0.25, z: 0 }, description: "Display table supporting the bonsai arrangement." },
    { label: "Wall", aliases: ["background", "backdrop", "surface", "partition"], x: 50, y: 18, size: 20, target: { x: 0, y: 0.5, z: -0.8 }, description: "Background wall behind the display." },
    { label: "Leaves", aliases: ["foliage", "canopy", "greenery", "branches"], x: 48, y: 32, size: 14, target: { x: -0.05, y: 0.25, z: 0 }, description: "Delicate leaf structure on the bonsai canopy." },
    { label: "Shelf", aliases: ["ledge", "rack", "storage"], x: 75, y: 40, size: 10, target: { x: 0.8, y: 0.1, z: -0.3 }, description: "Side shelf in the background." },
    { label: "Books", aliases: ["book", "reading", "stack", "literature"], x: 80, y: 45, size: 8, target: { x: 0.9, y: 0, z: -0.2 }, description: "Stack of books near the shelf." },
    { label: "Floor", aliases: ["ground", "base", "bottom", "carpet"], x: 50, y: 88, size: 18, target: { x: 0, y: -0.5, z: 0 }, description: "Floor surface below the display." },
  ],
  bicycle: [
    { label: "Bicycle", aliases: ["bike", "cycle", "two-wheeler", "vehicle"], x: 50, y: 48, size: 18, target: { x: 0, y: 0, z: 0 }, description: "Complete bicycle in the center of the scene." },
    { label: "Wheel", aliases: ["tire", "rim", "spokes", "rubber"], x: 48, y: 62, size: 14, target: { x: -0.05, y: -0.2, z: 0 }, description: "Bicycle wheel with visible spoke pattern." },
    { label: "Ground", aliases: ["floor", "surface", "pavement", "road", "asphalt"], x: 50, y: 82, size: 18, target: { x: 0, y: -0.4, z: 0 }, description: "Ground surface beneath the bicycle." },
    { label: "Fence", aliases: ["railing", "barrier", "background", "wall"], x: 50, y: 28, size: 16, target: { x: 0, y: 0.3, z: -0.5 }, description: "Background fence or railing behind the bike." },
    { label: "Grass", aliases: ["lawn", "vegetation", "green", "turf"], x: 28, y: 75, size: 14, target: { x: -0.8, y: -0.3, z: 0.2 }, description: "Grass area beside the path." },
    { label: "Handlebar", aliases: ["handlebars", "grip", "steering", "bar"], x: 45, y: 38, size: 10, target: { x: -0.15, y: 0.15, z: 0.1 }, description: "Bicycle handlebar and grip assembly." },
    { label: "Seat", aliases: ["saddle", "sitting", "cushion"], x: 52, y: 42, size: 9, target: { x: 0.05, y: 0.1, z: -0.1 }, description: "Bicycle seat/saddle." },
    { label: "Frame", aliases: ["body", "structure", "metal", "chassis"], x: 50, y: 50, size: 15, target: { x: 0, y: 0, z: 0 }, description: "Main bicycle frame structure." },
  ],
  counter: [
    { label: "Countertop", aliases: ["counter", "surface", "workspace", "kitchen counter"], x: 50, y: 55, size: 18, target: { x: 0.1, y: -0.05, z: 0 }, description: "Kitchen countertop surface." },
    { label: "Kitchen items", aliases: ["items", "utensils", "objects", "appliances", "tools"], x: 50, y: 38, size: 14, target: { x: 0.1, y: 0.15, z: 0.1 }, description: "Various kitchen items on the counter." },
    { label: "Wall", aliases: ["background", "backdrop", "partition", "backsplash"], x: 50, y: 18, size: 20, target: { x: 0.1, y: 0.5, z: -0.5 }, description: "Kitchen wall and backsplash." },
    { label: "Floor", aliases: ["ground", "base", "tile", "bottom"], x: 50, y: 88, size: 18, target: { x: 0.1, y: -0.5, z: 0 }, description: "Kitchen floor surface." },
    { label: "Cabinet", aliases: ["cupboard", "storage", "drawer", "shelving"], x: 22, y: 50, size: 14, target: { x: -0.8, y: 0, z: 0 }, description: "Kitchen cabinet storage unit." },
    { label: "Sink", aliases: ["basin", "faucet", "tap", "wash"], x: 60, y: 52, size: 11, target: { x: 0.4, y: -0.02, z: 0.1 }, description: "Kitchen sink with faucet." },
    { label: "Bottles", aliases: ["bottle", "container", "drink", "liquid", "jar"], x: 40, y: 35, size: 10, target: { x: -0.2, y: 0.2, z: 0.15 }, description: "Bottles and containers on the counter." },
    { label: "Window", aliases: ["glass", "opening", "light source", "daylight"], x: 50, y: 10, size: 16, target: { x: 0.1, y: 0.8, z: -0.6 }, description: "Window above the kitchen counter." },
  ],
};

function fuzzyMatch(query: string, label: string, aliases: string[]): number {
  const q = query.toLowerCase().trim();
  const l = label.toLowerCase();

  // Exact match on label
  if (q === l) return 0.97;
  
  // Query is contained in label or vice versa
  if (l.includes(q) || q.includes(l)) return 0.93;
  
  // Check aliases
  for (const alias of aliases) {
    const a = alias.toLowerCase();
    if (q === a) return 0.95;
    if (a.includes(q) || q.includes(a)) return 0.88;
  }

  // Word overlap
  const qWords = q.split(/\s+/);
  const allWords = [l, ...aliases.map(a => a.toLowerCase())].join(" ").split(/\s+/);
  const overlap = qWords.filter(w => allWords.some(aw => aw.includes(w) || w.includes(aw))).length;
  if (overlap > 0) {
    return 0.6 + (overlap / qWords.length) * 0.2;
  }

  // Related terms (common associations)
  const associations: Record<string, string[]> = {
    "nature": ["grass", "tree", "leaves", "flowers", "hedge", "vegetation", "foliage", "bush"],
    "plant": ["grass", "tree", "leaves", "flowers", "hedge", "bonsai", "foliage", "bush"],
    "outdoor": ["grass", "sky", "tree", "path", "fence", "bench", "ground"],
    "water": ["sink", "faucet", "tap"],
    "cooking": ["counter", "kitchen", "sink", "bottles", "cabinet"],
    "sitting": ["bench", "seat", "chair"],
    "transport": ["bicycle", "bike", "wheel", "handlebar"],
    "structure": ["fence", "wall", "cabinet", "shelf", "frame"],
    "green": ["grass", "leaves", "foliage", "vegetation", "hedge", "tree"],
    "wood": ["fence", "table", "bench", "shelf", "tree"],
    "metal": ["frame", "handlebar", "spokes", "fence", "railing"],
    "container": ["pot", "bottles", "cabinet", "sink"],
  };

  for (const [concept, related] of Object.entries(associations)) {
    if (q.includes(concept) || concept.includes(q)) {
      if (related.some(r => l.toLowerCase().includes(r) || aliases.some(a => a.toLowerCase().includes(r)))) {
        return 0.65 + Math.random() * 0.1;
      }
    }
  }

  return 0;
}

export async function runMockSemanticSearch(
  query: string,
  scene: SceneDefinition
): Promise<SemanticSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: trimmed, sceneId: scene.id, durationMs: 0, totalMatches: 0, results: [] };
  }

  const regions = SCENE_REGIONS[scene.id] ?? SCENE_REGIONS.garden;
  const startedAt = Date.now();

  // Score all regions
  const scored = regions.map((region, index) => ({
    region,
    confidence: fuzzyMatch(trimmed, region.label, region.aliases),
    index,
  })).sort((a, b) => b.confidence - a.confidence);

  // If best match is too low, return top 3 with low confidence
  let results: typeof scored;
  if (scored[0].confidence < 0.3) {
    results = scored.slice(0, 3).map(s => ({ ...s, confidence: 0.35 + Math.random() * 0.15 }));
  } else {
    results = scored.filter(s => s.confidence >= 0.3).slice(0, 6);
  }

  // Simulate processing delay
  const waitMs = 800 + Math.floor(Math.random() * 400);
  await new Promise(resolve => setTimeout(resolve, waitMs));

  const semanticResults: SemanticResult[] = results.map((item, i) => ({
    id: `${scene.id}-${trimmed}-${i}`,
    label: item.region.label,
    description: item.region.description,
    confidence: Number(item.confidence.toFixed(2)),
    thumbnail: scene.previewImage,
    target: item.region.target,
    region: {
      x: item.region.x,
      y: item.region.y,
      size: item.region.size,
      color: COLOR_SWATCH[i % COLOR_SWATCH.length],
    },
  }));

  return {
    query: trimmed,
    sceneId: scene.id,
    durationMs: Date.now() - startedAt,
    totalMatches: semanticResults.length + Math.floor(Math.random() * 8),
    results: semanticResults,
  };
}
