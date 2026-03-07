import { NextRequest, NextResponse } from "next/server";

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || "";
const SAM3_POINT_ENDPOINT = "https://serverless.roboflow.com/sam3/visual_segment";

interface PointPrompt {
  x: number;
  y: number;
  positive: boolean;
}

type PolygonPoint = [number, number];
type Polygon = PolygonPoint[];

interface PolygonCandidate {
  polygon: Polygon;
  confidence: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parsePoint(value: unknown): PolygonPoint | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = toNumber(value[0]);
    const y = toNumber(value[1]);
    if (x !== null && y !== null) return [x, y];
  }

  if (isRecord(value)) {
    const x = toNumber(value.x);
    const y = toNumber(value.y);
    if (x !== null && y !== null) return [x, y];
  }

  return null;
}

function parsePolygon(value: unknown): Polygon | null {
  if (!Array.isArray(value) || value.length < 3) {
    return null;
  }

  const points: Polygon = [];
  for (const item of value) {
    const point = parsePoint(item);
    if (!point) return null;
    points.push(point);
  }

  return points.length >= 3 ? points : null;
}

function extractPolygons(value: unknown): Polygon[] {
  const direct = parsePolygon(value);
  if (direct) return [direct];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractPolygons(item));
  }

  if (isRecord(value)) {
    return [
      ...extractPolygons(value.polygon),
      ...extractPolygons(value.points),
      ...extractPolygons(value.mask),
      ...extractPolygons(value.masks),
    ];
  }

  return [];
}

function extractCandidatesFromPrediction(prediction: unknown): PolygonCandidate[] {
  if (!isRecord(prediction)) return [];

  const baseConfidence = toNumber(prediction.confidence) ?? toNumber(prediction.score) ?? 0;
  const candidates: PolygonCandidate[] = [];

  if (Array.isArray(prediction.masks)) {
    const scoreHints = Array.isArray(prediction.scores)
      ? prediction.scores.map((item) => toNumber(item))
      : [];

    prediction.masks.forEach((maskItem, index) => {
      const scoreHint = scoreHints[index];
      let confidence = baseConfidence;

      if (isRecord(maskItem)) {
        confidence =
          toNumber(maskItem.confidence) ??
          toNumber(maskItem.score) ??
          scoreHint ??
          baseConfidence;
      } else if (scoreHint !== undefined && scoreHint !== null) {
        confidence = scoreHint;
      }

      const polygons = extractPolygons(maskItem);
      for (const polygon of polygons) {
        candidates.push({ polygon, confidence });
      }
    });
  }

  const directPolygons = [
    ...extractPolygons(prediction.polygon),
    ...extractPolygons(prediction.points),
    ...extractPolygons(prediction.mask),
  ];
  for (const polygon of directPolygons) {
    candidates.push({ polygon, confidence: baseConfidence });
  }

  if (candidates.length === 0) {
    for (const polygon of extractPolygons(prediction)) {
      candidates.push({ polygon, confidence: baseConfidence });
    }
  }

  return candidates;
}

/** Shoelace formula for polygon area in pixels */
function polygonArea(polygon: Polygon): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  return Math.abs(area) / 2;
}

function extractCandidates(responseData: unknown): PolygonCandidate[] {
  if (!isRecord(responseData)) {
    return [];
  }

  const roots = Array.isArray(responseData.prompt_results)
    ? responseData.prompt_results
    : [responseData];

  const candidates: PolygonCandidate[] = [];

  for (const root of roots) {
    if (!isRecord(root)) continue;

    const predictions = Array.isArray(root.predictions) ? root.predictions : [root];
    for (const prediction of predictions) {
      candidates.push(...extractCandidatesFromPrediction(prediction));
    }
  }

  if (candidates.length === 0) {
    for (const polygon of extractPolygons(responseData)) {
      candidates.push({ polygon, confidence: 0 });
    }
  }

  return candidates;
}

export async function POST(req: NextRequest) {
  try {
    if (!ROBOFLOW_API_KEY) {
      return NextResponse.json({ error: "ROBOFLOW_API_KEY not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { image, points, width, height } = body as {
      image: string;
      points: PointPrompt[];
      width: number;
      height: number;
    };

    if (!image || !Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: "image and points required" }, { status: 400 });
    }

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return NextResponse.json({ error: "valid width and height required" }, { status: 400 });
    }

    const sanitizedPoints = points
      .map((point) => ({
        x: Number(point.x),
        y: Number(point.y),
        positive: Boolean(point.positive),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    if (sanitizedPoints.length === 0) {
      return NextResponse.json({ error: "at least one valid point required" }, { status: 400 });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    // Build a box prompt around the click point for better SAM results on noisy renders
    const mainPoint = sanitizedPoints[0];
    const boxPad = Math.max(width, height) * 0.12; // 12% padding for context
    const box = {
      x: Math.max(0, mainPoint.x - boxPad),
      y: Math.max(0, mainPoint.y - boxPad),
      width: Math.min(width - Math.max(0, mainPoint.x - boxPad), boxPad * 2),
      height: Math.min(height - Math.max(0, mainPoint.y - boxPad), boxPad * 2),
    };

    // Try box + point prompt first (more reliable on splat renders)
    const response = await fetch(`${SAM3_POINT_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        image: { type: "base64", value: base64 },
        prompts: [{ points: sanitizedPoints, box }],
        multimask_output: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Roboflow point-segment error:", response.status, text);
      return NextResponse.json({ error: `SAM3 API error: ${response.status}` }, { status: 502 });
    }

    const data = (await response.json()) as unknown;
    const allCandidates = extractCandidates(data).filter((c) => c.polygon.length >= 3);

    // Compute area for each candidate and filter out tiny fragments
    const minAreaPx = width * height * 0.0005; // at least 0.05% of image
    const withArea = allCandidates
      .map((c) => ({ ...c, area: polygonArea(c.polygon) }))
      .filter((c) => c.area >= minAreaPx)
      .sort((a, b) => b.area - a.area); // largest first

    // Take top 3 by area (SAM typically returns small/medium/large)
    const topCandidates = withArea.slice(0, 3);

    // If no candidates pass area filter, fall back to largest regardless
    if (topCandidates.length === 0 && allCandidates.length > 0) {
      const largest = allCandidates
        .map((c) => ({ ...c, area: polygonArea(c.polygon) }))
        .sort((a, b) => b.area - a.area)[0];
      topCandidates.push(largest);
    }

    const masks: { polygon: string; confidence: number; bbox: number[] }[] = [];

    for (const candidate of topCandidates) {
      const percentPoints = candidate.polygon
        .map(([x, y]) => {
          const px = (x / width) * 100;
          const py = (y / height) * 100;
          return `${px.toFixed(2)},${py.toFixed(2)}`;
        })
        .join(" ");

      const xs = candidate.polygon.map(([x]) => x);
      const ys = candidate.polygon.map(([, y]) => y);

      masks.push({
        polygon: percentPoints,
        confidence: candidate.confidence,
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
