import { SceneDefinition, SemanticResult, SemanticSearchResponse, SegmentMask } from "@/types";

const COLOR_SWATCH = ["#3B82F6", "#06B6D4", "#22D3EE", "#38BDF8", "#60A5FA"];

/**
 * Object-shaped silhouette templates.
 * Each template is a list of [dx, dy] offsets from center (in percentage units).
 * These create recognizable object outlines when rendered as SVG polygons.
 */
const SHAPE_TEMPLATES: Record<string, [number, number][]> = {
  // Flat ground planes
  grass: [[-22,2],[-18,-3],[-10,-4],[0,-3],[10,-4],[18,-3],[22,1],[20,4],[14,5],[6,4],[-4,5],[-12,4],[-20,4]],
  floor: [[-24,2],[-20,-2],[-10,-3],[0,-2],[10,-3],[20,-2],[24,2],[20,4],[10,5],[0,4],[-10,5],[-20,4]],
  ground: [[-22,3],[-16,-2],[-8,-3],[0,-2],[8,-3],[16,-2],[22,3],[18,5],[8,6],[0,5],[-8,6],[-18,5]],
  path: [[-4,-12],[-3,-8],[-5,-4],[-4,0],[-5,4],[-3,8],[-4,12],[4,12],[3,8],[5,4],[4,0],[5,-4],[3,-8],[4,-12]],
  countertop: [[-22,2],[-18,-2],[-8,-3],[0,-2],[8,-3],[18,-2],[22,2],[20,3],[10,4],[0,3],[-10,4],[-20,3]],

  // Table shapes — round/rectangular surface with legs
  table: [[-10,-2],[-8,-5],[-3,-6],[3,-6],[8,-5],[10,-2],[10,1],[8,3],[6,6],[4,6],[3,3],[-3,3],[-4,6],[-6,6],[-8,3],[-10,1]],

  // Tree — trunk + canopy silhouette
  tree: [[-2,10],[-2,4],[-7,2],[-10,-1],[-9,-5],[-7,-8],[-4,-11],[-1,-12],[2,-12],[5,-11],[8,-8],[9,-5],[10,-1],[7,2],[2,4],[2,10]],
  bonsai_tree: [[-2,8],[-2,4],[-6,2],[-8,-1],[-7,-4],[-5,-7],[-2,-9],[0,-10],[3,-9],[6,-7],[7,-4],[8,-1],[6,2],[2,4],[2,8]],

  // Flower cluster — organic lumpy shape
  flowers: [[-6,0],[-7,-3],[-5,-6],[-2,-8],[1,-7],[4,-8],[7,-6],[8,-3],[7,0],[8,3],[6,6],[3,7],[0,6],[-3,7],[-6,6],[-8,3]],
  leaves: [[-7,1],[-8,-2],[-6,-5],[-3,-8],[0,-9],[3,-8],[6,-5],[8,-2],[7,1],[8,4],[5,7],[2,8],[0,7],[-3,8],[-6,6],[-8,4]],

  // Sky — wide dome
  sky: [[-28,4],[-24,0],[-18,-3],[-10,-5],[0,-6],[10,-5],[18,-3],[24,0],[28,4],[20,6],[10,5],[0,6],[-10,5],[-20,6]],
  wall: [[-20,6],[-20,-6],[-10,-7],[0,-6],[10,-7],[20,-6],[20,6],[10,7],[0,6],[-10,7]],

  // Fence — tall vertical slats
  fence: [[-2,14],[-2,10],[-3,10],[-3,-10],[-2,-10],[-2,-14],[2,-14],[2,-10],[3,-10],[3,10],[2,10],[2,14]],
  hedge: [[-12,3],[-10,-1],[-8,-3],[-5,-4],[-2,-3],[0,-4],[2,-3],[5,-4],[8,-3],[10,-1],[12,3],[10,4],[6,5],[0,4],[-6,5],[-10,4]],

  // Bench — horizontal plank with supports
  bench: [[-12,-1],[-10,-3],[10,-3],[12,-1],[12,1],[10,2],[8,5],[6,5],[6,2],[-6,2],[-6,5],[-8,5],[-10,2],[-12,1]],

  // Bicycle — diamond frame + wheels
  bicycle: [[-10,2],[-8,6],[-6,6],[-4,2],[0,-2],[4,-4],[8,-4],[10,-1],[10,4],[8,6],[6,6],[4,4],[0,2],[-4,4],[-8,4],[-10,2]],
  wheel: [[-6,0],[-5,-3],[-3,-5],[0,-6],[3,-5],[5,-3],[6,0],[5,3],[3,5],[0,6],[-3,5],[-5,3]],
  handlebar: [[-6,-2],[-4,-4],[0,-5],[4,-4],[6,-2],[5,0],[3,2],[0,3],[-3,2],[-5,0]],
  seat: [[-5,-1],[-3,-3],[0,-4],[3,-3],[5,-1],[4,2],[2,3],[0,4],[-2,3],[-4,2]],
  frame: [[-6,4],[-2,-2],[0,-5],[3,-5],[6,-2],[8,0],[6,2],[4,4],[2,2],[0,4],[-2,4],[-4,2]],

  // Kitchen
  cabinet: [[-5,10],[-5,-10],[-3,-11],[3,-11],[5,-10],[5,10],[3,11],[-3,11]],
  sink: [[-5,0],[-4,-3],[-2,-5],[2,-5],[4,-3],[5,0],[4,3],[2,5],[-2,5],[-4,3]],
  bottles: [[-3,6],[-3,2],[-4,0],[-3,-2],[-2,-5],[-1,-6],[1,-6],[2,-5],[3,-2],[4,0],[3,2],[3,6],[1,7],[-1,7]],
  window: [[-8,6],[-8,-6],[-6,-7],[6,-7],[8,-6],[8,6],[6,7],[-6,7]],
  kitchen_items: [[-10,2],[-8,-2],[-5,-4],[-2,-3],[2,-4],[5,-4],[8,-2],[10,2],[8,4],[4,5],[0,4],[-4,5],[-8,4]],

  // Furniture
  pot: [[-4,4],[-5,1],[-4,-2],[-3,-4],[0,-5],[3,-4],[4,-2],[5,1],[4,4],[2,5],[-2,5]],
  shelf: [[-3,8],[-3,-8],[-2,-9],[2,-9],[3,-8],[3,8],[2,9],[-2,9]],
  books: [[-3,5],[-3,-5],[-2,-6],[2,-6],[3,-5],[3,5],[2,6],[-2,6]],

  // Fallback organic blob
  default: [[-6,0],[-5,-4],[-3,-6],[0,-7],[3,-6],[5,-4],[6,0],[5,4],[3,6],[0,7],[-3,6],[-5,4]],
};

