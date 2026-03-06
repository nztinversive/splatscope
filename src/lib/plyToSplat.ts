/**
 * Client-side PLY → .splat converter.
 *
 * Uses gsplat's built-in PLYLoader to parse PLY files and SplatData.serialize()
 * to produce the exact binary layout the viewer expects (32 bytes/gaussian).
 *
 * Layout per gaussian (32 bytes):
 *   positions  : 3 × float32 = 12 B
 *   scales     : 3 × float32 = 12 B
 *   colors     : 4 × uint8   =  4 B  (RGBA)
 *   rotations  : 4 × uint8   =  4 B
 */

import * as SPLAT from "gsplat";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ConversionResult {
  /** The .splat binary data */
  blob: Blob;
  /** A ready-to-use object URL for the blob */
  blobUrl: string;
  /** Number of gaussians in the converted scene */
  vertexCount: number;
  /** Byte size of the output */
  sizeBytes: number;
}

/**
 * Convert a .ply File to .splat format entirely in the browser.
 *
 * @param file  A File object with a .ply extension
 * @param onProgress  Optional progress callback (0-1) for file reading
 * @returns  ConversionResult with the .splat blob, URL, and metadata
 */
export async function convertPlyFileToSplat(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  if (!file.name.toLowerCase().endsWith(".ply")) {
    throw new Error("Expected a .ply file");
  }

  const arrayBuffer = await readFileAsArrayBuffer(file, onProgress);
  return convertPlyBufferToSplat(arrayBuffer);
}

/**
 * Convert a raw PLY ArrayBuffer to .splat format.
 */
export function convertPlyBufferToSplat(
  buffer: ArrayBuffer
): ConversionResult {
  // gsplat's PLYLoader.LoadFromArrayBuffer parses PLY and returns a Splat
  // object whose .data property is a SplatData instance.
  // We need a Scene to satisfy the API, but we only care about the returned Splat.
  const scene = new SPLAT.Scene();
  const splat = SPLAT.PLYLoader.LoadFromArrayBuffer(buffer, scene);

  // Serialize to the .splat binary format
  const splatBytes: Uint8Array = splat.data.serialize();
  const vertexCount = splat.data.vertexCount;

  const blob = new Blob([splatBytes], { type: "application/octet-stream" });
  const blobUrl = URL.createObjectURL(blob);

  // Clean up — remove the splat from the temporary scene
  try {
    scene.removeObject(splat);
  } catch {
    // ignore if not found
  }

  return {
    blob,
    blobUrl,
    vertexCount,
    sizeBytes: splatBytes.byteLength,
  };
}

/**
 * Generate a .splat filename from the original .ply filename.
 */
export function splatFilenameFromPly(plyFilename: string): string {
  return plyFilename.replace(/\.ply$/i, ".splat");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileAsArrayBuffer(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return an ArrayBuffer"));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message ?? "unknown error"}`));
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
