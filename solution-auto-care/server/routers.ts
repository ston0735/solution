import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateImage } from "./_core/imageGeneration";
import { reviewColorConsistency } from "./colorConsistency";
import { measureColorConsistency } from "./colorMetrics";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl } from "./storage";
import {
  assertPantoneId,
  buildWrapPreviewPrompt,
  decodeVehicleImage,
  getCatalogColorReferenceKey,
  getImageAspectRatioLabel,
  getImageGenerationDimensions,
  getImageGenerationSize,
  getImageOutputDimensions,
  getVehicleImageDimensions,
  getWrapPreviewErrorMessage,
  normalizePartialWrapCustomizations,
} from "./wrapPreview";
import {
  claimWrapPreviewGeneration,
  createWrapPreviewCacheKey,
  finishWrapPreviewGeneration,
  getCachedWrapPreview,
  getClientIp,
  hashClientIp,
  saveCachedWrapPreview,
  type WrapPreviewUsageClaim,
} from "./wrapPreviewLimits";
import { getWrapPreviewHealth } from "./wrapPreviewHealth";
import {
  getMaterialCardAssetPath,
  getMaterialCardRawUrl,
} from "@shared/wrapAssetPaths";

async function loadCatalogMaterialReference(key?: string) {
  if (!key) return undefined;
  let signedUrl = getMaterialCardRawUrl(key);
  let response = await fetch(signedUrl);
  if (!response.ok) {
    signedUrl = await storageGetSignedUrl(key);
    response = await fetch(signedUrl);
  }
  if (!response.ok) throw new Error("無法讀取所選型錄色卡的材質參考。");
  const contentType =
    response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!contentType.startsWith("image/"))
    throw new Error("型錄色卡參考格式無法辨識。");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("型錄色卡參考內容為空。");
  return {
    b64Json: buffer.toString("base64"),
    mimeType: contentType,
    signedUrl,
    buffer,
  };
}

async function loadImageBuffer(signedUrl: string) {
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("無法讀取生成預覽的影像資料。");
  return Buffer.from(await response.arrayBuffer());
}

type WrapPreviewResponse = {
  previewUrl: string;
  pantoneId: string;
  materialReferenceUrl?: string;
  colorReview: Awaited<ReturnType<typeof reviewColorConsistency>>;
  colorMetrics: Awaited<ReturnType<typeof measureColorConsistency>> | undefined;
  partialWrapCustomizations: ReturnType<
    typeof normalizePartialWrapCustomizations
  >;
  outputSize: string;
  aspectRatio: string;
};

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  wrapPreview: router({
    health: publicProcedure.query(({ ctx }) => {
      ctx.res.setHeader("Cache-Control", "no-store, private");
      return getWrapPreviewHealth();
    }),
    generate: publicProcedure
      .input(
        z.object({
          pantoneId: z.string().min(2).max(48),
          imageBase64: z.string().min(16).max(9_000_000),
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
                part: z.enum([
                  "mirrors",
                  "roof",
                  "spoiler",
                  "frontLowerBumper",
                ]),
                finish: z.enum(["blackout", "carbon_fiber"]),
              })
            )
            .max(4)
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let usageClaim: WrapPreviewUsageClaim | undefined;
        let imageGenerationCompleted = false;
        try {
          ctx.res.setHeader("Cache-Control", "no-store, private");
          const clientIp = getClientIp(
            ctx.req.headers,
            ctx.req.socket.remoteAddress
          );
          const ipHash = hashClientIp(clientIp);
          const cacheKey = createWrapPreviewCacheKey(ipHash, input);
          const cached =
            await getCachedWrapPreview<WrapPreviewResponse>(cacheKey);
          if (cached) return cached;

          usageClaim = await claimWrapPreviewGeneration(ipHash);
          const pantoneId = assertPantoneId(input.pantoneId);
          const { buffer, mimeType } = decodeVehicleImage(input.imageBase64);
          const vehicleImageDimensions =
            await getVehicleImageDimensions(buffer);
          const outputDimensions = getImageOutputDimensions(
            vehicleImageDimensions
          );
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
          const generated = await generateImage({
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
            // Keep the two-image catalog flow within the production gateway
            // timeout. The physical swatch remains the authoritative second
            // reference; low quality is sufficient for a first concept preview
            // and keeps the two-image request reliable on mobile networks.
            quality: materialReference ? "low" : undefined,
          });

          if (!generated.url) throw new Error("AI 未回傳預覽圖片。");
          imageGenerationCompleted = true;

          const previewKey = generated.url.replace(/^\/manus-storage\//, "");
          const previewSignedUrl = materialReference
            ? await storageGetSignedUrl(previewKey)
            : undefined;
          const colorMetrics =
            materialReference && previewSignedUrl
              ? await measureColorConsistency(
                  materialReference.buffer,
                  await loadImageBuffer(previewSignedUrl),
                  buffer
                )
              : undefined;
          const colorReview =
            materialReference && previewSignedUrl && input.catalogColor
              ? await reviewColorConsistency({
                  referenceImageUrl: materialReference.signedUrl,
                  previewImageUrl: previewSignedUrl,
                  color: input.catalogColor,
                })
              : {
                  status: "unavailable" as const,
                  confidence: 0,
                  message: "此預覽未使用型錄實體色卡參考。",
                };

          const previewResponse: WrapPreviewResponse = {
            previewUrl: generated.url,
            pantoneId,
            materialReferenceUrl: materialReferenceKey
              ? getMaterialCardAssetPath(materialReferenceKey)
              : undefined,
            colorReview,
            colorMetrics,
            partialWrapCustomizations,
            outputSize: `${outputDimensions.width}x${outputDimensions.height}`,
            aspectRatio,
          };
          await saveCachedWrapPreview(cacheKey, previewResponse);
          return previewResponse;
        } catch (error) {
          console.error("[WrapPreview] generation failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: getWrapPreviewErrorMessage(error),
          });
        } finally {
          if (usageClaim) {
            await finishWrapPreviewGeneration(
              usageClaim,
              imageGenerationCompleted
            ).catch(error => {
              console.error(
                "[WrapPreview] usage limiter release failed",
                error
              );
            });
          }
        }
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
