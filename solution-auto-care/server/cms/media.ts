import sharp from "sharp";
import { CmsValidationError } from "./errors";

export const MAX_RAW_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 25_000_000;

const DATA_URL_PATTERN =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/i;
const MEDIA_PATH_PATTERN = /^cms\/media\/[A-Za-z0-9_-]{16,128}\.webp$/;

function hasPrefix(buffer: Buffer, prefix: number[]): boolean {
  return prefix.every((byte, index) => buffer[index] === byte);
}

function getMagicMime(buffer: Buffer): string | null {
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function decodeBase64(encoded: string): Buffer {
  if (encoded.length === 0 || encoded.length % 4 !== 0) {
    throw new CmsValidationError("Invalid image data.");
  }

  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length === 0 || buffer.length > MAX_RAW_UPLOAD_BYTES) {
    throw new CmsValidationError("Image exceeds the 3 MB limit.");
  }

  // Buffer.from is intentionally permissive. Re-encode to reject ignored
  // characters and malformed padding rather than accepting hidden payloads.
  if (buffer.toString("base64") !== encoded) {
    throw new CmsValidationError("Invalid image data.");
  }
  return buffer;
}

export async function sanitizeImageDataUrl(dataUrl: unknown): Promise<Buffer> {
  if (typeof dataUrl !== "string") {
    throw new CmsValidationError("Image data is required.");
  }

  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw new CmsValidationError(
      "Only JPEG, PNG, and WebP data URLs are allowed."
    );
  }

  const declaredMime = match[1].toLowerCase();
  const raw = decodeBase64(match[2]);
  const actualMime = getMagicMime(raw);
  if (!actualMime || actualMime !== declaredMime) {
    throw new CmsValidationError(
      "Image MIME type does not match its file signature."
    );
  }

  let metadata: {
    width?: number;
    height?: number;
    pages?: number;
  };
  try {
    metadata = await sharp(raw, {
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();
  } catch {
    throw new CmsValidationError("Image could not be decoded.");
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const pages = metadata.pages ?? 1;
  if (
    width < 1 ||
    height < 1 ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    !Number.isSafeInteger(pages) ||
    width * height > MAX_IMAGE_PIXELS ||
    width * height * pages > MAX_IMAGE_PIXELS
  ) {
    throw new CmsValidationError("Image dimensions exceed the pixel limit.");
  }

  try {
    // rotate() applies EXIF orientation and WebP re-encoding strips metadata,
    // keeping only sanitized pixels in the private Blob store.
    return await sharp(raw, { limitInputPixels: MAX_IMAGE_PIXELS })
      .rotate()
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new CmsValidationError("Image could not be sanitized.");
  }
}

export function sanitizeUploadFilename(value: unknown): string {
  if (typeof value !== "string") {
    throw new CmsValidationError("Filename is required.");
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new CmsValidationError("Filename is invalid.");
  }

  const safe = trimmed
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "_");
  if (!safe) throw new CmsValidationError("Filename is invalid.");
  return safe;
}

export function isSafeMediaPath(value: unknown): value is string {
  return typeof value === "string" && MEDIA_PATH_PATTERN.test(value);
}

export function createMediaPath(): string {
  return `cms/media/${crypto.randomUUID()}.webp`;
}

export function createMediaUrl(pathname: string): string {
  return `/api/cms/media?key=${encodeURIComponent(pathname)}`;
}
