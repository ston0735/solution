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

export async function getAdminMemberDirectory(search = "") {
  const params = new URLSearchParams({ limit: "200" });
  if (search.trim()) params.set("search", search.trim());

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
