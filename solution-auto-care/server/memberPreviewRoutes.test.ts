import { describe, expect, it } from "vitest";
import {
  parseMemberPreviewJson,
  serializeMemberPreviewHistory,
} from "./memberPreviewRoutes";
import type { MemberPreviewHistory } from "../drizzle/schema";

const sample: MemberPreviewHistory = {
  id: 9,
  userId: 3,
  previewUrl: "/manus-storage/generated/preview.png",
  originalImageUrl: "/manus-storage/member/original.jpg",
  pantoneId: "SRG181",
  catalogColorJson: JSON.stringify({
    code: "SRG181",
    category: "綠色系",
    categoryEn: "GREEN",
    name: "Racing Green",
    nameZh: "競速綠",
    swatch: "#2D6B4F",
  }),
  aspectRatio: "4:3",
  outputSize: "1536x1152",
  partialWrapCustomizations: JSON.stringify([
    { part: "roof", finish: "carbon_fiber" },
  ]),
  createdAt: new Date("2026-10-05T10:00:00.000Z"),
  retentionDays: 3,
  expiresAt: new Date("2026-10-08T10:00:00.000Z"),
  isSaved: 0,
};

describe("member preview CRM serialization", () => {
  it("keeps color metadata, original image and partial wrap choices", () => {
    const result = serializeMemberPreviewHistory(sample);
    expect(result.catalogColor?.nameZh).toBe("競速綠");
    expect(result.originalImageUrl).toContain("original.jpg");
    expect(result.partialWrapCustomizations).toEqual([
      { part: "roof", finish: "carbon_fiber" },
    ]);
    expect(result.isSaved).toBe(false);
    expect(result.createdAt).toBe("2026-10-05T10:00:00.000Z");
  });

  it("falls back safely when optional JSON metadata is malformed", () => {
    expect(parseMemberPreviewJson("not-json", [])).toEqual([]);
    expect(parseMemberPreviewJson(null, null)).toBeNull();
  });
});
