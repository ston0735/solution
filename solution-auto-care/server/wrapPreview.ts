import { WRAP_COLOR_REFERENCE_KEYS } from "@shared/wrapColorReferenceKeys";
import { PARTIAL_WRAP_FINISHES, PARTIAL_WRAP_PARTS, type PartialWrapCustomization, type PartialWrapFinish, type PartialWrapPartId } from "@shared/partialWrapOptions";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type CatalogColorContext = {
  code: string;
  category: string;
  categoryEn: string;
  name: string;
  nameZh: string;
  swatch: string;
};

const allowedPartialWrapPartIds = new Set<PartialWrapPartId>(Object.keys(PARTIAL_WRAP_PARTS) as PartialWrapPartId[]);
const allowedPartialWrapFinishes = new Set<PartialWrapFinish>(Object.keys(PARTIAL_WRAP_FINISHES) as PartialWrapFinish[]);

export function normalizePartialWrapCustomizations(items: PartialWrapCustomization[] = []) {
  if (items.length > Object.keys(PARTIAL_WRAP_PARTS).length) {
    throw new Error("局部包膜選項數量不正確，請重新選擇。");
  }

  const selectedParts = new Set<string>();
  return items.map(item => {
    if (!allowedPartialWrapPartIds.has(item.part) || !allowedPartialWrapFinishes.has(item.finish)) {
      throw new Error("局部包膜僅支援指定零件的黑化或碳纖維效果。");
    }
    if (selectedParts.has(item.part)) {
      throw new Error("同一個局部零件不能重複選擇，請重新設定。");
    }
    selectedParts.add(item.part);
    return item;
  });
}

export function normalizePantoneId(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function assertPantoneId(value: string) {
  const pantoneId = normalizePantoneId(value);
  if (pantoneId.length < 2 || pantoneId.length > 48 || !/^[A-Z0-9# .+-]+$/.test(pantoneId)) {
    throw new Error("請選擇或輸入有效的型錄色號或 Pantone 色號。");
  }
  return pantoneId;
}

export function decodeVehicleImage(base64Image: string) {
  const normalized = base64Image.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const buffer = Buffer.from(normalized, "base64");

  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("請上傳小於 6MB 的 JPG、PNG 或 WEBP 車輛照片。");
  }

  const mimeType = detectImageMimeType(buffer);
  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    throw new Error("檔案格式不支援，請上傳 JPG、PNG 或 WEBP 車輛照片。");
  }

  return { buffer, mimeType };
}

function detectImageMimeType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return undefined;
}

export function imageExtension(mimeType: string) {
  return mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
}

export function getWrapPreviewErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("usage exhausted") || normalizedMessage.includes("usage_exhausted")) {
    return "AI 圖片生成服務目前的可用額度已用盡，暫時無法生成預覽；請稍後再試。";
  }

  if (
    normalizedMessage.includes("429") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "AI 圖片生成服務目前較忙碌，請稍後再試。";
  }

  return error instanceof Error && error.message
    ? error.message
    : "目前無法生成包膜預覽，請稍後再試。";
}

function normalizeCatalogColorContext(catalogColor?: CatalogColorContext) {
  if (!catalogColor) return undefined;

  const swatch = catalogColor.swatch.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(swatch)) {
    throw new Error("型錄色卡的色樣資料格式不正確，請重新選擇色號。");
  }

  const category = catalogColor.category.trim();
  const categoryEn = catalogColor.categoryEn.trim();
  const code = catalogColor.code.trim().toUpperCase();
  if (!category || !categoryEn || !code) {
    throw new Error("型錄色卡資料不完整，請重新選擇色號。");
  }

  return {
    code,
    category,
    categoryEn,
    name: catalogColor.name.trim(),
    nameZh: catalogColor.nameZh.trim(),
    swatch,
  };
}

