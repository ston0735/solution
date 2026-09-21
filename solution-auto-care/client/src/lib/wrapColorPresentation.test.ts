import { describe, expect, it } from "vitest";
import { WRAP_COLOR_CATALOG } from "@/data/wrapColorCatalog";
import { getWrapColorPresentation } from "./wrapColorPresentation";

describe("wrap color presentation", () => {
  it("shows the formal color name together with its color family when PDF metadata exists", () => {
    const color = WRAP_COLOR_CATALOG.find(item => item.code === "KMM120P");
    expect(color).toBeDefined();
    expect(getWrapColorPresentation(color!)).toEqual({
      category: "紅色系",
      descriptorLabel: "色卡名稱",
      descriptor: "TPU桃紅木",
    });
  });

  it("shows an explicit catalog note when the PDF does not provide a readable formal color name", () => {
    const color = WRAP_COLOR_CATALOG.find(item => item.code === "KRC124F");
    expect(color).toBeDefined();
    expect(getWrapColorPresentation(color!)).toEqual({
      category: "紅色系",
      descriptorLabel: "型錄註記",
      descriptor: "此 PDF 色卡未標註正式色名",
    });
  });
});
