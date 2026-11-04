import { describe, expect, it } from "vitest";
import { validateCmsPasswordChange } from "../../client/src/lib/cmsPassword";

describe("CMS password change form", () => {
  it("accepts a short current bootstrap password and a strong new password", () => {
    expect(
      validateCmsPasswordChange(
        "weak-start",
        "new-long-test-secret",
        "new-long-test-secret"
      )
    ).toBe("");
  });

  it("rejects empty current password, short new password, mismatched or unchanged password", () => {
    expect(
      validateCmsPasswordChange(
        "",
        "new-long-test-secret",
        "new-long-test-secret"
      )
    ).not.toBe("");
    expect(validateCmsPasswordChange("weak-start", "short", "short")).not.toBe(
      ""
    );
    expect(
      validateCmsPasswordChange(
        "weak-start",
        "new-long-test-secret",
        "other-long-secret"
      )
    ).not.toBe("");
    expect(
      validateCmsPasswordChange(
        "unchanged-test-secret",
        "unchanged-test-secret",
        "unchanged-test-secret"
      )
    ).not.toBe("");
  });
});
