import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";
import {
  assertPantoneId,
  buildWrapPreviewPrompt,
  decodeVehicleImage,
  getCatalogColorReferenceKey,
  getImageAspectRatioLabel,
  getImageGenerationSize,
  getImageOutputDimensions,
  getVehicleImageDimensions,
  getWrapPreviewErrorMessage,
  normalizePartialWrapCustomizations,
} from "../wrapPreview";
import { measureColorConsistency } from "../colorMetrics";
import { hasUnlimitedMemberAccess } from "../memberEntitlements";
import {
  getMaterialCardAssetPath,
  getMaterialCardRawUrl,
} from "@shared/wrapAssetPaths";
import { PREVIEW_ENV } from "./env";
import { generatePreviewImage } from "./imageGeneration";
import {
  deleteByUrl,
  getBlobToken,
  isStoredBlobUrl,
  putBlobFile,
  readBlobBuffer,
  readBlobWithStatus,
} from "./blobStore";
import {
  claimGeneration,
  createPreviewCacheKey,
  getCachedPreview,
  getClientIp,
  hashClientIp,
  isRateLimitBypassed,
  releaseGeneration,
  saveCachedPreview,
  type PreviewUsageClaim,
} from "./limits";

/**
 * Vercel-hosted replacement for the `wrapPreview.generate` / `wrapPreview.health`
 * procedures of the Manus backend.
 *
 * The response envelope is byte-compatible with tRPC's batched HTTP format so
 * the existing `@trpc/client` setup in `client/src` keeps working unchanged.
 */
const generateInputSchema = z.object({
  pantoneId: z.string().min(2).max(48),
  // Vercel caps a function request body, so the browser resizes the photo
  // before upload; this ceiling keeps the encoded payload inside that cap.
  imageBase64: z.string().min(16).max(3_900_000),
  catalogColor: z
    .object({
      code: z.string().min(2).max(48),
      category: z.string().min(1).max(40),
      categoryEn: z.string().min(1).max(40),
      name: z.string().max(80),
      nameZh: z.string().max(80),
      swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    })
    .optional(),
  partialWrapCustomizations: z
    .array(
      z.object({
        part: z.enum(["mirrors", "roof", "spoiler", "frontLowerBumper"]),
        finish: z.enum(["blackout", "carbon_fiber"]),
      })
    )
    .max(4)
    .optional(),
});

export type WrapPreviewResponse = {
  previewUrl: string;
  pantoneId: string;
  materialReferenceUrl?: string;
  colorReview: {
    status: string;
    confidence: number;
    message: string;
    observedColor?: string;
    reason?: string;
  };
  colorMetrics: Awaited<ReturnType<typeof measureColorConsistency>> | undefined;
  partialWrapCustomizations: ReturnType<
    typeof normalizePartialWrapCustomizations
  >;
  outputSize: string;
  aspectRatio: string;
};

const COLOR_REVIEW_UNAVAILABLE_MESSAGE =
  "本次預覽未執行伺服器端色彩審查；顏色仍以所選型錄色號為準。";

function sendTrpcSuccess(res: Response, payload: unknown): void {
  res
    .status(200)
    .type("json")
    .send([
      {
        result: {
          data: { json: payload },
        },
      },
    ]);
}

function sendTrpcError(
  res: Response,
  message: string,
  path: string,
  httpStatus = 500
): void {
  res
    .status(httpStatus)
    .type("json")
    .send([
      {
        error: {
          json: {
            message,
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus, path },
          },
        },
      },
    ]);
}

/** Accepts both the batched `{ "0": { json } }` and the flat `{ json }` shape. */
function readSuperJsonInput(body: unknown): unknown {
  if (!body || typeof body !== "object") return undefined;
  const root = body as Record<string, unknown>;
  const first =
    (Array.isArray(root) ? root[0] : undefined) ??
    root["0"] ??
    (typeof root.json === "object" || typeof root.json === "string"
      ? root
      : undefined);
  if (!first || typeof first !== "object") return undefined;
  return (first as { json?: unknown }).json;
}

