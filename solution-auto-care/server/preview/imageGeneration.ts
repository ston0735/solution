import sharp from "sharp";
import { PREVIEW_ENV } from "./env";
import { putBlobFile } from "./blobStore";
import type { VehicleImageDimensions } from "../wrapPreview";

/**
 * OpenAI Images Edits call for the Vercel-hosted preview service.
 *
 * The request contract mirrors `server/_core/imageGeneration.ts` on the Manus
 * backend: the vehicle photo is the first `image[]` reference and the physical
 * material card, when present, is the second one. Failures are collapsed into
 * stable `OPENAI_*` codes so visitors only ever see the customer-facing
 * wording from `getWrapPreviewErrorMessage`.
 */
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";
const DEFAULT_IMAGE_QUALITY = "medium";
const OPENAI_TIMEOUT_MS = 55_000;

export type PreviewInputImage = {
  url?: string;
  b64Json?: string;
  mimeType?: string;
};

export type GeneratePreviewImageOptions = {
  prompt: string;
  originalImages: PreviewInputImage[];
  size?: string;
  quality?: string;
  outputDimensions?: VehicleImageDimensions;
};

type OpenAIErrorPayload = {
  error?: { code?: string | null; type?: string | null };
};

function normalizedMimeType(mimeType?: string) {
  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp"
  ) {
    return mimeType;
  }
  return "image/png";
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

async function inputImageToBlob(image: PreviewInputImage): Promise<Blob> {
  const mimeType = normalizedMimeType(image.mimeType);
  if (image.b64Json) {
    const buffer = Buffer.from(
      image.b64Json.replace(/^data:[^;]+;base64,/, ""),
      "base64"
    );
    if (!buffer.length) throw new Error("OPENAI_INVALID_IMAGE_INPUT");
    return new Blob([new Uint8Array(buffer)], { type: mimeType });
  }
  if (image.url) {
    const response = await fetch(image.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error("OPENAI_INVALID_IMAGE_INPUT");
    const fetchedType = normalizedMimeType(
      response.headers.get("content-type")?.split(";")[0]
    );
    return new Blob([await response.arrayBuffer()], { type: fetchedType });
  }
  throw new Error("OPENAI_INVALID_IMAGE_INPUT");
}

async function toSafeOpenAIError(response: Response): Promise<Error> {
  let code = "";
  let type = "";
  try {
    const body = (await response.json()) as OpenAIErrorPayload;
    code = String(body.error?.code ?? "").toLowerCase();
    type = String(body.error?.type ?? "").toLowerCase();
  } catch {
    // Provider details stay server-side on purpose.
  }
  const descriptor = `${code} ${type}`;
  if (
    response.status === 401 ||
    response.status === 403 ||
    descriptor.includes("invalid_api_key")
  ) {
    return new Error("OPENAI_AUTH");
  }
  if (
    response.status === 402 ||
    descriptor.includes("insufficient_quota") ||
    descriptor.includes("billing_hard_limit") ||
    descriptor.includes("quota_exceeded")
  ) {
    return new Error("OPENAI_QUOTA");
  }
  if (response.status === 429 || descriptor.includes("rate_limit")) {
    return new Error("OPENAI_RATE_LIMIT");
  }
  if (
    descriptor.includes("moderation") ||
    descriptor.includes("content_policy")
  ) {
    return new Error("OPENAI_MODERATION");
  }
  return new Error("OPENAI_IMAGE_REQUEST_FAILED");
}

export async function generatePreviewImage(
  options: GeneratePreviewImageOptions
): Promise<{ url: string; buffer: Buffer }> {
  if (!PREVIEW_ENV.openAiApiKey) throw new Error("OPENAI_KEY_MISSING");
  const sourceImages = options.originalImages ?? [];
  if (!sourceImages.length || sourceImages.length > 16) {
    throw new Error("OPENAI_INVALID_IMAGE_INPUT");
  }

  const form = new FormData();
  form.set("model", PREVIEW_ENV.imageModel);
  form.set("prompt", options.prompt);
  form.set("quality", options.quality || DEFAULT_IMAGE_QUALITY);
  if (options.size) form.set("size", options.size);
  form.set("background", "opaque");
  form.set("output_format", "png");

  for (let index = 0; index < sourceImages.length; index += 1) {
    const image = sourceImages[index];
    if (!image) continue;
    const blob = await inputImageToBlob(image);
    form.append(
      "image[]",
      blob,
      `reference-${index + 1}.${extensionForMimeType(blob.type)}`
    );
  }

  const response = await fetch(OPENAI_IMAGE_EDITS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PREVIEW_ENV.openAiApiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  });
  if (!response.ok) throw await toSafeOpenAIError(response);

  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
    output_format?: "png" | "jpeg" | "webp";
  };
  const b64Json = result.data?.[0]?.b64_json;
  if (!b64Json) throw new Error("OPENAI_INVALID_RESPONSE");

  const outputMimeType =
    result.output_format === "jpeg"
      ? "image/jpeg"
      : result.output_format === "webp"
        ? "image/webp"
        : "image/png";

  let generated = Buffer.from(b64Json, "base64");
  if (options.outputDimensions) {
    generated = await sharp(generated)
      .resize({
        width: options.outputDimensions.width,
        height: options.outputDimensions.height,
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();
  }

  const key = `generated/vercel-wrap-preview-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extensionForMimeType(outputMimeType)}`;
  const url = await putBlobFile(key, generated, outputMimeType);
  return { url, buffer: generated };
}