/** Map region labels to shape template keys */
function getShapeKey(label: string): string {
  const l = label.toLowerCase();
  if (SHAPE_TEMPLATES[l]) return l;
  // Check partial matches
  for (const key of Object.keys(SHAPE_TEMPLATES)) {
    if (l.includes(key) || key.includes(l)) return key;
  }
  // Category matches
  if (l.includes("tree") || l.includes("trunk") || l.includes("bonsai")) return "tree";
  if (l.includes("grass") || l.includes("lawn") || l.includes("turf")) return "grass";
  if (l.includes("flower") || l.includes("bloom") || l.includes("petal")) return "flowers";
  if (l.includes("table") || l.includes("desk") || l.includes("surface")) return "table";
  if (l.includes("path") || l.includes("walkway") || l.includes("trail")) return "path";
  if (l.includes("sky") || l.includes("cloud")) return "sky";
  if (l.includes("wall") || l.includes("backdrop")) return "wall";
  if (l.includes("fence") || l.includes("railing") || l.includes("barrier")) return "fence";
  if (l.includes("bench") || l.includes("seat") || l.includes("chair")) return "bench";
  if (l.includes("hedge") || l.includes("bush") || l.includes("shrub")) return "hedge";
  if (l.includes("leaf") || l.includes("foliage") || l.includes("canopy")) return "leaves";
  if (l.includes("floor") || l.includes("ground") || l.includes("tile")) return "floor";
  if (l.includes("counter")) return "countertop";
  if (l.includes("cabinet") || l.includes("cupboard")) return "cabinet";
  if (l.includes("bottle") || l.includes("jar")) return "bottles";
  if (l.includes("window") || l.includes("glass")) return "window";
  if (l.includes("bike") || l.includes("bicycle") || l.includes("cycle")) return "bicycle";
  if (l.includes("wheel") || l.includes("tire")) return "wheel";
  if (l.includes("pot") || l.includes("planter")) return "pot";
  return "default";
}