async function loadCatalogMaterialReference(key?: string) {
  if (!key) return undefined;
  const candidates = [
    getMaterialCardRawUrl(key),
    `${PREVIEW_ENV.materialCardFallbackOrigin}/manus-storage/${key}`,
  ];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) continue;
      const contentType =
        response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) continue;
      return {
        b64Json: buffer.toString("base64"),
        mimeType: contentType,
        signedUrl: candidate,
        buffer,
      };
    } catch {
      // Try the next source before failing the request.
    }
  }
  throw new Error("型錄色卡參考檔目前無法讀取，請稍後再試。");
}

function isKnownGuardError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.startsWith("PREVIEW_");
}

export function createPreviewApp(): Express {
  const app = express();
  // Vercel enforces its own request body ceiling in front of the function.
  app.use(express.json({ limit: "4mb" }));

  const operations = new Set(["generate", "health", "image", "storage-check"]);
  // Vercel only builds one route for `api/wrap-preview.ts`, so the operations
  // are addressed with `?op=` exactly like the CMS entry does, and normalised
  // here so the handlers can stay path based.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const operation = typeof req.query.op === "string" ? req.query.op : "";
    if (!operations.has(operation)) return next();
    const queryIndex = req.url.indexOf("?");
    req.url = `/${operation}${queryIndex === -1 ? "" : req.url.slice(queryIndex)}`;
    return next();
  });

  // Both path shapes are registered because Vercel may or may not strip the
  // function mount path before handing the request to Express.
  const healthPaths = ["/health", "/api/wrap-preview/health"];
  const generatePaths = ["/generate", "/api/wrap-preview/generate"];
  const imagePaths = ["/image", "/api/wrap-preview/image"];
  const storageCheckPaths = [
    "/storage-check",
    "/api/wrap-preview/storage-check",
  ];

  /**
   * The project's Blob store is private, so previews are streamed through this
   * route with the store credential. Visitors receive a same-origin path only.
   */
  app.get(imagePaths, async (req: Request, res: Response) => {
    const target = String(req.query.u ?? "");
    if (!isStoredBlobUrl(target)) {
      res.status(400).type("json").send({ error: "invalid_preview_reference" });
      return;
    }
    try {
      const buffer = await readBlobBuffer(target);
      const extension = target.split("?")[0]?.split(".").pop()?.toLowerCase();
      res.setHeader(
        "Cache-Control",
        "public, max-age=86400, stale-while-revalidate=604800"
      );
      res.setHeader(
        "Content-Type",
        extension === "webp"
          ? "image/webp"
          : extension === "jpg"
            ? "image/jpeg"
            : "image/png"
      );
      res.status(200).send(buffer);
    } catch (error) {
      console.error("[WrapPreview] preview image read failed", error);
      res.status(502).type("json").send({ error: "preview_unavailable" });
    }
  });

  /**
   * Deployment diagnostic: proves the store credential, private write and
   * read-back all work without exposing any value.
   */
  app.get(storageCheckPaths, async (_req: Request, res: Response) => {
    const report: Record<string, unknown> = {
      runtime: "vercel",
      tokenConfigured: Boolean(getBlobToken()),
      writeOk: false,
      readStatus: 0,
      readBytes: 0,
      contentType: "",
      cleanupOk: false,
    };
    try {
      const key = `generated/vercel-wrap-preview-storage-check-${Date.now()}.png`;
      const url = await putBlobFile(
        key,
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png"
      );
      report.writeOk = true;
      const read = await readBlobWithStatus(url);
      report.readStatus = read.status;
      report.readBytes = read.byteLength;
      report.contentType = read.contentType;
      await deleteByUrl(url);
      report.cleanupOk = true;
    } catch (error) {
      report.error =
        error instanceof Error
          ? error.message.slice(0, 160)
          : String(error).slice(0, 160);
    }
    res.setHeader("Cache-Control", "no-store, private");
    res.status(200).type("json").send(report);
  });

  app.get(healthPaths, (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, private");
    sendTrpcSuccess(res, {
      provider: "openai",
      model: PREVIEW_ENV.imageModel,
      credentialConfigured: Boolean(PREVIEW_ENV.openAiApiKey),
      runtime: "vercel",
      limits: {
        dailyGenerationsPerIp: PREVIEW_ENV.dailyGenerationsPerIp,
        concurrentGenerationsPerIp: PREVIEW_ENV.concurrentGenerationsPerIp,
        rateLimitBypassConfigured:
          PREVIEW_ENV.rateLimitBypassIps.trim().length > 0,
      },
    });
  });

  app.post(generatePaths, async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, private");
    let usageClaim: PreviewUsageClaim | undefined;
    let generationCompleted = false;

    try {
      const rawInput = readSuperJsonInput(req.body);
      const parsed = generateInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new Error("上傳資料格式不完整，請重新上傳車照後再試。");
      }
      const input = parsed.data;

      const clientIp = getClientIp(req.headers);
      const ipHash = hashClientIp(clientIp);
      const cacheKey = createPreviewCacheKey(
        ipHash,
        input as unknown as Record<string, unknown>
      );
      const cached = await getCachedPreview<WrapPreviewResponse>(cacheKey);
      if (cached) {
        sendTrpcSuccess(res, cached);
        return;
      }

      if (!isRateLimitBypassed(clientIp)) {
        try {
          const hasUnlimitedAccess = await hasUnlimitedMemberAccess(req);
          usageClaim = await claimGeneration(ipHash, {
            skipDailyLimit: hasUnlimitedAccess,
          });
        } catch (error) {
          if (isKnownGuardError(error)) throw error;
          console.error("[WrapPreview] usage guard unavailable", error);
          throw new Error("PREVIEW_LIMITER_UNAVAILABLE");
        }
      }

      const pantoneId = assertPantoneId(input.pantoneId);
      const { buffer, mimeType } = decodeVehicleImage(input.imageBase64);
      const vehicleImageDimensions = await getVehicleImageDimensions(buffer);
      const outputDimensions = getImageOutputDimensions(vehicleImageDimensions);
      const imageGenerationSize = getImageGenerationSize(
        vehicleImageDimensions
      );
      const aspectRatio = getImageAspectRatioLabel(vehicleImageDimensions);
      const materialReferenceKey = getCatalogColorReferenceKey(
        pantoneId,
        input.catalogColor
      );
      const materialReference =
        await loadCatalogMaterialReference(materialReferenceKey);
      const partialWrapCustomizations = normalizePartialWrapCustomizations(
        input.partialWrapCustomizations
      );

      const generated = await generatePreviewImage({
        prompt: buildWrapPreviewPrompt(
          pantoneId,
          input.catalogColor,
          Boolean(materialReference),
          partialWrapCustomizations,
          aspectRatio
        ),
        originalImages: [
          { b64Json: buffer.toString("base64"), mimeType },
          ...(materialReference ? [materialReference] : []),
        ],
        size: imageGenerationSize,
        outputDimensions,
        // Two-image catalog edits stay inside the function time limit.
        quality: materialReference ? "low" : undefined,
      });
      if (!generated.url) throw new Error("AI 未回傳預覽圖片。");
      generationCompleted = true;

      // The generated bytes are already in scope, so colour measurement does
      // not need a second read of the stored object.
      const colorMetrics = materialReference
        ? await measureColorConsistency(
            materialReference.buffer,
            generated.buffer,
            buffer
          )
        : undefined;
      const previewUrl = `/api/wrap-preview?op=image&u=${encodeURIComponent(
        generated.url,
      )}`;

      const previewResponse: WrapPreviewResponse = {
        previewUrl,
        pantoneId,
        materialReferenceUrl: materialReferenceKey
          ? getMaterialCardAssetPath(materialReferenceKey)
          : undefined,
        colorReview: {
          status: "unavailable",
          confidence: 0,
          message: materialReference
            ? COLOR_REVIEW_UNAVAILABLE_MESSAGE
            : "此預覽未使用型錄實體色卡參考。",
        },
        colorMetrics,
        partialWrapCustomizations,
        outputSize: `${outputDimensions.width}x${outputDimensions.height}`,
        aspectRatio,
      };

      await saveCachedPreview(cacheKey, previewResponse);
      sendTrpcSuccess(res, previewResponse);
    } catch (error) {
      console.error("[WrapPreview] generation failed", error);
      sendTrpcError(
        res,
        getWrapPreviewErrorMessage(error),
        "wrapPreview.generate"
      );
    } finally {
      if (usageClaim) {
        await releaseGeneration(usageClaim, generationCompleted).catch(
          error => {
            console.error("[WrapPreview] usage release failed", error);
          }
        );
      }
    }
  });

  return app;
}
