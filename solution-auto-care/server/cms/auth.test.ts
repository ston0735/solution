import { describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { authenticateCmsAdmin, CMS_AUTH_ME_URL } from "./auth";
import { CmsAuthError } from "./errors";

function requestWithHeaders(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("CMS remote admin authentication", () => {
  it("forwards supported auth headers and accepts only a SuperJSON admin user", async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(CMS_AUTH_ME_URL);
        const headers = new Headers(init?.headers);
        expect(headers.get("cookie")).toBe("app_session_id=original-session");
        expect(headers.get("x-manus-cookie")).toBe(
          "app_session_id=relay-session"
        );
        expect(headers.get("authorization")).toBe("Bearer original-session");
        return response(200, [
          { result: { data: { json: { openId: "admin-1", role: "admin" } } } },
        ]);
      }
    );

    const user = await authenticateCmsAdmin(
      requestWithHeaders({
        cookie: "app_session_id=original-session",
        "x-manus-cookie": "app_session_id=relay-session",
        authorization: "Bearer original-session",
      }),
      fetchImpl
    );
    expect(user.role).toBe("admin");
  });

  it("returns 403 for a valid non-admin and 401 for no valid user", async () => {
    const nonAdmin = authenticateCmsAdmin(requestWithHeaders({}), async () =>
      response(200, [{ result: { data: { json: { role: "user" } } } }])
    );
    await expect(nonAdmin).rejects.toMatchObject({ status: 403 });

    const noUser = authenticateCmsAdmin(requestWithHeaders({}), async () =>
      response(200, [{ result: { data: { json: null } } }])
    );
    await expect(noUser).rejects.toMatchObject({ status: 401 });
  });

  it("fails closed as 503 when the original auth service fails", async () => {
    const unavailable = authenticateCmsAdmin(requestWithHeaders({}), async () =>
      response(503, { error: "upstream" })
    );
    await expect(unavailable).rejects.toMatchObject({ status: 503 });

    const networkFailure = authenticateCmsAdmin(
      requestWithHeaders({}),
      async () => {
        throw new Error("network failure");
      }
    );
    await expect(networkFailure).rejects.toBeInstanceOf(CmsAuthError);
  });
});
