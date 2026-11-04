export type PhotoCompressionOptions = {
  maxDimension?: number;
  quality?: number;
  minBytesToCompress?: number;
  preferredMimeType?: "image/webp" | "image/jpeg";
};

const DEFAULT_MAX_DIMENSION = 1200;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_MIN_BYTES = 180 * 1024;

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension = DEFAULT_MAX_DIMENSION,
): { width: number; height: number; scaled: boolean } {
  const safeMax = Math.max(64, Math.round(maxDimension));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: safeMax, height: safeMax, scaled: false };
  }
  const largestSide = Math.max(width, height);
  if (largestSide <= safeMax) {
    return { width: Math.round(width), height: Math.round(height), scaled: false };
  }
  const scale = safeMax / largestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

export function extensionForMimeType(mimeType: string): "jpg" | "png" | "webp" {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function replaceFileExtension(name: string, ext: "jpg" | "png" | "webp"): string {
  const base = name.replace(/\.[^/.]+$/, "") || "photo";
  return `${base}.${ext}`;
}

async function decodeImageSource(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close?.(),
    };
  }
  if (typeof Image === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    throw new Error("Image decoding APIs are unavailable");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      const timer = setTimeout(() => reject(new Error("Image decode timeout")), 1500);
      element.onload = () => {
        clearTimeout(timer);
        resolve(element);
      };
      element.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Failed to decode image"));
      };
      element.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Compresses and downscales a profile or verification photo on the client before upload.
 * Falls back safely to the original File if the environment lacks canvas support
 * or if the compressed output is not smaller than the source file.
 */
export async function compressProfilePhoto(
  file: File,
  options: PhotoCompressionOptions = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const minBytes = options.minBytesToCompress ?? DEFAULT_MIN_BYTES;
  const preferredMimeType = options.preferredMimeType ?? "image/webp";

  if (typeof document === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  try {
    const decoded = await decodeImageSource(file);
    try {
      const target = computeTargetDimensions(decoded.width, decoded.height, maxDimension);
      if (!target.scaled && file.size <= minBytes) {
        return file;
      }

      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext("2d");
      if (!context) {
        return file;
      }
      context.drawImage(decoded.source, 0, 0, target.width, target.height);

      let blob = await canvasToBlob(canvas, preferredMimeType, quality);
      if (!blob || (blob.type !== preferredMimeType && preferredMimeType === "image/webp")) {
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
      }
      if (!blob || blob.size === 0) {
        return file;
      }
      if (blob.size >= file.size && !target.scaled) {
        return file;
      }

      const outputType = blob.type || "image/jpeg";
      const ext = extensionForMimeType(outputType);
      return new File([blob], replaceFileExtension(file.name, ext), {
        type: outputType,
        lastModified: file.lastModified,
      });
    } finally {
      decoded.cleanup();
    }
  } catch {
    return file;
  }
}
