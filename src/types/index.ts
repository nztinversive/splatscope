export type SceneCategory =
  | "Architecture"
  | "Nature"
  | "Industrial"
  | "Urban"
  | "Custom";

export type ViewMode = "normal" | "semantic" | "split";

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface SemanticRegion {
  x: number;
  y: number;
  size: number;
  color: string;
  /** Polygon points as "x,y x,y ..." percentage coords for SVG highlight shape */
  polygon?: string;
  /** Width multiplier relative to size (default 1 = circular) */
  widthRatio?: number;
  /** Height multiplier relative to size (default 1 = circular) */
  heightRatio?: number;
}

export interface SemanticResult {
  id: string;
  label: string;
  confidence: number;
  description: string;
  thumbnail: string;
  target: Vector3Like;
  region: SemanticRegion;
}

export interface SemanticSearchResponse {
  query: string;
  sceneId: string;
  durationMs: number;
  totalMatches: number;
  results: SemanticResult[];
}

export interface QueryHistoryEntry {
  id: string;
  query: string;
  createdAt: string;
  totalMatches: number;
  topConfidence: number;
}

export interface SceneDefinition {
  id: string;
  name: string;
  headline: string;
  description: string;
  category: SceneCategory;
  tags: string[];
  pointCount: number;
  source: string;
  splatUrl: string;
  previewImage: string;
  cameraTarget: Vector3Like;
  cameraOffset: Vector3Like;
}

export interface UploadedSceneRecord {
  id: string;
  name: string;
  filename: string;
  extension: "splat" | "ply";
  blobUrl: string;
  sizeBytes: number;
  createdAt: string;
}
