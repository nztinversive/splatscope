import { NextRequest, NextResponse } from "next/server";

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || "";
const SAM3_CONCEPT_ENDPOINT = "https://serverless.roboflow.com/sam3/concept_segment";

// Generic prompts that SAM3 concept segmentation handles well
const GENERIC_PROMPTS = ["object", "thing", "structure"];

type PolygonPoint = [number, number];
type Polygon = PolygonPoint[];

interface MaskCandidate {
  polygon: Polygon;
  confidence: number;
  area: number;
  centroid: { x: number; y: number };
  distToClick: number;
}

/** Shoelace formula for polygon area */
function polygonArea(polygon: Polygon): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  return Math.abs(area) / 2;
}

function polygonCentroid(polygon: Polygon): { x: number; y: number } {
  const cx = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
  return { x: cx, y: cy };
}

function pointInPolygon(px: number, py: number, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

interface RoboflowPrediction {
  confidence: number;
  masks: PolygonPoint[][];
}

interface RoboflowPromptResult {
  predictions: RoboflowPrediction[];
}

interface RoboflowResponse {
  prompt_results: RoboflowPromptResult[];
}

export async function POST(req: NextRequest) {
  try {
    if (!ROBOFLOW_API_KEY) {
      return NextResponse.json({ error: "ROBOFLOW_API_KEY not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { image, points, width, height } = body as {
      image: string;
      points: { x: number; y: number; positive: boolean }[];
      width: number;
      height: number;
    };

    if (!image || !Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: "image and points required" }, { status: 400 });
    }

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return NextResponse.json({ error: "valid width and height required" }, { status: 400 });
    }

    const clickX = Number(points[0].x);
    const clickY = Number(points[0].y);
    if (!Number.isFinite(clickX) || !Number.isFinite(clickY)) {
      return NextResponse.json({ error: "valid click point required" }, { status: 400 });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    // Use concept_segment with generic prompts — works much better on noisy renders
    const response = await fetch(`${SAM3_CONCEPT_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "polygon",
        image: { type: "base64", value: base64 },
        prompts: GENERIC_PROMPTS.map((text) => ({ type: "text", text })),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Roboflow concept-segment error:", response.status, text);
      return NextResponse.json({ error: `SAM3 API error: ${response.status}` }, { status: 502 });
    }

    const data: RoboflowResponse = await response.json();

    // Collect all polygons from all prompts
    const candidates: MaskCandidate[] = [];
    const minArea = width * height * 0.005; // at least 0.5% of image

    for (const promptResult of data.prompt_results) {
      for (const prediction of promptResult.predictions) {
        for (const polygon of prediction.masks) {
          if (polygon.length < 3) continue;
          const area = polygonArea(polygon);
          if (area < minArea) continue;

          const centroid = polygonCentroid(polygon);
          const containsClick = pointInPolygon(clickX, clickY, polygon);
          // Distance: 0 if click is inside polygon, otherwise euclidean to centroid
          const dist = containsClick
            ? 0
            : Math.hypot(centroid.x - clickX, centroid.y - clickY);

          candidates.push({
            polygon,
            confidence: prediction.confidence,
            area,
            centroid,
            distToClick: dist,
          });
        }
      }
    }

    // Sort: prefer masks that contain the click point, then by distance, then by area
    candidates.sort((a, b) => {
      // Click-containing masks first
      if (a.distToClick === 0 && b.distToClick !== 0) return -1;
      if (b.distToClick === 0 && a.distToClick !== 0) return 1;
      // Among click-containing, prefer smallest (most specific)
      if (a.distToClick === 0 && b.distToClick === 0) return a.area - b.area;
      // Otherwise prefer closest
      return a.distToClick - b.distToClick;
    });

    const best = candidates[0] ?? null;
    const masks: { polygon: string; confidence: number; bbox: number[] }[] = [];

    if (best) {
      const percentPoints = best.polygon
        .map(([x, y]) => {
          const px = (x / width) * 100;
          const py = (y / height) * 100;
          return `${px.toFixed(2)},${py.toFixed(2)}`;
        })
        .join(" ");

      const xs = best.polygon.map(([x]) => x);
      const ys = best.polygon.map(([, y]) => y);

      masks.push({
        polygon: percentPoints,
        confidence: best.confidence,
        bbox: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
        ],
      });
    }

    return NextResponse.json({
      query: "point",
      maskCount: masks.length,
      masks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Point segment API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
