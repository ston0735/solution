import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  createMemberPreviewHistory,
  listAdminMemberPreviewHistory,
  listMemberPreviewHistory,
  saveMemberPreviewHistory,
  getAdminMemberDirectory,
  updateAdminMemberPreview,
} from "./db";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";
import type { MemberPreviewHistory } from "../drizzle/schema";

const catalogColorSchema = z.object({
  code: z.string().min(2).max(48),
  category: z.string().min(1).max(40),
  categoryEn: z.string().min(1).max(40),
  name: z.string().max(80),
  nameZh: z.string().max(80),
  swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const partialWrapSchema = z.object({
  part: z.string().min(1).max(40),
  finish: z.string().min(1).max(40),
});

const createPreviewSchema = z.object({
  previewUrl: z.string().min(1).max(600),
  originalImageDataUrl: z.string().min(32).max(9_000_000),
  vehicleModel: z.string().trim().max(120).nullable().optional(),
  pantoneId: z.string().min(2).max(48),
  catalogColor: catalogColorSchema.optional(),
  aspectRatio: z.string().regex(/^\d+:\d+$/).max(20),
  outputSize: z.string().max(32).nullable().optional(),
  partialWrapCustomizations: z.array(partialWrapSchema).max(4).default([]),
});

const followUpStatusSchema = z.enum([
  "new",
  "contacted",
  "quoted",
  "booked",
  "closed",
]);

const adminPreviewUpdateSchema = z.object({
  followUpStatus: followUpStatusSchema,
  adminTags: z.array(z.string().trim().min(1).max(32)).max(12),
  adminNote: z.string().trim().max(2000),
});

type AuthenticatedRequest = Request & {
  solutionUser?: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
};

async function authenticate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    req.solutionUser = user;
    return user;
  } catch {
    res.status(401).json({ error: "請先登入會員。" });
    return null;
  }
}

export function parseMemberPreviewJson<T>(
  value: string | null | undefined,
  fallback: T,
): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function serializeMemberPreviewHistory(item: MemberPreviewHistory) {
  const updatedAt = item.updatedAt ?? item.createdAt;
  return {
    id: item.id,
    previewUrl: item.previewUrl,
    originalImageUrl: item.originalImageUrl,
    vehicleModel: item.vehicleModel,
    pantoneId: item.pantoneId,
    catalogColor: parseMemberPreviewJson(item.catalogColorJson, null),
    aspectRatio: item.aspectRatio,
    outputSize: item.outputSize,
    partialWrapCustomizations: parseMemberPreviewJson(
      item.partialWrapCustomizations,
      [],
    ),
    followUpStatus: item.followUpStatus ?? "new",
    adminTags: parseMemberPreviewJson(item.adminTagsJson, [] as string[]),
    adminNote: item.adminNote,
    createdAt: item.createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    retentionDays: item.retentionDays,
    expiresAt: item.expiresAt.toISOString(),
    isSaved: item.isSaved === 1,
  };
}

function decodeOriginalImage(dataUrl: string) {
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match) throw new Error("ORIGINAL_IMAGE_FORMAT_INVALID");
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
    throw new Error("ORIGINAL_IMAGE_TOO_LARGE");
  }
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.slice(6);
  return { buffer, mimeType, extension };
}

function sendServerError(res: Response, error: unknown) {
  if (error instanceof Error && error.message === "DATABASE_UNAVAILABLE") {
    res.status(503).json({ error: "會員資料服務暫時無法使用，請稍後再試。" });
    return;
  }
  console.error("[MemberPreviewRoutes] request failed", error);
  res.status(500).json({ error: "會員預覽資料暫時無法讀取。" });
}

