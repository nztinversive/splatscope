import { NextRequest, NextResponse } from "next/server";

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || "";
const SAM3_ENDPOINT = "https://serverless.roboflow.com/sam3/concept_segment";

interface RoboflowPrediction {
  confidence: number;
  masks: [number, number][][];
}

interface RoboflowPromptResult {
  echo: { text: string };
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
    const { image, query, width, height } = body as {
      image: string; // base64 PNG (no data: prefix)
      query: string;
      width: number;
      height: number;
    };

    if (!image || !query) {
      return NextResponse.json({ error: "image and query required" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(`${SAM3_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "polygon",
        image: { type: "base64", value: base64 },
        prompts: [{ type: "text", text: query }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Roboflow error:", response.status, text);
      return NextResponse.json({ error: `SAM3 API error: ${response.status}` }, { status: 502 });
    }

    const data: RoboflowResponse = await response.json();

    // Convert pixel polygons to percentage-based for SVG overlay
    const masks: { polygon: string; confidence: number; bbox: number[] }[] = [];

    for (const promptResult of data.prompt_results) {
      for (const prediction of promptResult.predictions) {
        for (const polygon of prediction.masks) {
          if (polygon.length < 3) continue;

          // Convert pixel coords to percentage of viewport
          const percentPoints = polygon
            .map(([x, y]) => {
              const px = (x / width) * 100;
              const py = (y / height) * 100;
              return `${px.toFixed(2)},${py.toFixed(2)}`;
            })
            .join(" ");

          // Bounding box
          const xs = polygon.map(([x]) => x);
          const ys = polygon.map(([, y]) => y);

          masks.push({
            polygon: percentPoints,
            confidence: prediction.confidence,
            bbox: [
              Math.min(...xs),
              Math.min(...ys),
              Math.max(...xs) - Math.min(...xs),
              Math.max(...ys) - Math.min(...ys),
            ],
          });
        }
      }
    }

    return NextResponse.json({
      query,
      maskCount: masks.length,
      masks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Segment API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
