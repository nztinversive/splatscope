import { NextRequest, NextResponse } from "next/server";

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || "";
const GROUNDING_DINO_ENDPOINT = "https://serverless.roboflow.com/grounding_dino/ground";
const SAM3_ENDPOINT = "https://serverless.roboflow.com/sam3/segment";

interface GroundingDinoDetection {
  class_name: string;
  confidence: number;
  x: number;      // center x
  y: number;      // center y
  width: number;
  height: number;
}

interface SAMPrediction {
  confidence: number;
  masks: [number, number][][]; // array of polygon rings
}

interface SAMPromptResult {
  predictions: SAMPrediction[];
}

interface SAMResponse {
  prompt_results: SAMPromptResult[];
}

export async function POST(req: NextRequest) {
  try {
    if (!ROBOFLOW_API_KEY) {
      return NextResponse.json({ error: "ROBOFLOW_API_KEY not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { image, query, width, height } = body as {
      image: string;
      query: string;
      width: number;
      height: number;
    };

    if (!image || !query) {
      return NextResponse.json({ error: "image and query required" }, { status: 400 });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    // Step 1: GroundingDINO — text query → bounding boxes
    const dinoResponse = await fetch(`${GROUNDING_DINO_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: { type: "base64", value: base64 },
        text: query,
        box_threshold: 0.2,
        text_threshold: 0.2,
      }),
    });

    if (!dinoResponse.ok) {
      const text = await dinoResponse.text();
      console.error("GroundingDINO error:", dinoResponse.status, text);
      return NextResponse.json({ error: `GroundingDINO API error: ${dinoResponse.status}` }, { status: 502 });
    }

    const dinoData = await dinoResponse.json();
    const detections: GroundingDinoDetection[] = dinoData.detections || [];

    if (detections.length === 0) {
      return NextResponse.json({ query, maskCount: 0, masks: [] });
    }

    // Take top 5 detections by confidence
    const topDetections = detections
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    // Step 2: SAM3 — bounding boxes → pixel-perfect masks
    const boxPrompts = topDetections.map(det => ({
      type: "box" as const,
      x: det.x - det.width / 2,
      y: det.y - det.height / 2,
      width: det.width,
      height: det.height,
    }));

    const samResponse = await fetch(`${SAM3_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "polygon",
        image: { type: "base64", value: base64 },
        prompts: boxPrompts,
      }),
    });

    if (!samResponse.ok) {
      const text = await samResponse.text();
      console.error("SAM3 error:", samResponse.status, text);
      // Fall back to just returning bounding boxes as rectangles
      return respondWithBoxFallback(query, topDetections, width, height);
    }

    const samData: SAMResponse = await samResponse.json();

    // Shoelace formula for polygon area
    function polyArea(polygon: [number, number][]): number {
      let area = 0;
      for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        area += polygon[i][0] * polygon[j][1];
        area -= polygon[j][0] * polygon[i][1];
      }
      return Math.abs(area) / 2;
    }

    const masks: { polygon: string; confidence: number; label: string; bbox: number[] }[] = [];
    const minAreaPx = width * height * 0.0003;

    for (let i = 0; i < samData.prompt_results.length; i++) {
      const promptResult = samData.prompt_results[i];
      const detection = topDetections[i];
      if (!promptResult || !detection) continue;

      // Collect all fragments from this prompt, pick the largest
      let bestFragment: { polygon: [number, number][]; area: number } | null = null;

      for (const prediction of promptResult.predictions) {
        for (const polygon of prediction.masks) {
          if (polygon.length < 3) continue;
          const area = polyArea(polygon);
          if (area >= minAreaPx && (!bestFragment || area > bestFragment.area)) {
            bestFragment = { polygon, area };
          }
        }
      }

      if (!bestFragment) continue;

      const percentPoints = bestFragment.polygon
        .map(([x, y]) => {
          const px = (x / width) * 100;
          const py = (y / height) * 100;
          return `${px.toFixed(2)},${py.toFixed(2)}`;
        })
        .join(" ");

      const xs = bestFragment.polygon.map(([x]) => x);
      const ys = bestFragment.polygon.map(([, y]) => y);

      masks.push({
        polygon: percentPoints,
        confidence: detection.confidence,
        label: detection.class_name || query,
        bbox: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
        ],
      });
    }

    // Sort by confidence descending
    masks.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      query,
      maskCount: masks.length,
      masks: masks.slice(0, 5),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Segment API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** If SAM fails, return bounding box rectangles as polygon masks */
function respondWithBoxFallback(
  query: string,
  detections: GroundingDinoDetection[],
  width: number,
  height: number
) {
  const masks = detections.map(det => {
    const x1 = ((det.x - det.width / 2) / width) * 100;
    const y1 = ((det.y - det.height / 2) / height) * 100;
    const x2 = ((det.x + det.width / 2) / width) * 100;
    const y2 = ((det.y + det.height / 2) / height) * 100;

    return {
      polygon: `${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} ${x1.toFixed(2)},${y2.toFixed(2)}`,
      confidence: det.confidence,
      label: det.class_name || query,
      bbox: [det.x - det.width / 2, det.y - det.height / 2, det.width, det.height],
    };
  });

  return NextResponse.json({ query, maskCount: masks.length, masks });
}
