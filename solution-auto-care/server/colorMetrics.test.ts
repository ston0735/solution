import { describe, expect, it } from "vitest";
import { rgbToHsv } from "./colorMetrics";

describe("color metric helpers", () => {
  it("converts teal RGB values into the expected hue family", () => {
    const teal = rgbToHsv(7, 167, 146);
    expect(teal.hue).toBeGreaterThan(160);
    expect(teal.hue).toBeLessThan(180);
    expect(teal.saturation).toBeGreaterThan(0.9);
  });

  it("recognizes neutral silver as low saturation", () => {
    const silver = rgbToHsv(170, 170, 175);
    expect(silver.saturation).toBeLessThan(0.04);
  });
});
