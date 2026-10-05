export type PreviewHistoryItem = {
  id: number;
  previewUrl: string;
  originalImageUrl: string | null;
  pantoneId: string;
  aspectRatio: string;
  outputSize?: string | null;
  partialWrapCustomizations: Array<{ part?: string; finish?: string }>;
  createdAt: string;
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
  pantoneId: string;
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
