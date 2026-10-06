export type CrmAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CrmAssistantAction = {
  title: string;
  reason: string;
};

export type CrmAssistantResponse = {
  answer: string;
  suggestedActions: CrmAssistantAction[];
};

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "CRM AI 助手目前無法回應。";
  } catch {
    return "CRM AI 助手目前無法回應。";
  }
}

export async function askCrmAssistant(messages: CrmAssistantMessage[]) {
  const response = await fetch("/api/admin/assistant", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as CrmAssistantResponse;
}
