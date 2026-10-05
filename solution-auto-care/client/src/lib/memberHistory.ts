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
  return (await response.json()) as HistoryResponse;
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
