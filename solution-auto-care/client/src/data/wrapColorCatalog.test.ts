import { describe, expect, it } from "vitest";
import { WRAP_COLOR_CATALOG, WRAP_COLOR_CATEGORY_COUNTS } from "./wrapColorCatalog";

describe("KSG wrap color catalog", () => {
  it("contains every extracted PDF color card with a unique color code", () => {
    expect(WRAP_COLOR_CATALOG).toHaveLength(184);
    expect(new Set(WRAP_COLOR_CATALOG.map(color => color.code)).size).toBe(184);
    expect(WRAP_COLOR_CATALOG.every(color => /^([A-Z]{1,4}\d{2,4}[A-Z]?)$/.test(color.code))).toBe(true);
  });

  it("preserves the PDF color-family grouping boundaries", () => {
    expect(WRAP_COLOR_CATEGORY_COUNTS).toMatchObject({
      "紅色系": 10,
      "橙色系": 6,
      "黃色系": 6,
      "綠色系": 33,
      "藍色系": 23,
      "紫色系": 13,
      "白色系": 9,
      "灰色系": 28,
      "黑色系": 15,
      "金色系": 7,
      "銀色系": 13,
      "粉色系": 12,
      "古銅色系": 2,
      "鈦鋼色系": 5,
      "碳纖維系列": 2,
    });
    expect(WRAP_COLOR_CATALOG.find(color => color.code === "KRC124F")?.category).toBe("紅色系");
    expect(WRAP_COLOR_CATALOG.find(color => color.code === "GMC263")?.category).toBe("碳纖維系列");
  });
});