/** Build polygon string from a shape template, positioned at center with given scale */
export function buildShapePolygon(
  cx: number,
  cy: number,
  size: number,
  label: string
): string {
  const key = getShapeKey(label);
  const template = SHAPE_TEMPLATES[key] ?? SHAPE_TEMPLATES.default;
  const scale = size / 12; // normalize to base template size
  return template
    .map(([dx, dy]) => {
      const px = Math.max(0, Math.min(100, cx + dx * scale));
      const py = Math.max(0, Math.min(100, cy + dy * scale));
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

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

  const semanticResults: SemanticResult[] = results.map((item, i) => {
    return {
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
        polygon: buildShapePolygon(item.region.x, item.region.y, item.region.size, item.region.label),
        label: item.region.label,
        target: item.region.target,
      },
    };
  });

  return {
    query: trimmed,
    sceneId: scene.id,
    durationMs: Date.now() - startedAt,
    totalMatches: semanticResults.length + Math.floor(Math.random() * 8),
    results: semanticResults,
  };
}

/**
 * Run real SAM3 segmentation on a viewport capture.
 * Returns polygon masks in percentage coordinates ready for canvas overlay.
 */
export async function runRealSegmentation(
  query: string,
  viewportImage: string, // base64 PNG from canvas export
  width: number,
  height: number,
  label: string = query
): Promise<SegmentMask[]> {
  const startedAt = Date.now();

  try {
    const response = await fetch("/api/segment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: viewportImage,
        query,
        width,
        height,
      }),
    });

    if (!response.ok) {
      console.warn("SAM3 API unavailable, falling back to mock");
      return [];
    }

    const data = await response.json();
    const resolvedLabel = label.trim() || query;
    const masks: SegmentMask[] = (data.masks || []).map(
      (mask: { polygon: string; confidence: number }, i: number) => ({
        polygon: mask.polygon,
        confidence: mask.confidence,
        color: COLOR_SWATCH[i % COLOR_SWATCH.length],
        label: resolvedLabel,
      })
    );

    console.log(
      `SAM3 segmentation: "${query}" → ${masks.length} masks in ${Date.now() - startedAt}ms`
    );

    return masks;
  } catch (err) {
    console.warn("SAM3 segmentation failed:", err);
    return [];
  }
}

export async function runPointSegmentation(
  viewportImage: string,
  clickX: number,
  clickY: number,
  width: number,
  height: number
): Promise<SegmentMask[]> {
  const startedAt = Date.now();

  try {
    const response = await fetch("/api/segment-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: viewportImage,
        points: [{ x: clickX, y: clickY, positive: true }],
        width,
        height,
      }),
    });

    if (!response.ok) {
      console.warn("Point segmentation API unavailable");
      return [];
    }

    const data = await response.json();
    const masks: SegmentMask[] = (data.masks || []).map(
      (mask: { polygon: string; confidence: number }, i: number) => ({
        polygon: mask.polygon,
        confidence: mask.confidence,
        color: COLOR_SWATCH[i % COLOR_SWATCH.length],
        label: "Selection",
      })
    );

    console.log(
      `Point segmentation: ${masks.length} mask(s) in ${Date.now() - startedAt}ms`
    );

    return masks;
  } catch (err) {
    console.warn("Point segmentation failed:", err);
    return [];
  }
}
