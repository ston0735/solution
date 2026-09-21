import { readFile } from "node:fs/promises";

const sourcePath = "/home/ubuntu/webdev-static-assets/solution-hero-midnight.jpg";
const imageBase64 = (await readFile(sourcePath)).toString("base64");
const response = await fetch("http://localhost:3000/api/trpc/wrapPreview.generate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    json: {
      pantoneId: "SLM171",
      imageBase64,
      catalogColor: {
        code: "SLM171",
        category: "銀色系",
        categoryEn: "Silver",
        name: "Liquid Metal Silver",
        nameZh: "TPU液態金屬銀",
        swatch: "#AAAAAF",
      },
    },
  }),
});

const payload = await response.json();
if (!response.ok || payload?.error) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const previewUrl = payload?.result?.data?.json?.previewUrl;
const materialReferenceUrl = payload?.result?.data?.json?.materialReferenceUrl;
const colorReview = payload?.result?.data?.json?.colorReview;
const colorMetrics = payload?.result?.data?.json?.colorMetrics;
if (typeof previewUrl !== "string" || !previewUrl.startsWith("/manus-storage/")) {
  console.error("Expected a storage preview URL but received:", JSON.stringify(payload, null, 2));
  process.exit(1);
}
if (typeof materialReferenceUrl !== "string" || !materialReferenceUrl.includes("SLM171_")) {
  console.error("Expected the SLM171 physical material-card reference but received:", JSON.stringify(payload, null, 2));
  process.exit(1);
}
if (!colorReview || !["matched", "mismatch", "unavailable"].includes(colorReview.status)) {
  console.error("Expected a color consistency review but received:", JSON.stringify(payload, null, 2));
  process.exit(1);
}
if (!colorMetrics || !["matched", "mismatch"].includes(colorMetrics.status) || typeof colorMetrics.hueDelta !== "number") {
  console.error("Expected numeric color metrics but received:", JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ previewUrl, materialReferenceUrl, colorReview, colorMetrics }, null, 2));
