import { invokeLLM } from "./_core/llm";
import type { CatalogColorContext } from "./wrapPreview";

export type ColorConsistencyReview = {
  status: "matched" | "mismatch" | "unavailable";
  confidence: number;
  message: string;
};

type VisionResponse = {
  isConsistent: boolean;
  confidence: number;
  observedColor: string;
  reason: string;
};

export function parseColorConsistencyReview(raw: string): VisionResponse {
  const parsed = JSON.parse(raw) as VisionResponse;
  if (typeof parsed.isConsistent !== "boolean" || typeof parsed.confidence !== "number" || typeof parsed.observedColor !== "string" || typeof parsed.reason !== "string") {
    throw new Error("色彩檢查回傳格式無法辨識。");
  }
  return { ...parsed, confidence: Math.max(0, Math.min(1, parsed.confidence)) };
}

export async function reviewColorConsistency({
  referenceImageUrl,
  previewImageUrl,
  color,
}: {
  referenceImageUrl: string;
  previewImageUrl: string;
  color: CatalogColorContext;
}): Promise<ColorConsistencyReview> {
  try {
    const response = await invokeLLM({
      maxTokens: 180,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "wrap_color_consistency_review",
          strict: true,
          schema: {
            type: "object",
            properties: {
              isConsistent: { type: "boolean" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              observedColor: { type: "string" },
              reason: { type: "string" },
            },
            required: ["isConsistent", "confidence", "observedColor", "reason"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: "You are a strict automotive wrap color-quality inspector. Compare only the physical material card and the painted vehicle body. Treat the material card as the authoritative target. Ignore reflected lights, glass, wheels, tires, trim, shadowed black areas, background, text, and logos. Mark inconsistent when the vehicle body is visibly in a different hue family from the card. Do not judge photo brightness differences alone as a mismatch.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Image 1 is the physical material card for ${color.code} (${color.category}, ${color.nameZh || color.name || "unnamed"}, target swatch ${color.swatch}). Image 2 is the generated vehicle preview. Decide whether the vehicle body color is visually consistent with the material card.` },
            { type: "image_url", image_url: { url: referenceImageUrl, detail: "high" } },
            { type: "image_url", image_url: { url: previewImageUrl, detail: "high" } },
          ],
        },
      ],
    });
    const content = response.choices[0]?.message.content;
    const raw = typeof content === "string" ? content : "";
    const review = parseColorConsistencyReview(raw);
    const mismatch = !review.isConsistent || review.confidence < 0.62;
    return mismatch
      ? { status: "mismatch", confidence: review.confidence, message: `色卡比對發現可能偏差：${review.observedColor}。建議重新生成。` }
      : { status: "matched", confidence: review.confidence, message: `色卡比對通過：車身主色與 ${color.code} 的材質色卡方向一致。` };
  } catch (error) {
    console.warn("[WrapPreview] color consistency review unavailable", error);
    return { status: "unavailable", confidence: 0, message: "已套用實體色卡參考；目前無法完成自動色相檢查，請以右上色卡對照。" };
  }
}