export function getCatalogColorReferenceKey(pantoneId: string, catalogColor?: CatalogColorContext) {
  const normalized = normalizeCatalogColorContext(catalogColor);
  if (!normalized) return undefined;
  if (normalized.code !== pantoneId) {
    throw new Error("所選型錄色號與色卡參考不一致，請重新選擇色號。");
  }

  const referenceKey = WRAP_COLOR_REFERENCE_KEYS[normalized.code];
  if (!referenceKey) {
    throw new Error("找不到此型錄色號的實體色卡參考，請重新選擇色號。");
  }
  return referenceKey;
}

function getCatalogColorDirection(catalogColor?: CatalogColorContext) {
  const normalized = normalizeCatalogColorContext(catalogColor);
  if (!normalized) {
    return "Use the intended color reference supplied by the customer. Do not infer a different color from reflections or the original paint.";
  }

  const red = Number.parseInt(normalized.swatch.slice(1, 3), 16);
  const green = Number.parseInt(normalized.swatch.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.swatch.slice(5, 7), 16);
  const name = normalized.nameZh || normalized.name || "no formal name provided";
  const isGreenFamily = normalized.categoryEn.toLowerCase() === "green";
  const antiDrift = isGreenFamily
    ? "This is a green-family target. Keep a green to teal-green dominant hue matching the supplied swatch. It must not become purple, violet, magenta, fuchsia, lavender, burgundy, or red under any lighting."
    : `Keep the result within the ${normalized.categoryEn.toLowerCase()} color family; do not substitute an unrelated hue because of reflections or stylization.`;

  return `CATALOG COLOR IS THE AUTHORITATIVE COLOR REFERENCE: code ${normalized.code}; family ${normalized.category} (${normalized.categoryEn}); name ${name}; target swatch ${normalized.swatch} (RGB ${red}, ${green}, ${blue}). Match this hue and saturation across the painted body panels, allowing only physically realistic highlight and shadow variation. ${antiDrift}`;
}

export function buildWrapPreviewPrompt(pantoneId: string, catalogColor?: CatalogColorContext, hasMaterialReference = false, partialWrapCustomizations: PartialWrapCustomization[] = []) {
  const catalogColorDirection = getCatalogColorDirection(catalogColor);
  const partialWrapDirection = normalizePartialWrapCustomizations(partialWrapCustomizations);
  const partialWrapInstructions = partialWrapDirection.length
    ? `ADDITIONAL PARTIAL WRAP REQUESTS: ${partialWrapDirection.map((item, index) => `${index + 1}. Apply ${PARTIAL_WRAP_FINISHES[item.finish].promptLabel} to ${PARTIAL_WRAP_PARTS[item.part].promptLabel}.`).join(" ")} Only alter these explicitly selected components if they are visible in the source image. Preserve their original shape, panel gaps, badges, lights, and all adjacent surfaces. Do not apply black or carbon fiber to any unselected part.`
    : "No partial-wrap accents have been selected. Keep mirrors, roof, spoiler, and lower bumper details in their original finish.";
  const materialReferenceDirection = hasMaterialReference
    ? "The first supplied image is the customer vehicle. The second supplied image is the actual physical KSG material card for the selected code. Use the second image only as the authoritative visual color and finish reference: transfer its hue, saturation, lightness, metallic or pearl character, and fine surface texture to the vehicle body panels. Do not copy the card shape, labels, logo, text, holes, or background. Never substitute a merely plausible color."
    : "The supplied image is the customer vehicle photograph.";
  return `Edit the supplied customer vehicle photograph into a photorealistic premium automotive vinyl-wrap concept preview. ${materialReferenceDirection} Preserve the exact vehicle make, model, body shape, wheels, tires, glass, lights, badges, trim, camera angle, crop, location, background, people, reflections, and lighting. Change only the exterior painted body panels to a uniform professionally installed full vehicle wrap using the intended KSG catalog color code or PANTONE color reference ${pantoneId}. ${catalogColorDirection} ${partialWrapInstructions} The finish should look like high-quality wrap film with realistic panel reflections, clean edges, consistent coverage, and natural material depth. Do not recolor windows, lights, wheels, tires, chrome, black plastic trim, road, or background except for the explicitly selected partial-wrap elements. Do not add or remove objects. No text, no watermarks, no new logos, no license plate changes. This is a color concept preview, not a production color specification.`;
}
