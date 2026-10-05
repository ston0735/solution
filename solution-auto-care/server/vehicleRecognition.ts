import { invokeLLM } from "./_core/llm";

export type VehicleModelCandidate = {
  label: string;
  confidence: number;
};

export type VehicleRecognitionResult = {
  vehicleModelAi: string | null;
  vehicleModelAiConfidence: number;
  vehicleModelAiSource: "ai" | "manual_review" | "unavailable";
  vehicleModelAiCandidates: VehicleModelCandidate[];
};

type RawVehicleRecognition = {
  vehicleModel: string;
  confidence: number;
  candidates: VehicleModelCandidate[];
};

const VEHICLE_RECOGNITION_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("VEHICLE_RECOGNITION_TIMEOUT")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function clampConfidence(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(withoutFence);
}

export function parseVehicleRecognition(raw: string): RawVehicleRecognition {
  const parsed = parseJsonContent(raw) as Partial<RawVehicleRecognition>;
  if (
    typeof parsed.vehicleModel !== "string" ||
    !Array.isArray(parsed.candidates)
  ) {
    throw new Error("車款辨識回傳格式無法辨識。");
  }

  const candidates = parsed.candidates
    .filter(
      candidate =>
        candidate &&
        typeof candidate.label === "string" &&
        candidate.label.trim().length > 0,
    )
    .slice(0, 3)
    .map(candidate => ({
      label: candidate.label.trim().slice(0, 160),
      confidence: clampConfidence(candidate.confidence),
    }));

  return {
    vehicleModel: parsed.vehicleModel.trim().slice(0, 160),
    confidence: clampConfidence(parsed.confidence),
    candidates,
  };
}

function unavailableResult(): VehicleRecognitionResult {
  return {
    vehicleModelAi: null,
    vehicleModelAiConfidence: 0,
    vehicleModelAiSource: "unavailable",
    vehicleModelAiCandidates: [],
  };
}

export async function recognizeVehicleModel(
  originalImageDataUrl: string,
): Promise<VehicleRecognitionResult> {
  try {
    const response = await withTimeout(
      invokeLLM({
        maxTokens: 280,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "vehicle_model_recognition",
            strict: true,
            schema: {
              type: "object",
              properties: {
                vehicleModel: {
                  type: "string",
                  description:
                    "Make, model and useful generation/body style only when visually supported; use unknown when not identifiable.",
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                },
                candidates: {
                  type: "array",
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      confidence: { type: "number", minimum: 0, maximum: 100 },
                    },
                    required: ["label", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["vehicleModel", "confidence", "candidates"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You identify the passenger vehicle shown in a customer photo. Return only the requested JSON. Use visible badges, grille, headlights, body proportions, wheels and distinctive design cues. Never invent an exact trim, year or generation when the photo does not support it. If the vehicle is not identifiable, set vehicleModel to '無法可靠辨識' and confidence to 0. Keep the result concise and use a human-readable make/model label. This is an assistive CRM label and must be marked for manual review when confidence is below 75.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "請辨識這張客戶上傳照片中的車輛款式型號。優先輸出品牌＋車系／車型，若能可靠判斷再補充車身形式或世代；最多提供三個候選。",
              },
              {
                type: "image_url",
                image_url: { url: originalImageDataUrl, detail: "high" },
              },
            ],
          },
        ],
      }),
      VEHICLE_RECOGNITION_TIMEOUT_MS,
    );
    const content = response.choices[0]?.message.content;
    const raw = typeof content === "string" ? content : "";
    const parsed = parseVehicleRecognition(raw);
    const isUnknown =
      !parsed.vehicleModel || /無法可靠辨識|unknown|不確定/i.test(parsed.vehicleModel);
    const source =
      isUnknown || parsed.confidence < 75 ? "manual_review" : "ai";

    return {
      vehicleModelAi: isUnknown ? null : parsed.vehicleModel,
      vehicleModelAiConfidence: parsed.confidence,
      vehicleModelAiSource: source,
      vehicleModelAiCandidates: parsed.candidates,
    };
  } catch (error) {
    console.warn("[VehicleRecognition] unavailable", error);
    return unavailableResult();
  }
}