export function registerMemberPreviewRoutes(app: Express) {
  app.get("/api/member-history", async (req: AuthenticatedRequest, res) => {
    const user = await authenticate(req, res);
    if (!user) return;
    try {
      const requestedLimit = Number(req.query.limit ?? 50);
      const rows = await listMemberPreviewHistory(user.id, Number.isFinite(requestedLimit) ? requestedLimit : 50);
      res.setHeader("Cache-Control", "no-store, private");
      res.json({ items: rows.map(serializeMemberPreviewHistory) });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post("/api/member-history", async (req: AuthenticatedRequest, res) => {
    const user = await authenticate(req, res);
    if (!user) return;
    const parsed = createPreviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "預覽資料格式不完整，無法保存。" });
      return;
    }
    try {
      const original = decodeOriginalImage(parsed.data.originalImageDataUrl);
      const uploaded = await storagePut(
        `member-previews/${user.id}/original.${original.extension}`,
        original.buffer,
        original.mimeType,
      );
      const created = await createMemberPreviewHistory({
        userId: user.id,
        previewUrl: parsed.data.previewUrl,
        originalImageUrl: uploaded.url,
        vehicleModel: parsed.data.vehicleModel?.trim() || null,
        pantoneId: parsed.data.pantoneId,
        catalogColorJson: parsed.data.catalogColor
          ? JSON.stringify(parsed.data.catalogColor)
          : null,
        aspectRatio: parsed.data.aspectRatio,
        outputSize: parsed.data.outputSize ?? null,
        partialWrapCustomizations: JSON.stringify(
          parsed.data.partialWrapCustomizations,
        ),
        followUpStatus: "new",
        adminTagsJson: JSON.stringify([]),
        adminNote: null,
        retentionDays: 3,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isSaved: 0,
      });
      if (!created) throw new Error("DATABASE_UNAVAILABLE");
      res.status(201).json({ item: serializeMemberPreviewHistory(created) });
    } catch (error) {
      if (error instanceof Error && error.message === "ORIGINAL_IMAGE_FORMAT_INVALID") {
        res.status(400).json({ error: "原始車照格式無法保存，請重新上傳 JPG、PNG 或 WEBP。" });
        return;
      }
      if (error instanceof Error && error.message === "ORIGINAL_IMAGE_TOO_LARGE") {
        res.status(413).json({ error: "原始車照超過 6 MB，請縮小後再試。" });
        return;
      }
      sendServerError(res, error);
    }
  });

  app.post("/api/member-history/:id/save", async (req: AuthenticatedRequest, res) => {
    const user = await authenticate(req, res);
    if (!user) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "預覽紀錄編號無效。" });
      return;
    }
    try {
      const saved = await saveMemberPreviewHistory(id, user.id);
      if (!saved) {
        res.status(404).json({ error: "找不到這筆會員預覽紀錄。" });
        return;
      }
      res.setHeader("Cache-Control", "no-store, private");
      res.json({ item: serializeMemberPreviewHistory(saved) });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get("/api/admin/members", async (req: AuthenticatedRequest, res) => {
    const user = await authenticate(req, res);
    if (!user) return;
    if (user.role !== "admin") {
      res.status(403).json({ error: "你沒有會員 CRM 的管理權限。" });
      return;
    }
    try {
      const filters = {
        search: typeof req.query.search === "string" ? req.query.search : "",
        vehicleModel:
          typeof req.query.vehicleModel === "string"
            ? req.query.vehicleModel
            : "",
        pantoneId:
          typeof req.query.pantoneId === "string" ? req.query.pantoneId : "",
        dateFrom:
          typeof req.query.dateFrom === "string" ? req.query.dateFrom : "",
        dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : "",
        followUpStatus:
          typeof req.query.followUpStatus === "string"
            ? req.query.followUpStatus
            : "",
      };
      const limit = Number(req.query.limit ?? 200);
      const directory = await getAdminMemberDirectory(
        filters,
        Number.isFinite(limit) ? limit : 200,
      );
      res.setHeader("Cache-Control", "no-store, private");
      res.json(directory);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get("/api/admin/members/:id/previews", async (req: AuthenticatedRequest, res) => {
    const user = await authenticate(req, res);
    if (!user) return;
    if (user.role !== "admin") {
      res.status(403).json({ error: "你沒有會員 CRM 的管理權限。" });
      return;
    }
    const memberId = Number(req.params.id);
    if (!Number.isInteger(memberId) || memberId < 1) {
      res.status(400).json({ error: "會員編號無效。" });
      return;
    }
    try {
      const rows = await listAdminMemberPreviewHistory(memberId, 100);
      res.setHeader("Cache-Control", "no-store, private");
      res.json({ items: rows.map(serializeMemberPreviewHistory) });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.patch(
    "/api/admin/members/:memberId/previews/:previewId",
    async (req: AuthenticatedRequest, res) => {
      const user = await authenticate(req, res);
      if (!user) return;
      if (user.role !== "admin") {
        res.status(403).json({ error: "你沒有會員 CRM 的管理權限。" });
        return;
      }
      const memberId = Number(req.params.memberId);
      const previewId = Number(req.params.previewId);
      if (
        !Number.isInteger(memberId) ||
        memberId < 1 ||
        !Number.isInteger(previewId) ||
        previewId < 1
      ) {
        res.status(400).json({ error: "會員或預覽編號無效。" });
        return;
      }
      const parsed = adminPreviewUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "跟進資料格式不完整。" });
        return;
      }
      try {
        const updated = await updateAdminMemberPreview(memberId, previewId, {
          followUpStatus: parsed.data.followUpStatus,
          adminTagsJson: JSON.stringify(
            parsed.data.adminTags.map(tag => tag.trim()).filter(Boolean),
          ),
          adminNote: parsed.data.adminNote.trim() || null,
        });
        if (!updated) {
          res.status(404).json({ error: "找不到這筆會員預覽紀錄。" });
          return;
        }
        res.setHeader("Cache-Control", "no-store, private");
        res.json({ item: serializeMemberPreviewHistory(updated) });
      } catch (error) {
        sendServerError(res, error);
      }
    },
  );
}
