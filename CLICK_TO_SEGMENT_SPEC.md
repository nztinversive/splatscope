# Click-to-Segment: Build Spec

## Goal
Replace text-prompt search with click-to-segment as the primary UX. User clicks on the 3D scene, we capture the click coordinates, export the canvas, send both to SAM3 point prompt API, and render the returned mask overlay.

## Changes Required

### 1. New API Route: `/api/segment-point/route.ts`
- Accept: `{ image: string (base64), points: [{x: number, y: number, positive: boolean}], width: number, height: number }`
- SAM3 PVS endpoint: `https://serverless.roboflow.com/sam3/visual_segment?api_key=KEY`
- Request body:
  ```json
  {
    "format": "json",
    "image": { "type": "base64", "value": "..." },
    "prompts": [{ "points": [{"x": 512, "y": 384, "positive": true}] }],
    "multimask_output": true
  }
  ```
  - `positive: true` = foreground (include), `false` = background (exclude)
  - x,y are pixel coordinates on the image
  - `multimask_output: true` returns 3 masks for ambiguous clicks — pick highest score
  - Response format for `format: "json"`: masks are returned as polygons
- Convert returned polygon masks to percentage coordinates (same as existing route)
- Return same format as existing `/api/segment`: `{ masks: [{polygon, confidence, bbox}], maskCount }`

### 2. New function in `src/lib/search.ts`: `runPointSegmentation()`
```ts
export async function runPointSegmentation(
  viewportImage: string,     // base64 from canvas
  clickX: number,            // pixel x on the exported image  
  clickY: number,            // pixel y on the exported image
  width: number,
  height: number
): Promise<SegmentMask[]>
```
- Calls `/api/segment-point`
- Returns SegmentMask[] (same shape as runRealSegmentation)

### 3. SplatViewer: Add click handler + expose canvas dimensions
- Add `onCanvasClick?: (x: number, y: number, canvasWidth: number, canvasHeight: number) => void` prop
- On single-click (NOT drag), fire the callback with the click pixel position relative to the canvas
- Need to distinguish click vs drag: track mousedown position, only fire if mouse moved < 5px
- Add to SplatViewerHandle: `getCanvasDimensions(): {width: number, height: number} | null`

### 4. ExploreExperience: Wire up click-to-segment
- Add click handler that:
  1. Gets viewport PNG via `viewerRef.current.exportPNG()`
  2. Converts click coordinates to the exported image's coordinate space (account for downscale in exportPNG)
  3. Calls `runPointSegmentation()`
  4. Sets segment masks + switches to semantic mode
- Show a small crosshair/dot at click location while segmenting
- Keep SearchBar but make it secondary — add hint text "Click any object to segment, or search by text"
- Keep re-segmentation on camera stop (reuse last click point)

### 5. UI Polish
- Show a pulsing ring animation at click point while SAM3 processes
- Update the controls hint: "Click: segment | Drag: orbit | Scroll: zoom | Right-drag: pan"
- Add a "Clear" button to dismiss current segmentation
- Multi-click: each new click replaces the previous segmentation (don't accumulate)

## Files to Modify
- `src/app/api/segment-point/route.ts` (NEW)
- `src/lib/search.ts` (add runPointSegmentation)
- `src/components/viewer/SplatViewer.tsx` (add click handler, expose canvas dims)
- `src/components/viewer/ExploreExperience.tsx` (wire up click-to-segment flow)
- `src/types/index.ts` (add ClickPoint type if needed)

## DO NOT
- Remove the existing text search — keep it as secondary
- Break the existing SAM3 text segmentation or mock fallback
- Change the mask rendering SVG (it already works great)
