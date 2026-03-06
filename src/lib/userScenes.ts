import { SceneDefinition, UploadedSceneRecord } from "@/types";
import { convertPlyFileToSplat, splatFilenameFromPly } from "@/lib/plyToSplat";

export const USER_SCENES_STORAGE_KEY = "splatscope-scenes";
export const USER_SCENES_UPDATED_EVENT = "splatscope-scenes-updated";

const DEFAULT_CAMERA_TARGET = { x: 0, y: 0, z: 0 };
const DEFAULT_CAMERA_OFFSET = { x: 2.1, y: 1.25, z: 2.4 };
const FALLBACK_PREVIEW_IMAGE = "/previews/bonsai.svg";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function notifyScenesUpdated(): void {
  if (!isClient()) {
    return;
  }
  window.dispatchEvent(new CustomEvent(USER_SCENES_UPDATED_EVENT));
}

function parseStoredScenes(raw: string | null): UploadedSceneRecord[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is UploadedSceneRecord => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<UploadedSceneRecord>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.filename === "string" &&
        (candidate.extension === "splat" || candidate.extension === "ply") &&
        typeof candidate.blobUrl === "string" &&
        typeof candidate.sizeBytes === "number" &&
        typeof candidate.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function persistScenes(scenes: UploadedSceneRecord[]): void {
  if (!isClient()) {
    return;
  }
  window.localStorage.setItem(USER_SCENES_STORAGE_KEY, JSON.stringify(scenes));
  notifyScenesUpdated();
}

function extensionFromFilename(filename: string): "splat" | "ply" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".splat")) {
    return "splat";
  }
  if (lower.endsWith(".ply")) {
    return "ply";
  }
  return null;
}

function displayNameFromFilename(filename: string): string {
  const trimmed = filename.trim();
  const baseName = trimmed.replace(/\.[^/.]+$/, "");
  return baseName || "Untitled Scene";
}

function createSceneId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getUploadedScenes(): UploadedSceneRecord[] {
  if (!isClient()) {
    return [];
  }
  return parseStoredScenes(window.localStorage.getItem(USER_SCENES_STORAGE_KEY));
}

export function saveUploadedScene(file: File): UploadedSceneRecord {
  if (!isClient()) {
    throw new Error("Scene uploads are only available in the browser.");
  }

  const extension = extensionFromFilename(file.name);
  if (!extension) {
    throw new Error("Unsupported file type.");
  }

  const record: UploadedSceneRecord = {
    id: createSceneId(),
    name: displayNameFromFilename(file.name),
    filename: file.name,
    extension,
    blobUrl: URL.createObjectURL(file),
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };

  const previous = getUploadedScenes();
  persistScenes([record, ...previous]);
  return record;
}

/**
 * Upload a .ply file by converting it to .splat first, then saving.
 * Returns the saved record (with extension "splat").
 */
export async function saveUploadedPlyScene(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadedSceneRecord> {
  if (!isClient()) {
    throw new Error("Scene uploads are only available in the browser.");
  }

  const result = await convertPlyFileToSplat(file, onProgress);

  const record: UploadedSceneRecord = {
    id: createSceneId(),
    name: displayNameFromFilename(file.name),
    filename: splatFilenameFromPly(file.name),
    extension: "splat",
    blobUrl: result.blobUrl,
    sizeBytes: result.sizeBytes,
    createdAt: new Date().toISOString(),
  };

  const previous = getUploadedScenes();
  persistScenes([record, ...previous]);
  return record;
}

export function removeUploadedScene(sceneId: string): void {
  if (!isClient()) {
    return;
  }

  const previous = getUploadedScenes();
  const removed = previous.find((scene) => scene.id === sceneId);
  const next = previous.filter((scene) => scene.id !== sceneId);
  persistScenes(next);

  if (removed?.blobUrl.startsWith("blob:")) {
    URL.revokeObjectURL(removed.blobUrl);
  }
}

export function toSceneDefinition(scene: UploadedSceneRecord): SceneDefinition {
  return {
    id: scene.id,
    name: scene.name,
    headline: "User-uploaded splat scene",
    description: `Imported from ${scene.filename}.`,
    category: "Custom",
    tags: ["Upload", scene.extension.toUpperCase(), "Local"],
    pointCount: 0,
    source: "Local upload",
    splatUrl: scene.blobUrl,
    previewImage: FALLBACK_PREVIEW_IMAGE,
    cameraTarget: DEFAULT_CAMERA_TARGET,
    cameraOffset: DEFAULT_CAMERA_OFFSET,
  };
}

export function getUploadedSceneDefinitions(): SceneDefinition[] {
  return getUploadedScenes()
    .filter((scene) => scene.extension === "splat")
    .map(toSceneDefinition);
}
