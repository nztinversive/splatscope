import { SegmentMask } from "@/types";

const COLOR_SWATCH = ["#3B82F6", "#06B6D4", "#22D3EE", "#38BDF8", "#60A5FA", "#818CF8", "#A78BFA"];

/**
 * Run GroundingDINO + SAM3 segmentation on a viewport capture.
 * GroundingDINO finds objects by text → SAM3 produces pixel-perfect masks.
 */
export async function runRealSegmentation(
  query: string,
  viewportImage: string, // base64 PNG/JPEG from canvas export
  width: number,
  height: number
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
      console.warn("Segmentation API error:", response.status);
      return [];
    }

    const data = await response.json();
    const masks: SegmentMask[] = (data.masks || []).map(
      (mask: { polygon: string; confidence: number; label?: string }, i: number) => ({
        polygon: mask.polygon,
        confidence: mask.confidence,
        color: COLOR_SWATCH[i % COLOR_SWATCH.length],
        label: mask.label || query,
      })
    );

    console.log(
      `GroundingDINO+SAM: "${query}" → ${masks.length} masks in ${Date.now() - startedAt}ms`
    );

    return masks;
  } catch (err) {
    console.warn("Segmentation failed:", err);
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
