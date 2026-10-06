import {
  normalizePreviewHistoryItem,
  type PreviewHistoryItem,
} from "./memberHistory";

export type AdminMember = {
  id: number;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  createdAt: string;
  lastSignedIn: string;
  previewCount: number;
  savedPreviewCount: number;
};

export type AdminMemberPreview = PreviewHistoryItem;

export type AdminMemberFilters = {
  search?: string;
  vehicleModel?: string;
  pantoneId?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpStatus?: string;
};

export type AdminMemberDirectory = {
  summary: {
    totalMembers: number;
    newMembersLast7Days: number;
    activeMembersLast30Days: number;
    totalPreviews: number;
  };
  members: AdminMember[];
};

export class AdminMemberDirectoryError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AdminMemberDirectoryError";
  }
}

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export async function getAdminMemberDirectory(
  filters: AdminMemberFilters = {}
) {
  const params = new URLSearchParams({ limit: "200" });
  for (const [key, value] of Object.entries(filters)) {
    if (value?.trim()) params.set(key, value.trim());
  }

  const response = await fetch(`/api/admin/members?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AdminMemberDirectoryError(
      await readError(response, "CRM 會員資料暫時無法讀取。"),
      response.status
    );
  }
  return (await response.json()) as AdminMemberDirectory;
}

export async function getAdminMemberPreviews(memberId: number) {
  const response = await fetch(`/api/admin/members/${memberId}/previews`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AdminMemberDirectoryError(
      await readError(response, "這位會員的預覽資料暫時無法讀取。"),
      response.status
    );
  }
  const payload = (await response.json()) as Partial<{
    items: AdminMemberPreview[];
  }>;
  return {
    items: Array.isArray(payload.items)
      ? payload.items.map(normalizePreviewHistoryItem)
      : [],
  };
}

export type AdminPreviewUpdate = {
  followUpStatus: "new" | "contacted" | "quoted" | "booked" | "closed";
  adminTags: string[];
  adminNote: string;
};

export async function updateAdminMemberPreview(
  memberId: number,
  previewId: number,
  input: AdminPreviewUpdate
) {
  const response = await fetch(
    `/api/admin/members/${memberId}/previews/${previewId}`,
    {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!response.ok) {
    throw new AdminMemberDirectoryError(
      await readError(response, "預覽跟進資料暫時無法更新。"),
      response.status
    );
  }
  const payload = (await response.json()) as { item?: AdminMemberPreview };
  if (!payload.item) {
    throw new AdminMemberDirectoryError("CRM 回傳的預覽資料格式不完整。", 502);
  }
  return { item: normalizePreviewHistoryItem(payload.item) };
}
