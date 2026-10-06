import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import {
  hasUnlimitedMemberAccess,
  isUnlimitedMemberEmail,
} from "./memberEntitlements";

describe("member generation entitlements", () => {
  it("matches the requested member email case-insensitively", () => {
    expect(isUnlimitedMemberEmail("Jim700510@gmail.com")).toBe(true);
    expect(isUnlimitedMemberEmail(" jim700510@gmail.com ")).toBe(true);
  });

  it("does not grant access to missing or similar addresses", () => {
    expect(isUnlimitedMemberEmail(undefined)).toBe(false);
    expect(isUnlimitedMemberEmail("jim700510+test@gmail.com")).toBe(false);
    expect(isUnlimitedMemberEmail("other@example.com")).toBe(false);
  });

  it("does not contact the bridge when no member session is present", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const request = {
      headers: { cookie: "app_session_id=legacy-session" },
    } as unknown as Request;

    await expect(hasUnlimitedMemberAccess(request)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("resolves the allowlisted email from the bridge session server-side", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { data: { json: { email: "Jim700510@gmail.com" } } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const request = {
      headers: { cookie: "webdev_app_session=opaque-session" },
    } as unknown as Request;

    await expect(hasUnlimitedMemberAccess(request)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://solutionauth-zcgxwa4c.manus.space/api/trpc/auth.me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "webdev_app_session=opaque-session",
        }),
      })
    );
    fetchMock.mockRestore();
  });
});
