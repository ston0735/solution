import { readFile } from "node:fs/promises";

const sourcePath = "/home/ubuntu/webdev-static-assets/solution-hero-midnight.jpg";
const imageBase64 = (await readFile(sourcePath)).toString("base64");
const response = await fetch("http://localhost:3000/api/trpc/wrapPreview.generate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    json: {
      pantoneId: "PANTONE 2290 C",
      imageBase64,
    },
  }),
});

const payload = await response.json();
if (!response.ok || payload?.error) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const previewUrl = payload?.result?.data?.json?.previewUrl;
if (typeof previewUrl !== "string" || !previewUrl.startsWith("/manus-storage/")) {
  console.error("Expected a storage preview URL but received:", JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(`Wrap preview generation succeeded: ${previewUrl}`);
