import { describe, expect, it } from "vitest";
import { parseColorConsistencyReview } from "./colorConsistency";

describe("color consistency review parsing", () => {
  it("parses and clamps a structured visual review", () => {
    expect(parseColorConsistencyReview('{"isConsistent":true,"confidence":1.2,"observedColor":"teal green","reason":"matched"}')).toEqual({
      isConsistent: true,
      confidence: 1,
      observedColor: "teal green",
      reason: "matched",
    });
  });

  it("rejects malformed visual review responses", () => {
    expect(() => parseColorConsistencyReview('{"isConsistent":"yes"}')).toThrow("格式無法辨識");
  });
});
