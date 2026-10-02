import { storagePut } from "server/storage";
import { ENV } from "./env";

/** OpenAI model selected after credential validation. */
export const OPENAI_IMAGE_MODEL = "gpt-image-2";
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";
const DEFAULT_IMAGE_QUALITY = "medium";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  /** OpenAI GPT Image model ID. Defaults to gpt-image-2. */
  model?: string;
  /** GPT Image quality: low, medium, or high. */
  quality?: string;
};

export type GenerateImageResponse = {
  url?: string;
};

export type ImageModelInfo = {
  model?: string;
  id?: string;
};

export type ListImageModelsResponse = {
  models: ImageModelInfo[];
};

type OpenAIErrorPayload = {
  error?: {
    code?: string | null;
    type?: string | null;
  };
};

function normalizedMimeType(mimeType?: string) {
  if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp") return mimeType;
  return "image/png";
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

async function inputImageToBlob(
  image: NonNullable<GenerateImageOptions["originalImages"]>[number],
): Promise<Blob> {
  const mimeType = normalizedMimeType(image.mimeType);

  if (image.b64Json) {
    const buffer = Buffer.from(image.b64Json.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!buffer.length) throw new Error("OPENAI_INVALID_IMAGE_INPUT");
    const bytes = new Uint8Array(buffer.length);
    bytes.set(buffer);
    return new Blob([bytes.buffer], { type: mimeType });
  }

  if (image.url) {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error("OPENAI_INVALID_IMAGE_INPUT");
    const fetchedType = normalizedMimeType(response.headers.get("content-type")?.split(";")[0]);
    return new Blob([await response.arrayBuffer()], { type: fetchedType });
  }

  throw new Error("OPENAI_INVALID_IMAGE_INPUT");
}

async function toSafeOpenAIError(response: Response) {
  let code = "";
  let type = "";
  try {
    const body = (await response.json()) as OpenAIErrorPayload;
    code = String(body.error?.code ?? "").toLowerCase();
    type = String(body.error?.type ?? "").toLowerCase();
  } catch {
    // Provider response details are intentionally not surfaced to website visitors.
  }

  const descriptor = `${code} ${type}`;
  if (response.status === 401 || response.status === 403 || descriptor.includes("invalid_api_key")) {
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
  if (descriptor.includes("moderation") || descriptor.includes("content_policy")) {
    return new Error("OPENAI_MODERATION");
  }
  return new Error("OPENAI_IMAGE_REQUEST_FAILED");
}

/**
 * Edit a customer vehicle image with the OpenAI Images Edits API.
 * Each supplied source image is uploaded as an image[] reference; the first is
 * the vehicle photo and the optional second is the physical material-card image.
 */
export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (!ENV.openAiApiKey) throw new Error("OPENAI_KEY_MISSING");

  const sourceImages = options.originalImages ?? [];
  if (!sourceImages.length || sourceImages.length > 16) {
    throw new Error("OPENAI_INVALID_IMAGE_INPUT");
  }

  const form = new FormData();
  form.set("model", options.model || OPENAI_IMAGE_MODEL);
  form.set("prompt", options.prompt);
  form.set("quality", options.quality || DEFAULT_IMAGE_QUALITY);
  form.set("input_fidelity", "high");
  form.set("background", "opaque");
  form.set("output_format", "png");

  for (let index = 0; index < sourceImages.length; index += 1) {
    const image = sourceImages[index];
    if (!image) continue;
    const blob = await inputImageToBlob(image);
    const filename = `reference-${index + 1}.${extensionForMimeType(blob.type)}`;
    form.append("image[]", blob, filename);
  }

  const response = await fetch(OPENAI_IMAGE_EDITS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.openAiApiKey}`,
    },
    body: form,
  });

  if (!response.ok) throw await toSafeOpenAIError(response);

  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
    output_format?: "png" | "jpeg" | "webp";
  };
  const b64Json = result.data?.[0]?.b64_json;
  if (!b64Json) throw new Error("OPENAI_INVALID_RESPONSE");

  const outputMimeType = normalizedMimeType(
    result.output_format === "jpeg"
      ? "image/jpeg"
      : result.output_format === "webp"
        ? "image/webp"
        : "image/png",
  );
  const { url } = await storagePut(
    `generated/openai-wrap-preview-${Date.now()}.${extensionForMimeType(outputMimeType)}`,
    Buffer.from(b64Json, "base64"),
    outputMimeType,
  );
  return { url };
}

/** The site intentionally pins its supported image editing model. */
export async function listImageModels(): Promise<ListImageModelsResponse> {
  return { models: [{ model: OPENAI_IMAGE_MODEL, id: OPENAI_IMAGE_MODEL }] };
}
