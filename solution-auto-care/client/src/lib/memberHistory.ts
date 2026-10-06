export type PreviewHistoryItem = {
  id: number;
  previewUrl: string;
  originalImageUrl: string | null;
  vehicleModel: string | null;
  vehicleModelAi: string | null;
  vehicleModelAiConfidence: number;
  vehicleModelAiSource: "ai" | "manual_review" | "pending" | "unavailable";
  vehicleModelAiCandidates: Array<{ label: string; confidence: number }>;
  pantoneId: string;
  catalogColor: {
    code: string;
    category: string;
    categoryEn: string;
    name: string;
    nameZh: string;
    swatch: string;
  } | null;
  aspectRatio: string;
  outputSize?: string | null;
  partialWrapCustomizations: Array<{ part?: string; finish?: string }>;
  followUpStatus: "new" | "contacted" | "quoted" | "booked" | "closed";
  adminTags: string[];
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  retentionDays: number;
  expiresAt: string;
  isSaved: boolean;
};

const FOLLOW_UP_STATUSES = new Set([
  "new",
  "contacted",
  "quoted",
  "booked",
  "closed",
]);

export function normalizePreviewHistoryItem(
  item: PreviewHistoryItem
): PreviewHistoryItem {
  const raw = item as Partial<PreviewHistoryItem>;
  const candidates = Array.isArray(raw.vehicleModelAiCandidates)
    ? raw.vehicleModelAiCandidates
        .filter(
          candidate =>
            candidate &&
            typeof candidate.label === "string" &&
            Number.isFinite(Number(candidate.confidence))
        )
        .slice(0, 3)
        .map(candidate => ({
          label: candidate.label.trim(),
          confidence: Math.max(
            0,
            Math.min(100, Math.round(Number(candidate.confidence)))
          ),
        }))
    : [];
  const followUpStatus = FOLLOW_UP_STATUSES.has(String(raw.followUpStatus))
    ? (raw.followUpStatus as PreviewHistoryItem["followUpStatus"])
    : "new";

  return {
    ...item,
    originalImageUrl:
      typeof raw.originalImageUrl === "string" ? raw.originalImageUrl : null,
    vehicleModelAi:
      typeof raw.vehicleModelAi === "string" ? raw.vehicleModelAi : null,
    vehicleModelAiConfidence: Number.isFinite(
      Number(raw.vehicleModelAiConfidence)
    )
      ? Math.max(
          0,
          Math.min(100, Math.round(Number(raw.vehicleModelAiConfidence)))
        )
      : 0,
    vehicleModelAiSource:
      raw.vehicleModelAiSource === "ai" ||
      raw.vehicleModelAiSource === "manual_review" ||
      raw.vehicleModelAiSource === "pending" ||
      raw.vehicleModelAiSource === "unavailable"
        ? raw.vehicleModelAiSource
        : "unavailable",
    vehicleModelAiCandidates: candidates,
    partialWrapCustomizations: Array.isArray(raw.partialWrapCustomizations)
      ? raw.partialWrapCustomizations
      : [],
    followUpStatus,
    adminTags: Array.isArray(raw.adminTags)
      ? raw.adminTags.filter((tag): tag is string => typeof tag === "string")
      : [],
    adminNote: typeof raw.adminNote === "string" ? raw.adminNote : null,
  };
}

type HistoryResponse = {
  items: PreviewHistoryItem[];
};

type CreateHistoryInput = {
  previewUrl: string;
  originalImageDataUrl: string;
  vehicleModel?: string | null;
  pantoneId: string;
  catalogColor?: PreviewHistoryItem["catalogColor"];
  aspectRatio: string;
  outputSize?: string | null;
  partialWrapCustomizations: Array<{ part?: string; finish?: string }>;
};

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export async function listMemberPreviewHistory() {
  const response = await fetch("/api/member-history?limit=50", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await readError(response, "無法讀取預覽歷史。"));
  }
  const payload = (await response.json()) as Partial<HistoryResponse>;
  return {
    items: Array.isArray(payload.items)
      ? payload.items.map(normalizePreviewHistoryItem)
      : [],
  };
}

export async function createMemberPreviewHistory(input: CreateHistoryInput) {
  const response = await fetch("/api/member-history", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "預覽歷史暫時無法保存。"));
  }
  return response.json() as Promise<{ item: PreviewHistoryItem }>;
}

export async function saveMemberPreviewHistory(id: number) {
  const response = await fetch(`/api/member-history/${id}/save`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await readError(response, "圖片保存期限暫時無法更新。"));
  }
  return response.json() as Promise<{ item: PreviewHistoryItem }>;
}
