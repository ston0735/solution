import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("OpenAI image edit request", () => {
  it("omits input_fidelity for GPT Image 2", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    let requestBody: FormData | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        requestBody = init?.body as FormData;
        return new Response(
          JSON.stringify({ error: { code: "invalid_request_error" } }),
          { status: 400, headers: { "content-type": "application/json" } }
        );
      })
    );

    const { generateImage, OPENAI_IMAGE_MODEL } = await import(
      "./imageGeneration"
    );
    const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff]).toString("base64");

    await expect(
      generateImage({
        prompt: "Edit this vehicle photo into a premium vinyl wrap preview.",
        originalImages: [{ b64Json: jpegBase64, mimeType: "image/jpeg" }],
        size: "1536x640",
      })
    ).rejects.toThrow("OPENAI_IMAGE_REQUEST_FAILED");

    expect(requestBody?.get("model")).toBe(OPENAI_IMAGE_MODEL);
    expect(requestBody?.get("input_fidelity")).toBeNull();
    expect(requestBody?.get("quality")).toBe("medium");
    expect(requestBody?.get("size")).toBe("1536x640");
  });
});
