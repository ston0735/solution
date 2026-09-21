import { describe, expect, it } from "vitest";
import { assertPantoneId, buildWrapPreviewPrompt, decodeVehicleImage, getCatalogColorReferenceKey, getWrapPreviewErrorMessage, imageExtension, normalizePartialWrapCustomizations } from "./wrapPreview";

describe("wrap preview validation", () => {
  it("normalizes a Pantone identifier and retains it in the edit prompt", () => {
    const pantoneId = assertPantoneId(" pantone 2290 c ");
    expect(pantoneId).toBe("PANTONE 2290 C");
    expect(buildWrapPreviewPrompt(pantoneId)).toContain("PANTONE 2290 C");
    expect(buildWrapPreviewPrompt(pantoneId)).toContain("Preserve the exact vehicle");
  });

  it("accepts a KSG catalog color code and identifies catalog references in the edit prompt", () => {
    const catalogCode = assertPantoneId(" krc124f ");
    expect(catalogCode).toBe("KRC124F");
    expect(buildWrapPreviewPrompt(catalogCode)).toContain("KSG catalog color code");
    expect(buildWrapPreviewPrompt(catalogCode)).toContain("KRC124F");
  });

  it("uses the selected catalog swatch to prevent green color codes from drifting to purple", () => {
    const prompt = buildWrapPreviewPrompt("SRG181", {
      code: "SRG181",
      category: "綠色系",
      categoryEn: "Green",
      name: "",
      nameZh: "",
      swatch: "#07a792",
    });

    expect(prompt).toContain("target swatch #07A792 (RGB 7, 167, 146)");
    expect(prompt).toContain("green to teal-green dominant hue");
    expect(prompt).toContain("must not become purple, violet, magenta");
  });

  it("uses the exact uploaded material-card reference for a selected catalog color", () => {
    const color = {
      code: "SRG181",
      category: "綠色系",
      categoryEn: "Green",
      name: "Retro Green",
      nameZh: "TPU超級復古綠",
      swatch: "#07A792",
    };
    const prompt = buildWrapPreviewPrompt("SRG181", color, true);

    expect(getCatalogColorReferenceKey("SRG181", color)).toContain("SRG181_");
    expect(prompt).toContain("second supplied image is the actual physical KSG material card");
    expect(prompt).toContain("Never substitute a merely plausible color");
    expect(() => getCatalogColorReferenceKey("KRC124F", color)).toThrow("不一致");
  });

  it("adds only selected partial parts with blackout or carbon-fiber finishes to the prompt", () => {
    const partialWraps = normalizePartialWrapCustomizations([
      { part: "mirrors", finish: "blackout" },
      { part: "roof", finish: "carbon_fiber" },
    ]);
    const prompt = buildWrapPreviewPrompt("SRG181", undefined, false, partialWraps);

    expect(prompt).toContain("both exterior side mirrors");
    expect(prompt).toContain("deep neutral black automotive vinyl wrap");
    expect(prompt).toContain("the entire exterior roof panel only");
    expect(prompt).toContain("realistic black carbon-fiber vinyl film");
    expect(prompt).toContain("Do not apply black or carbon fiber to any unselected part");
  });

  it("rejects duplicate or unsupported partial wrap options", () => {
    expect(() => normalizePartialWrapCustomizations([
      { part: "spoiler", finish: "blackout" },
      { part: "spoiler", finish: "carbon_fiber" },
    ])).toThrow("重複");
    expect(() => normalizePartialWrapCustomizations([
      { part: "door" as "mirrors", finish: "blackout" },
    ])).toThrow("僅支援");
  });

  it("accepts a JPEG payload and rejects unsupported content", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00]);
    expect(decodeVehicleImage(jpeg.toString("base64")).mimeType).toBe("image/jpeg");
    expect(imageExtension("image/jpeg")).toBe("jpg");
    expect(() => decodeVehicleImage(Buffer.from("not-an-image").toString("base64"))).toThrow("檔案格式不支援");
  });

  it("translates exhausted image-service usage into a clear retry message", () => {
    const error = new Error('Image generation request failed (400 Bad Request): {"code":"failed_precondition","message":"your account has hit a usage exhausted"}');
    expect(getWrapPreviewErrorMessage(error)).toContain("可用額度已用盡");
    expect(getWrapPreviewErrorMessage(error)).not.toContain("failed_precondition");
  });

  it("translates rate-limit failures without exposing provider details", () => {
    expect(getWrapPreviewErrorMessage(new Error("429 Too Many Requests"))).toContain("較忙碌");
  });
});
