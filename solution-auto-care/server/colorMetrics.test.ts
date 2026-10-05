import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { measureVehicleChangeColor, rgbToHsv } from "./colorMetrics";

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

  it("focuses hue measurement on changed vehicle pixels instead of a matching background", async () => {
    const width = 40;
    const height = 40;
    const source = Buffer.alloc(width * height * 3);
    const preview = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 3;
        const inVehicle = x >= 10 && x < 30 && y >= 12 && y < 32;
        const sourceColor = inVehicle ? [130, 130, 130] : [20, 80, 180];
        const previewColor = inVehicle ? [7, 167, 146] : [20, 80, 180];
        source[offset] = sourceColor[0]!;
        source[offset + 1] = sourceColor[1]!;
        source[offset + 2] = sourceColor[2]!;
        preview[offset] = previewColor[0]!;
        preview[offset + 1] = previewColor[1]!;
        preview[offset + 2] = previewColor[2]!;
      }
    }
    const [sourcePng, previewPng] = await Promise.all([
      sharp(source, { raw: { width, height, channels: 3 } }).png().toBuffer(),
      sharp(preview, { raw: { width, height, channels: 3 } }).png().toBuffer(),
    ]);
    const result = await measureVehicleChangeColor(sourcePng, previewPng);
    expect(result.hue).toBeGreaterThan(160);
    expect(result.hue).toBeLessThan(180);
  });
});
