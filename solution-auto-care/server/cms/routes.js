// server/cms/routes.ts
import express from "express";

// server/cms/errors.ts
var CmsHttpError = class extends Error {
  status;
  safeMessage;
  constructor(status, safeMessage) {
    super(safeMessage);
    this.name = "CmsHttpError";
    this.status = status;
    this.safeMessage = safeMessage;
  }
};
var CmsAuthError = class extends CmsHttpError {
  constructor(status, safeMessage) {
    super(status, safeMessage);
    this.name = "CmsAuthError";
  }
};
var CmsValidationError = class extends CmsHttpError {
  constructor(safeMessage) {
    super(400, safeMessage);
    this.name = "CmsValidationError";
  }
};
var CmsConflictError = class extends CmsHttpError {
  constructor(safeMessage = "The CMS document changed; reload and try again.") {
    super(409, safeMessage);
    this.name = "CmsConflictError";
  }
};
var CmsNotFoundError = class extends CmsHttpError {
  constructor(safeMessage = "Not found") {
    super(404, safeMessage);
    this.name = "CmsNotFoundError";
  }
};
var CmsStorageError = class extends CmsHttpError {
  constructor(safeMessage = "CMS storage is unavailable.") {
    super(503, safeMessage);
    this.name = "CmsStorageError";
  }
};

// server/cms/auth.ts
var CMS_AUTH_ME_URL = "https://solutionauth-zcgxwa4c.manus.space/api/trpc/auth.me?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D";
var REMOTE_AUTH_TIMEOUT_MS = 5e3;
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function unwrapTrpcUser(payload) {
  const batchItem = Array.isArray(payload) ? payload[0] : payload;
  if (!isRecord(batchItem)) return void 0;
  const result = batchItem.result;
  if (!isRecord(result)) return void 0;
  const data = result.data;
  if (isRecord(data) && Object.prototype.hasOwnProperty.call(data, "json")) {
    return data.json;
  }
  return data;
}
function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : void 0;
}
function buildForwardHeaders(req) {
  const headers = new Headers({ Accept: "application/json" });
  const cookie = getHeader(req, "cookie");
  const manusCookie = getHeader(req, "x-manus-cookie");
  const authorization = getHeader(req, "authorization");
  if (cookie) headers.set("Cookie", cookie);
  if (manusCookie) {
    headers.set("x-manus-cookie", manusCookie);
    if (!cookie && manusCookie.includes("=")) {
      headers.set("Cookie", manusCookie);
    }
  }
  if (authorization) headers.set("Authorization", authorization);
  return headers;
}
async function authenticateCmsAdmin(req, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_AUTH_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(CMS_AUTH_ME_URL, {
      method: "GET",
      headers: buildForwardHeaders(req),
      signal: controller.signal
    });
  } catch {
    throw new CmsAuthError(503, "Authentication service unavailable.");
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 401 || response.status === 403) {
    throw new CmsAuthError(401, "Authentication required.");
  }
  if (!response.ok) {
    throw new CmsAuthError(503, "Authentication service unavailable.");
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new CmsAuthError(503, "Authentication service unavailable.");
  }
  const user = unwrapTrpcUser(payload);
  if (!isRecord(user)) {
    throw new CmsAuthError(401, "Authentication required.");
  }
  if (user.role !== "admin") {
    throw new CmsAuthError(403, "Admin access required.");
  }
  return user;
}

// server/cms/media.ts
import sharp from "sharp";
var MAX_RAW_UPLOAD_BYTES = 3 * 1024 * 1024;
var MAX_IMAGE_PIXELS = 25e6;
var DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/i;
var MEDIA_PATH_PATTERN = /^cms\/media\/[A-Za-z0-9_-]{16,128}\.webp$/;
function hasPrefix(buffer, prefix) {
  return prefix.every((byte, index) => buffer[index] === byte);
}
function getMagicMime(buffer) {
  if (hasPrefix(buffer, [255, 216, 255])) return "image/jpeg";
  if (hasPrefix(buffer, [137, 80, 78, 71, 13, 10, 26, 10])) {
    return "image/png";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}
function decodeBase64(encoded) {
  if (encoded.length === 0 || encoded.length % 4 !== 0) {
    throw new CmsValidationError("Invalid image data.");
  }
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length === 0 || buffer.length > MAX_RAW_UPLOAD_BYTES) {
    throw new CmsValidationError("Image exceeds the 3 MB limit.");
  }
  if (buffer.toString("base64") !== encoded) {
    throw new CmsValidationError("Invalid image data.");
  }
  return buffer;
}
async function sanitizeImageDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") {
    throw new CmsValidationError("Image data is required.");
  }
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw new CmsValidationError(
      "Only JPEG, PNG, and WebP data URLs are allowed."
    );
  }
  const declaredMime = match[1].toLowerCase();
  const raw = decodeBase64(match[2]);
  const actualMime = getMagicMime(raw);
  if (!actualMime || actualMime !== declaredMime) {
    throw new CmsValidationError(
      "Image MIME type does not match its file signature."
    );
  }
  let metadata;
  try {
    metadata = await sharp(raw, {
      limitInputPixels: MAX_IMAGE_PIXELS
    }).metadata();
  } catch {
    throw new CmsValidationError("Image could not be decoded.");
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const pages = metadata.pages ?? 1;
  if (width < 1 || height < 1 || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || !Number.isSafeInteger(pages) || width * height > MAX_IMAGE_PIXELS || width * height * pages > MAX_IMAGE_PIXELS) {
    throw new CmsValidationError("Image dimensions exceed the pixel limit.");
  }
  try {
    return await sharp(raw, { limitInputPixels: MAX_IMAGE_PIXELS }).rotate().webp({ quality: 82 }).toBuffer();
  } catch {
    throw new CmsValidationError("Image could not be sanitized.");
  }
}
function sanitizeUploadFilename(value) {
  if (typeof value !== "string") {
    throw new CmsValidationError("Filename is required.");
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new CmsValidationError("Filename is invalid.");
  }
  const safe = trimmed.replace(/[\\/]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "_");
  if (!safe) throw new CmsValidationError("Filename is invalid.");
  return safe;
}
function isSafeMediaPath(value) {
  return typeof value === "string" && MEDIA_PATH_PATTERN.test(value);
}
function createMediaPath() {
  return `cms/media/${crypto.randomUUID()}.webp`;
}
function createMediaUrl(pathname) {
  return `/api/cms/media?key=${encodeURIComponent(pathname)}`;
}

// server/cms/store.ts
import { get as blobGet, put as blobPut } from "@vercel/blob";

// shared/siteContent.ts
var field = (key, label, page, type = "text") => ({ key, label, page, type });
var CONTENT_FIELDS = [
  field("global.logo", "\u54C1\u724C Logo", "global", "image"),
  field("global.logoAlt", "\u54C1\u724C Logo \u66FF\u4EE3\u6587\u5B57", "global"),
  field("global.ksgLogo", "KSG Logo", "global", "image"),
  field("global.ksgLogoAlt", "KSG Logo \u66FF\u4EE3\u6587\u5B57", "global"),
  field("global.lineUrl", "\u5B98\u65B9 LINE \u9023\u7D50", "global", "url"),
  field("global.lineLabel", "\u5B98\u65B9 LINE \u6309\u9215\u6587\u5B57", "global"),
  field("global.logoButtonAria", "Logo \u56DE\u9996\u9801 aria-label", "global"),
  field("global.mainNavAria", "\u684C\u9762\u5C0E\u89BD aria-label", "global"),
  field("global.mobileNavAria", "\u884C\u52D5\u7248\u5C0E\u89BD aria-label", "global"),
  field("global.menuOpenAria", "\u958B\u555F\u9078\u55AE aria-label", "global"),
  field("global.menuCloseAria", "\u95DC\u9589\u9078\u55AE aria-label", "global"),
  field("global.memberLabel", "\u6703\u54E1\u5C08\u5340\u6309\u9215\u6587\u5B57", "global"),
  field("global.memberLoadingLabel", "\u6703\u54E1\u72C0\u614B\u78BA\u8A8D\u4E2D\u6587\u5B57", "global"),
  field("global.headerBookingCta", "\u9801\u9996\u9810\u7D04\u6309\u9215\u6587\u5B57", "global"),
  field("global.adminLinkLabel", "\u5167\u5BB9\u5F8C\u53F0\u9023\u7D50\u6587\u5B57", "global"),
  field("global.previewBannerLabel", "\u8349\u7A3F\u9810\u89BD\u6A19\u793A", "global"),
  field("global.previewReturnLabel", "\u8FD4\u56DE\u5F8C\u53F0\u9023\u7D50\u6587\u5B57", "global"),
  field("global.servicesMenuToggle", "\u5C55\u958B\u670D\u52D9\u9078\u55AE\u66FF\u4EE3\u6587\u5B57", "global"),
  field("global.servicesAllLabel", "\u6240\u6709\u670D\u52D9\u9078\u55AE\u9023\u7D50\u6587\u5B57", "global"),
  field("nav.services", "\u670D\u52D9\u9805\u76EE\u5C0E\u89BD\u6587\u5B57", "nav"),
  field("nav.ai", "AI \u8ECA\u8272\u5C0E\u89BD\u6587\u5B57", "nav"),
  field("nav.process", "\u65BD\u5DE5\u6D41\u7A0B\u5C0E\u89BD\u6587\u5B57", "nav"),
  field("nav.blog", "Blog\uFF0F\u6539\u88DD\u6848\u4F8B\u5C0E\u89BD\u6587\u5B57", "nav"),
  field("nav.about", "\u95DC\u65BC Solution \u5C0E\u89BD\u6587\u5B57", "nav"),
  field("nav.contact", "\u9810\u7D04\u8AEE\u8A62\u5C0E\u89BD\u6587\u5B57", "nav"),
  field("nav.member", "\u6703\u54E1\u5C08\u5340\u5C0E\u89BD\u6587\u5B57", "nav"),
  field("home.hero.eyebrow", "\u9996\u9801 Hero \u7709\u6A19", "home"),
  field("home.hero.titleLine1", "\u9996\u9801 Hero \u6A19\u984C\u7B2C\u4E00\u884C", "home"),
  field("home.hero.titleLine2", "\u9996\u9801 Hero \u6A19\u984C\u7B2C\u4E8C\u884C", "home"),
  field("home.hero.description", "\u9996\u9801 Hero \u63CF\u8FF0", "home", "textarea"),
  field("home.hero.image", "\u9996\u9801 Hero \u5716\u7247", "home", "image"),
  field("home.hero.imageAlt", "\u9996\u9801 Hero \u5716\u7247\u66FF\u4EE3\u6587\u5B57", "home", "textarea"),
  field("home.hero.primaryCta", "\u9996\u9801 Hero \u4E3B\u8981\u6309\u9215", "home"),
  field("home.hero.secondaryCta", "\u9996\u9801 Hero \u6B21\u8981\u6309\u9215", "home"),
  field("home.hero.scanLabel", "Hero \u6383\u63CF\u6A19\u7C64", "home"),
  field("home.hero.finishLabel", "Hero \u5B8C\u6210\u5EA6\u6A19\u7C64", "home"),
  field("home.hero.finishValue", "Hero \u5B8C\u6210\u5EA6\u6578\u503C", "home"),
  field("home.hero.reflectionLabel", "Hero \u53CD\u5149\u6A19\u7C64", "home"),
  field("home.hero.reflectionValue", "Hero \u53CD\u5149\u6578\u503C", "home"),
  field("home.hero.edgeLabel", "Hero \u819C\u908A\u6A19\u7C64", "home"),
  field("home.hero.edgeValue", "Hero \u819C\u908A\u6578\u503C", "home"),
  field("home.hero.panelEyebrow", "Hero \u53F3\u5074\u9762\u677F\u7709\u6A19", "home"),
  field("home.hero.panelCopy", "Hero \u53F3\u5074\u9762\u677F\u6587\u5B57", "home", "textarea"),
  field("home.hero.scrollAria", "Hero \u5411\u4E0B\u6309\u9215 aria-label", "home"),
  field("home.servicesLinkCta", "\u9996\u9801\u67E5\u770B\u670D\u52D9\u6309\u9215", "home"),
  field("home.processLinkCta", "\u9996\u9801\u67E5\u770B\u65BD\u5DE5\u6D41\u7A0B\u6309\u9215", "home"),
  field("about.eyebrow", "\u95DC\u65BC\u5340\u584A\u7709\u6A19", "about"),
  field("about.intro", "\u95DC\u65BC\u5340\u584A\u5F15\u8A00", "about", "textarea"),
  field("about.titleLine1", "\u95DC\u65BC\u6A19\u984C\u7B2C\u4E00\u884C", "about"),
  field("about.titleLine2", "\u95DC\u65BC\u6A19\u984C\u7B2C\u4E8C\u884C", "about"),
  field("about.titleAccent", "\u95DC\u65BC\u6A19\u984C\u5F37\u8ABF\u5B57", "about"),
  field("about.value.0.label", "\u95DC\u65BC\u50F9\u503C\u4E00\u6A19\u7C64", "about"),
  field("about.value.0.copy", "\u95DC\u65BC\u50F9\u503C\u4E00\u8AAA\u660E", "about", "textarea"),
  field("about.value.1.label", "\u95DC\u65BC\u50F9\u503C\u4E8C\u6A19\u7C64", "about"),
  field("about.value.1.copy", "\u95DC\u65BC\u50F9\u503C\u4E8C\u8AAA\u660E", "about", "textarea"),
  field("about.value.2.label", "\u95DC\u65BC\u50F9\u503C\u4E09\u6A19\u7C64", "about"),
  field("about.value.2.copy", "\u95DC\u65BC\u50F9\u503C\u4E09\u8AAA\u660E", "about", "textarea"),
  field("services.eyebrow", "\u670D\u52D9\u5340\u584A\u7709\u6A19", "services"),
  field("services.titleLine1", "\u670D\u52D9\u6A19\u984C\u7B2C\u4E00\u884C", "services"),
  field("services.titleLine2", "\u670D\u52D9\u6A19\u984C\u7B2C\u4E8C\u884C", "services"),
  field("services.description", "\u670D\u52D9\u5340\u584A\u63CF\u8FF0", "services", "textarea"),
  field("services.0.number", "\u670D\u52D9\u4E00\u7DE8\u865F", "services"),
  field("services.0.title", "\u670D\u52D9\u4E00\u6A19\u984C", "services"),
  field("services.0.english", "\u670D\u52D9\u4E00\u82F1\u6587\u6A19\u984C", "services"),
  field("services.0.description", "\u670D\u52D9\u4E00\u8AAA\u660E", "services", "textarea"),
  field("services.0.detail", "\u670D\u52D9\u4E00\u7D30\u7BC0\u6A19\u7C64", "services"),
  field("services.0.image", "\u670D\u52D9\u4E00\u5716\u7247", "services", "image"),
  field("services.0.imageAlt", "\u670D\u52D9\u4E00\u5716\u7247\u66FF\u4EE3\u6587\u5B57", "services", "textarea"),
  field("services.0.ctaAriaLabel", "\u670D\u52D9\u4E00\u8AEE\u8A62\u6309\u9215 aria-label", "services"),
  field("services.1.number", "\u670D\u52D9\u4E8C\u7DE8\u865F", "services"),
  field("services.1.title", "\u670D\u52D9\u4E8C\u6A19\u984C", "services"),
  field("services.1.english", "\u670D\u52D9\u4E8C\u82F1\u6587\u6A19\u984C", "services"),
  field("services.1.description", "\u670D\u52D9\u4E8C\u8AAA\u660E", "services", "textarea"),
  field("services.1.detail", "\u670D\u52D9\u4E8C\u7D30\u7BC0\u6A19\u7C64", "services"),
  field("services.1.image", "\u670D\u52D9\u4E8C\u5716\u7247", "services", "image"),
  field("services.1.imageAlt", "\u670D\u52D9\u4E8C\u5716\u7247\u66FF\u4EE3\u6587\u5B57", "services", "textarea"),
  field("services.1.ctaAriaLabel", "\u670D\u52D9\u4E8C\u8AEE\u8A62\u6309\u9215 aria-label", "services"),
  field("services.2.number", "\u670D\u52D9\u4E09\u7DE8\u865F", "services"),
  field("services.2.title", "\u670D\u52D9\u4E09\u6A19\u984C", "services"),
  field("services.2.english", "\u670D\u52D9\u4E09\u82F1\u6587\u6A19\u984C", "services"),
  field("services.2.description", "\u670D\u52D9\u4E09\u8AAA\u660E", "services", "textarea"),
  field("services.2.detail", "\u670D\u52D9\u4E09\u7D30\u7BC0\u6A19\u7C64", "services"),
  field("services.2.image", "\u670D\u52D9\u4E09\u5716\u7247", "services", "image"),
  field("services.2.imageAlt", "\u670D\u52D9\u4E09\u5716\u7247\u66FF\u4EE3\u6587\u5B57", "services", "textarea"),
  field("services.2.ctaAriaLabel", "\u670D\u52D9\u4E09\u8AEE\u8A62\u6309\u9215 aria-label", "services"),
  field("ai.eyebrow", "AI \u8ECA\u8272\u7709\u6A19", "ai"),
  field("ai.intro", "AI \u8ECA\u8272\u5F15\u8A00", "ai", "textarea"),
  field("ai.titleLine1", "AI \u8ECA\u8272\u6A19\u984C\u7B2C\u4E00\u884C", "ai"),
  field("ai.titleLine2", "AI \u8ECA\u8272\u6A19\u984C\u7B2C\u4E8C\u884C", "ai"),
  field("ai.description", "AI \u8ECA\u8272\u9801\u63CF\u8FF0", "ai", "textarea"),
  field("ai.inputModuleLabel", "AI \u8F38\u5165\u6A21\u7D44\u6A19\u7C64", "ai"),
  field("ai.inputModuleStep", "AI \u8F38\u5165\u6A21\u7D44\u6B65\u9A5F", "ai"),
  field("ai.photo.stepLabel", "AI \u4E0A\u50B3\u7167\u7247\u6A19\u7C64", "ai"),
  field("ai.photo.selectLabel", "AI \u9078\u64C7\u7167\u7247\u6309\u9215", "ai"),
  field("ai.photo.formatHint", "AI \u7167\u7247\u683C\u5F0F\u63D0\u793A", "ai", "textarea"),
  field("ai.photo.uploadedAlt", "AI \u5DF2\u4E0A\u50B3\u7167\u7247\u66FF\u4EE3\u6587\u5B57", "ai", "textarea"),
  field("ai.photo.removeAriaLabel", "AI \u79FB\u9664\u7167\u7247 aria-label", "ai"),
  field("ai.vehicle.label", "AI \u8ECA\u6B3E\u6B04\u4F4D\u6A19\u7C64", "ai"),
  field("ai.vehicle.placeholder", "AI \u8ECA\u6B3E\u6B04\u4F4D placeholder", "ai"),
  field("ai.vehicle.help", "AI \u8ECA\u6B3E\u6B04\u4F4D\u8AAA\u660E", "ai", "textarea"),
  field("ai.catalog.stepLabel", "AI \u578B\u9304\u8272\u5361\u6A19\u7C64", "ai"),
  field("ai.catalog.countSuffix", "AI \u578B\u9304\u8272\u5361\u6578\u91CF\u6A19\u7C64", "ai"),
  field("ai.catalog.categorySelectLabel", "AI \u8272\u7CFB\u9078\u64C7\u6A19\u7C64", "ai"),
  field("ai.catalog.colorSelectLabel", "AI \u578B\u9304\u8272\u865F\u9078\u64C7\u6A19\u7C64", "ai"),
  field("ai.catalog.colorCountSuffix", "AI \u8272\u7CFB\u6578\u91CF\u55AE\u4F4D", "ai"),
  field("ai.catalog.swatchAltSuffix", "AI \u5BE6\u9AD4\u8272\u5361\u66FF\u4EE3\u6587\u5B57", "ai"),
  field("ai.catalog.description", "AI \u578B\u9304\u8AAA\u660E", "ai", "textarea"),
  field("ai.catalog.customLabel", "AI \u81EA\u8A02\u8272\u865F\u6A19\u7C64", "ai"),
  field("ai.catalog.customPlaceholder", "AI \u81EA\u8A02\u8272\u865F placeholder", "ai"),
  field("ai.partial.stepLabel", "AI \u5C40\u90E8\u5305\u819C\u6A19\u7C64", "ai"),
  field("ai.partial.description", "AI \u5C40\u90E8\u5305\u819C\u8AAA\u660E", "ai", "textarea"),
  field("ai.partial.finishGroupSuffix", "AI \u6750\u8CEA\u9078\u64C7 aria-label \u5F8C\u7DB4", "ai"),
  field("ai.partial.appliedPrefix", "AI \u5DF2\u5957\u7528\u524D\u7DB4", "ai"),
  field("ai.error.previewLoad", "AI \u9810\u89BD\u5716\u7247\u8B80\u53D6\u932F\u8AA4", "ai"),
  field("ai.error.previewConvert", "AI \u9810\u89BD\u5716\u7247\u8F49\u63DB\u932F\u8AA4", "ai"),
  field("ai.error.fileType", "AI \u6A94\u6848\u683C\u5F0F\u932F\u8AA4", "ai", "textarea"),
  field("ai.error.fileRead", "AI \u7167\u7247\u8B80\u53D6\u932F\u8AA4", "ai"),
  field("ai.error.fileFormat", "AI \u7167\u7247\u683C\u5F0F\u8FA8\u8B58\u932F\u8AA4", "ai"),
  field("ai.error.dimensions", "AI \u7167\u7247\u5C3A\u5BF8\u8FA8\u8B58\u932F\u8AA4", "ai"),
  field("ai.error.photoRequired", "AI \u5FC5\u586B\u7167\u7247\u932F\u8AA4", "ai"),
  field("ai.error.colorRequired", "AI \u5FC5\u586B\u8272\u865F\u932F\u8AA4", "ai"),
  field("ai.auth.loginRequired", "AI \u767B\u5165\u63D0\u793A\u6A19\u984C", "ai"),
  field("ai.auth.loginRequiredDescription", "AI \u767B\u5165\u63D0\u793A\u8AAA\u660E", "ai"),
  field("ai.toast.generateSuccess", "AI \u751F\u6210\u6210\u529F\u6A19\u984C", "ai"),
  field("ai.toast.saved", "AI \u4FDD\u5B58\u6210\u529F\u6A19\u984C", "ai"),
  field("ai.toast.savedDescription", "AI \u4FDD\u5B58\u6210\u529F\u8AAA\u660E", "ai"),
  field("ai.toast.saveFailed", "AI \u4FDD\u5B58\u5931\u6557\u6A19\u984C", "ai"),
  field("ai.toast.historySaveWarning", "AI \u9810\u89BD\u6B77\u53F2\u4FDD\u5B58\u8B66\u544A", "ai"),
  field("ai.toast.historySaveWarningDescription", "AI \u6B77\u53F2\u4FDD\u5B58\u8B66\u544A\u8AAA\u660E", "ai"),
  field("ai.toast.loginSaveDescription", "AI \u767B\u5165\u6703\u54E1\u4FDD\u5B58\u8AAA\u660E", "ai"),
  field("ai.toast.generateFailed", "AI \u751F\u6210\u5931\u6557\u6A19\u984C", "ai"),
  field("ai.toast.downloadStarted", "AI \u4E0B\u8F09\u958B\u59CB\u63D0\u793A", "ai"),
  field("ai.toast.savedStatus", "AI \u5DF2\u4FDD\u5B58\u72C0\u614B", "ai"),
  field("ai.toast.temporaryStatus", "AI \u66AB\u5B58\u72C0\u614B", "ai", "textarea"),
  field("ai.toast.previewSavedDescription", "AI \u5DF2\u66AB\u5B58\u751F\u6210\u8AAA\u660E\u5F8C\u7DB4", "ai"),
  field("ai.toast.previewDescription", "AI \u751F\u6210\u8AAA\u660E\u5F8C\u7DB4", "ai"),
  field("ai.saveButton.saving", "AI \u4FDD\u5B58\u4E2D\u6309\u9215", "ai"),
  field("ai.saveButton.saved", "AI \u5DF2\u4FDD\u5B58\u6309\u9215", "ai"),
  field("ai.saveButton.default", "AI \u5132\u5B58\u5716\u7247\u6309\u9215", "ai"),
  field("ai.action.compare", "AI A\uFF0FB \u6BD4\u8F03\u6309\u9215", "ai"),
  field("ai.action.download", "AI \u4E0B\u8F09\u5716\u7247\u6309\u9215", "ai"),
  field("ai.action.regenerate", "AI \u91CD\u65B0\u751F\u6210\u6309\u9215", "ai"),
  field("ai.generateButton.processing", "AI \u751F\u6210\u4E2D\u6309\u9215", "ai"),
  field("ai.generateButton.default", "AI \u751F\u6210\u6309\u9215", "ai"),
  field("ai.output.beforeLabel", "AI \u6BD4\u8F03\u524D\u6A19\u7C64", "ai"),
  field("ai.output.afterLabel", "AI \u6BD4\u8F03\u5F8C\u6A19\u7C64", "ai"),
  field("ai.output.compareAlt", "AI \u6BD4\u8F03\u5716\u7247\u66FF\u4EE3\u6587\u5B57", "ai", "textarea"),
  field("ai.output.imageAltPrefix", "AI \u751F\u6210\u5716\u7247\u66FF\u4EE3\u6587\u5B57\u524D\u7DB4", "ai"),
  field("ai.output.generatedLabel", "AI \u751F\u6210\u5B8C\u6210\u6A19\u7C64", "ai"),
  field("ai.output.targetLabel", "AI \u76EE\u6A19\u8272\u865F\u6A19\u7C64", "ai"),
  field("ai.output.ratioLabel", "AI \u8F38\u51FA\u6BD4\u4F8B\u6A19\u7C64", "ai"),
  field("ai.output.partialLabel", "AI \u5C40\u90E8\u5305\u819C\u6A19\u7C64", "ai"),
  field("ai.output.materialCardLabel", "AI PDF \u8272\u5361\u6A19\u7C64", "ai"),
  field("ai.output.materialCardEnabled", "AI \u8272\u5361\u53C3\u8003\u555F\u7528\u6587\u5B57", "ai"),
  field("ai.output.materialCardHelp", "AI \u8272\u5361\u53C3\u8003\u8AAA\u660E", "ai", "textarea"),
  field("ai.processing.title", "AI \u8655\u7406\u4E2D\u6A19\u984C", "ai"),
  field("ai.processing.description", "AI \u8655\u7406\u4E2D\u8AAA\u660E", "ai", "textarea"),
  field("ai.output.placeholderLabel", "AI \u8F38\u51FA\u9810\u89BD\u6A19\u7C64", "ai"),
  field("ai.output.placeholderTitleLine1", "AI \u9810\u89BD\u4F54\u4F4D\u6A19\u984C\u4E00", "ai"),
  field("ai.output.placeholderTitleLine2", "AI \u9810\u89BD\u4F54\u4F4D\u6A19\u984C\u4E8C", "ai"),
  field("ai.output.placeholderTitleLine3", "AI \u9810\u89BD\u4F54\u4F4D\u6A19\u984C\u4E09", "ai"),
  field(
    "ai.output.placeholderDescription",
    "AI \u9810\u89BD\u4F54\u4F4D\u8AAA\u660E",
    "ai",
    "textarea"
  ),
  field("ai.storageNotice", "AI \u5716\u7247\u4FDD\u5B58\u63D0\u793A", "ai", "textarea"),
  field("ai.disclaimer", "AI \u529F\u80FD\u514D\u8CAC\u8AAA\u660E", "ai", "textarea"),
  field("process.eyebrow", "\u6D41\u7A0B\u5340\u584A\u7709\u6A19", "process"),
  field("process.titleLine1", "\u6D41\u7A0B\u6A19\u984C\u7B2C\u4E00\u884C", "process"),
  field("process.titleLine2", "\u6D41\u7A0B\u6A19\u984C\u7B2C\u4E8C\u884C", "process"),
  field("process.description", "\u6D41\u7A0B\u5340\u584A\u63CF\u8FF0", "process", "textarea"),
  field("process.0.number", "\u6D41\u7A0B\u4E00\u7DE8\u865F", "process"),
  field("process.0.title", "\u6D41\u7A0B\u4E00\u6A19\u984C", "process"),
  field("process.0.description", "\u6D41\u7A0B\u4E00\u8AAA\u660E", "process", "textarea"),
  field("process.1.number", "\u6D41\u7A0B\u4E8C\u7DE8\u865F", "process"),
  field("process.1.title", "\u6D41\u7A0B\u4E8C\u6A19\u984C", "process"),
  field("process.1.description", "\u6D41\u7A0B\u4E8C\u8AAA\u660E", "process", "textarea"),
  field("process.2.number", "\u6D41\u7A0B\u4E09\u7DE8\u865F", "process"),
  field("process.2.title", "\u6D41\u7A0B\u4E09\u6A19\u984C", "process"),
  field("process.2.description", "\u6D41\u7A0B\u4E09\u8AAA\u660E", "process", "textarea"),
  field("process.3.number", "\u6D41\u7A0B\u56DB\u7DE8\u865F", "process"),
  field("process.3.title", "\u6D41\u7A0B\u56DB\u6A19\u984C", "process"),
  field("process.3.description", "\u6D41\u7A0B\u56DB\u8AAA\u660E", "process", "textarea"),
  field("aftercare.eyebrow", "\u990A\u8B77\u5340\u584A\u7709\u6A19", "aftercare"),
  field("aftercare.titleLine1", "\u990A\u8B77\u6A19\u984C\u7B2C\u4E00\u884C", "aftercare"),
  field("aftercare.titleLine2", "\u990A\u8B77\u6A19\u984C\u7B2C\u4E8C\u884C", "aftercare"),
  field("aftercare.titleLine3", "\u990A\u8B77\u6A19\u984C\u7B2C\u4E09\u884C", "aftercare"),
  field("aftercare.description", "\u990A\u8B77\u5340\u584A\u63CF\u8FF0", "aftercare", "textarea"),
  field("aftercare.badge.0.label", "\u990A\u8B77\u5FBD\u7AE0\u4E00", "aftercare"),
  field("aftercare.badge.1.label", "\u990A\u8B77\u5FBD\u7AE0\u4E8C", "aftercare"),
  field("aftercare.badge.2.label", "\u990A\u8B77\u5FBD\u7AE0\u4E09", "aftercare"),
  field("contact.eyebrow", "\u806F\u7D61\u5340\u584A\u7709\u6A19", "contact"),
  field("contact.titleLine1", "\u806F\u7D61\u6A19\u984C\u7B2C\u4E00\u884C", "contact"),
  field("contact.titleLine2", "\u806F\u7D61\u6A19\u984C\u7B2C\u4E8C\u884C", "contact"),
  field("contact.titleLine3", "\u806F\u7D61\u6A19\u984C\u7B2C\u4E09\u884C", "contact"),
  field("contact.description", "\u806F\u7D61\u5340\u584A\u63CF\u8FF0", "contact", "textarea"),
  field("contact.primaryCta", "\u806F\u7D61\u4E3B\u8981\u6309\u9215", "contact"),
  field("contact.bookingToastTitle", "\u9810\u7D04\u63D0\u793A\u6A19\u984C", "contact"),
  field(
    "contact.bookingToastDescription",
    "\u9810\u7D04\u63D0\u793A\u8AAA\u660E",
    "contact",
    "textarea"
  ),
  field("footer.descriptionLine1", "\u9801\u5C3E\u63CF\u8FF0\u7B2C\u4E00\u884C", "footer"),
  field("footer.descriptionLine2", "\u9801\u5C3E\u63CF\u8FF0\u7B2C\u4E8C\u884C", "footer", "textarea"),
  field("footer.logoAlt", "\u9801\u5C3E Logo \u66FF\u4EE3\u6587\u5B57", "footer"),
  field("footer.copyright", "\u9801\u5C3E\u7248\u6B0A\u6587\u5B57", "footer"),
  field("footer.credit", "\u9801\u5C3E\u88FD\u4F5C\u6587\u5B57", "footer"),
  field("page.services.eyebrow", "\u670D\u52D9\u9801\u7709\u6A19", "services"),
  field("page.services.title", "\u670D\u52D9\u9801\u6A19\u984C", "services"),
  field("page.services.intro", "\u670D\u52D9\u9801\u5C0E\u8A00", "services", "textarea"),
  field("page.services.image", "\u670D\u52D9\u9801\u4E3B\u5716", "services", "image"),
  field("page.services.imageAlt", "\u670D\u52D9\u9801\u4E3B\u5716\u66FF\u4EE3\u6587\u5B57", "services", "textarea"),
  field("page.services.cta", "\u670D\u52D9\u9801\u6309\u9215", "services"),
  field("page.ai.eyebrow", "AI \u9801\u7709\u6A19", "ai"),
  field("page.ai.title", "AI \u9801\u6A19\u984C", "ai"),
  field("page.ai.intro", "AI \u9801\u5C0E\u8A00", "ai", "textarea"),
  field("page.ai.image", "AI \u9801\u4E3B\u5716", "ai", "image"),
  field("page.ai.imageAlt", "AI \u9801\u4E3B\u5716\u66FF\u4EE3\u6587\u5B57", "ai", "textarea"),
  field("page.process.eyebrow", "\u6D41\u7A0B\u9801\u7709\u6A19", "process"),
  field("page.process.title", "\u6D41\u7A0B\u9801\u6A19\u984C", "process"),
  field("page.process.intro", "\u6D41\u7A0B\u9801\u5C0E\u8A00", "process", "textarea"),
  field("page.process.image", "\u6D41\u7A0B\u9801\u4E3B\u5716", "process", "image"),
  field("page.process.imageAlt", "\u6D41\u7A0B\u9801\u4E3B\u5716\u66FF\u4EE3\u6587\u5B57", "process", "textarea"),
  field("page.blog.eyebrow", "Blog \u9801\u7709\u6A19", "blog"),
  field("page.blog.title", "Blog \u9801\u6A19\u984C", "blog"),
  field("page.blog.intro", "Blog \u9801\u5C0E\u8A00", "blog", "textarea"),
  field("page.blog.emptyTitle", "Blog \u7A7A\u72C0\u614B\u6A19\u984C", "blog"),
  field("page.blog.emptyDescription", "Blog \u7A7A\u72C0\u614B\u8AAA\u660E", "blog", "textarea"),
  field("page.blog.readCta", "Blog \u6587\u7AE0\u95B1\u8B80\u6309\u9215", "blog"),
  field("page.blog.backCta", "Blog \u8FD4\u56DE\u5217\u8868\u6309\u9215", "blog"),
  field("page.blog.notFoundTitle", "Blog \u6587\u7AE0\u4E0D\u5B58\u5728\u63D0\u793A", "blog"),
  field("page.blog.image", "Blog \u9801\u4E3B\u5716", "blog", "image"),
  field("page.blog.imageAlt", "Blog \u9801\u4E3B\u5716\u66FF\u4EE3\u6587\u5B57", "blog", "textarea"),
  field("page.about.eyebrow", "\u95DC\u65BC\u9801\u7709\u6A19", "about"),
  field("page.about.title", "\u95DC\u65BC\u9801\u6A19\u984C", "about"),
  field("page.about.intro", "\u95DC\u65BC\u9801\u5C0E\u8A00", "about", "textarea"),
  field("page.about.image", "\u95DC\u65BC\u9801\u4E3B\u5716", "about", "image"),
  field("page.about.imageAlt", "\u95DC\u65BC\u9801\u4E3B\u5716\u66FF\u4EE3\u6587\u5B57", "about", "textarea"),
  field("page.contact.eyebrow", "\u9810\u7D04\u9801\u7709\u6A19", "contact"),
  field("page.contact.title", "\u9810\u7D04\u9801\u6A19\u984C", "contact"),
  field("page.contact.intro", "\u9810\u7D04\u9801\u5C0E\u8A00", "contact", "textarea"),
  field("page.contact.formTitle", "LINE \u806F\u7D61\u5340\u6A19\u984C", "contact"),
  field("page.contact.formIntro", "LINE \u806F\u7D61\u5340\u8AAA\u660E", "contact", "textarea"),
  field("page.contact.submitCta", "\u9810\u7D04\u9801 LINE \u6309\u9215\u6587\u5B57", "contact"),
  field("page.contact.topic.0", "\u9810\u7D04\u670D\u52D9\u4E3B\u984C\u4E00", "contact"),
  field("page.contact.topic.1", "\u9810\u7D04\u670D\u52D9\u4E3B\u984C\u4E8C", "contact"),
  field("page.contact.topic.2", "\u9810\u7D04\u670D\u52D9\u4E3B\u984C\u4E09", "contact"),
  field("page.contact.image", "\u9810\u7D04\u9801\u4E3B\u5716", "contact", "image"),
  field("page.contact.imageAlt", "\u9810\u7D04\u9801\u4E3B\u5716\u66FF\u4EE3\u6587\u5B57", "contact", "textarea"),
  field("error.notFoundTitle", "404 \u9801\u6A19\u984C", "error"),
  field("error.notFoundBack", "404 \u8FD4\u56DE\u9996\u9801\u6309\u9215", "error")
];
var DEFAULT_FIELD_VALUES = {
  "global.logo": "/assets/solution-car-wrap-logo.png",
  "global.logoAlt": "Solution Car Wrap",
  "global.ksgLogo": "/assets/ksg-logo.png",
  "global.ksgLogoAlt": "KSG",
  "global.lineUrl": "",
  "global.lineLabel": "\u52A0\u5165\u5B98\u65B9Line@",
  "global.logoButtonAria": "\u56DE\u5230\u9996\u9801",
  "global.mainNavAria": "\u4E3B\u8981\u5C0E\u89BD",
  "global.mobileNavAria": "\u884C\u52D5\u7248\u5C0E\u89BD",
  "global.menuOpenAria": "\u958B\u555F\u9078\u55AE",
  "global.menuCloseAria": "\u95DC\u9589\u9078\u55AE",
  "global.memberLabel": "\u6703\u54E1\u5C08\u5340",
  "global.memberLoadingLabel": "\u6703\u54E1\u72C0\u614B\u78BA\u8A8D\u4E2D",
  "global.headerBookingCta": "\u9810\u7D04\u8AEE\u8A62",
  "global.adminLinkLabel": "\u7DB2\u7AD9\u5167\u5BB9\u5F8C\u53F0",
  "global.previewBannerLabel": "\u8349\u7A3F\u9810\u89BD \xB7 \u5C1A\u672A\u767C\u5E03",
  "global.previewReturnLabel": "\u8FD4\u56DE\u5167\u5BB9\u5F8C\u53F0",
  "global.servicesMenuToggle": "\u5C55\u958B\u670D\u52D9\u9805\u76EE",
  "global.servicesAllLabel": "\u67E5\u770B\u6240\u6709\u670D\u52D9",
  "nav.services": "\u670D\u52D9\u9805\u76EE",
  "nav.ai": "AI\u8ECA\u8272",
  "nav.process": "\u65BD\u5DE5\u6D41\u7A0B",
  "nav.blog": "Blog/\u6539\u88DD\u6848\u4F8B",
  "nav.about": "\u95DC\u65BCSolution",
  "nav.contact": "\u9810\u7D04\u8AEE\u8A62",
  "nav.member": "\u6703\u54E1\u5C08\u5340",
  "home.hero.eyebrow": "SURFACE INSPECTION \xB7 PRECISION AUTO CARE",
  "home.hero.titleLine1": "INSPECT THE",
  "home.hero.titleLine2": "FINISH.",
  "home.hero.description": "\u5148\u8B80\u61C2\u6F06\u9762\u72C0\u614B\uFF0C\u518D\u5EFA\u7ACB\u5408\u9069\u7684\u9632\u8B77\u3002Solution \u5C08\u6CE8\u6C7D\u8ECA\u5305\u819C\u3001\u6F06\u9762\u4FDD\u8B77\u819C\u8207\u7CBE\u7DFB\u7F8E\u5BB9\u3002",
  "home.hero.image": "/assets/solution-hero-new.jpg",
  "home.hero.imageAlt": "\u6DF1\u8272\u8DD1\u8ECA\u65BC\u5C08\u696D\u65BD\u5DE5\u7A7A\u9593\u4E2D\u5448\u73FE\u8ECA\u6F06\u8207\u4FDD\u8B77\u819C\u7684\u5149\u6FA4",
  "home.hero.primaryCta": "\u63A2\u7D22\u670D\u52D9",
  "home.hero.secondaryCta": "\u7DDA\u4E0A\u9810\u89BD\u8ECA\u8272",
  "home.hero.scanLabel": "LIVE SURFACE SCAN",
  "home.hero.finishLabel": "FINISH",
  "home.hero.finishValue": "STABLE",
  "home.hero.reflectionLabel": "REFLECTION",
  "home.hero.reflectionValue": "98.4%",
  "home.hero.edgeLabel": "FILM EDGE",
  "home.hero.edgeValue": "CHECKED",
  "home.hero.panelEyebrow": "READ EVERY PANEL FIRST",
  "home.hero.panelCopy": "\u5F9E\u6F06\u9762\u72C0\u614B\u958B\u59CB\uFF0C\u518D\u6C7A\u5B9A\u4FDD\u8B77\u65B9\u5F0F\u3002",
  "home.hero.scrollAria": "\u5411\u4E0B\u67E5\u770B\u670D\u52D9",
  "home.servicesLinkCta": "\u67E5\u770B\u670D\u52D9\u9805\u76EE",
  "home.processLinkCta": "\u4E86\u89E3\u65BD\u5DE5\u6D41\u7A0B",
  "about.eyebrow": "THE SOLUTION STANDARD",
  "about.intro": "\u597D\u7684\u4FDD\u8B77\u4E0D\u53EA\u62B5\u6297\u74B0\u5883\uFF0C\u4E5F\u61C9\u8A72\u8B93\u6BCF\u4E00\u7247\u9211\u4EF6\u770B\u8D77\u4F86\u66F4\u50CF\u5B83\u539F\u672C\u8A72\u6709\u7684\u6A23\u5B50\u3002",
  "about.titleLine1": "PROTECTION STARTS",
  "about.titleLine2": "WITH",
  "about.titleAccent": "INSPECTION.",
  "about.value.0.label": "MATERIAL",
  "about.value.0.copy": "\u6311\u9078\u8207\u8ECA\u6CC1\u76F8\u7A31\u7684\u819C\u6599\u3001\u5857\u5C64\u8207\u5DE5\u6CD5\u3002",
  "about.value.1.label": "PRECISION",
  "about.value.1.copy": "\u5F9E\u908A\u89D2\u3001\u6536\u908A\u5230\u53CD\u5149\uFF0C\u9010\u4E00\u78BA\u8A8D\u5B8C\u6210\u5EA6\u3002",
  "about.value.2.label": "AFTERCARE",
  "about.value.2.copy": "\u65BD\u5DE5\u5B8C\u6210\u5F8C\uFF0C\u63D0\u4F9B\u6E05\u695A\u7684\u65E5\u5E38\u990A\u8B77\u5EFA\u8B70\u3002",
  "services.eyebrow": "SELECT YOUR PROTECTION",
  "services.titleLine1": "SERVICE",
  "services.titleLine2": "INDEX",
  "services.description": "\u4F9D\u7167\u8ECA\u6CC1\u3001\u505C\u8ECA\u74B0\u5883\u8207\u7528\u8ECA\u7FD2\u6163\uFF0C\u9078\u64C7\u6700\u9069\u5408\u7684\u9632\u8B77\u8207\u6574\u7406\u65B9\u6848\u3002",
  "services.0.number": "01",
  "services.0.title": "\u6C7D\u8ECA\u6539\u8272\u5305\u819C",
  "services.0.english": "VINYL WRAP",
  "services.0.description": "\u5F9E\u9727\u9762\u3001\u7DDE\u9762\u5230\u9AD8\u5149\u6FA4\u8CEA\u611F\uFF0C\u8B93\u8ECA\u8272\u6210\u70BA\u4F60\u7684\u98A8\u683C\u8A9E\u8A00\uFF0C\u540C\u6642\u4FDD\u7559\u539F\u5EE0\u8ECA\u6F06\u7684\u5B8C\u6574\u6027\u3002",
  "services.0.detail": "\u5168\u8ECA\u6539\u8272\u30FB\u5C40\u90E8\u6539\u8272\u30FB\u98FE\u4EF6\u5305\u8986",
  "services.0.image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=88",
  "services.0.imageAlt": "\u6C7D\u8ECA\u6539\u8272\u5305\u819C\u670D\u52D9",
  "services.0.ctaAriaLabel": "\u8AEE\u8A62\u6C7D\u8ECA\u6539\u8272\u5305\u819C",
  "services.1.number": "02",
  "services.1.title": "\u6F06\u9762\u4FDD\u8B77\u819C",
  "services.1.english": "PAINT PROTECTION FILM",
  "services.1.description": "\u91DD\u5C0D\u9AD8\u885D\u64CA\u5340\u57DF\u8207\u5168\u8ECA\u6F06\u9762\u5EFA\u7ACB\u900F\u660E\u9632\u8B77\u5C64\uFF0C\u6E1B\u5C11\u65E5\u5E38\u98DB\u77F3\u3001\u522E\u75D5\u8207\u74B0\u5883\u75D5\u8DE1\u3002",
  "services.1.detail": "TPU \u4FDD\u8B77\u819C\u30FB\u9AD8\u885D\u64CA\u5340\u57DF\u30FB\u5168\u8ECA\u9632\u8B77",
  "services.1.image": "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=88",
  "services.1.imageAlt": "\u6F06\u9762\u4FDD\u8B77\u819C\u670D\u52D9",
  "services.1.ctaAriaLabel": "\u8AEE\u8A62\u6F06\u9762\u4FDD\u8B77\u819C",
  "services.2.number": "03",
  "services.2.title": "\u7CBE\u7DFB\u6C7D\u8ECA\u7F8E\u5BB9",
  "services.2.english": "DETAILING STUDIO",
  "services.2.description": "\u4EE5\u6F06\u9762\u6821\u6B63\u3001\u6DF1\u5C64\u6E05\u6F54\u8207\u934D\u819C\u4FDD\u8B77\uFF0C\u5C07\u8ECA\u6CC1\u56DE\u5FA9\u5230\u61C9\u6709\u7684\u4E7E\u6DE8\u3001\u6E05\u6670\u8207\u53CD\u5149\u5C64\u6B21\u3002",
  "services.2.detail": "\u6F06\u9762\u6821\u6B63\u30FB\u934D\u819C\u4FDD\u8B77\u30FB\u5167\u88DD\u6DF1\u5C64\u6E05\u6F54",
  "services.2.image": "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1400&q=88",
  "services.2.imageAlt": "\u7CBE\u7DFB\u6C7D\u8ECA\u7F8E\u5BB9\u670D\u52D9",
  "services.2.ctaAriaLabel": "\u8AEE\u8A62\u7CBE\u7DFB\u6C7D\u8ECA\u7F8E\u5BB9",
  "ai.eyebrow": "WRAP COLOR LAB / 01",
  "ai.intro": "\u4E0A\u50B3\u5BE6\u8ECA\u7167\u7247\uFF0C\u5F9E KSG \u578B\u9304\u9078\u64C7\u8272\u7CFB\u8207\u8272\u865F\uFF0C\u5148\u5728\u7DDA\u4E0A\u6AA2\u8996\u6539\u8272\u5305\u819C\u7684\u6982\u5FF5\u65B9\u5411\u3002",
  "ai.titleLine1": "COLOR,",
  "ai.titleLine2": "SIMULATED.",
  "ai.description": "\u7DDA\u4E0A\u5BA2\u88FD\u5316\u5305\u819C\u8ECA\u8272\u9810\u89BD\uFF0C\u8B93\u4F60\u7684\u611B\u8ECA\u5728\u6B63\u5F0F\u65BD\u5DE5\u524D\uFF0C\u5148\u770B\u898B\u4E0B\u4E00\u7A2E\u8868\u9762\u72C0\u614B\u3002",
  "ai.inputModuleLabel": "INPUT MODULE",
  "ai.inputModuleStep": "01\u201402",
  "ai.photo.stepLabel": "01\uFF0F\u4E0A\u50B3\u611B\u8ECA\u7167\u7247",
  "ai.photo.selectLabel": "\u9078\u64C7\u8ECA\u8F1B\u7167\u7247",
  "ai.photo.formatHint": "JPG\u3001PNG\u3001WEBP\u30FB\u6700\u5927 6MB\n\u5EFA\u8B70\u4F7F\u7528\u65E5\u9593\u3001\u8ECA\u8EAB\u5B8C\u6574\u5165\u93E1\u7684\u7167\u7247",
  "ai.photo.uploadedAlt": "\u5F85\u751F\u6210\u9810\u89BD\u7684\u4E0A\u50B3\u611B\u8ECA\u7167\u7247",
  "ai.photo.removeAriaLabel": "\u79FB\u9664\u7167\u7247",
  "ai.vehicle.label": "\u8ECA\u6B3E\uFF0F\u8ECA\u7CFB\uFF08\u9078\u586B\uFF09",
  "ai.vehicle.placeholder": "\u4F8B\u5982\uFF1APorsche Taycan 4S\u3001BMW M3 G80",
  "ai.vehicle.help": "\u53EA\u7528\u65BC\u6703\u54E1\u7D00\u9304\u8207 CRM \u641C\u5C0B\uFF0C\u4E0D\u6703\u6539\u8B8A AI \u7522\u5716\u5167\u5BB9\u3002",
  "ai.catalog.stepLabel": "02\uFF0F\u578B\u9304\u8272\u5361\u8272\u865F",
  "ai.catalog.countSuffix": "COLORS",
  "ai.catalog.categorySelectLabel": "\u9078\u64C7\u8272\u7CFB",
  "ai.catalog.colorSelectLabel": "\u9078\u64C7\u578B\u9304\u8272\u865F",
  "ai.catalog.colorCountSuffix": "\u8272",
  "ai.catalog.swatchAltSuffix": "\u5BE6\u9AD4\u6750\u8CEA\u8272\u5361\u9810\u89BD",
  "ai.catalog.description": "\u578B\u9304\u5DF2\u4F9D\u7D05\u8272\u7CFB\u3001\u6A59\u8272\u7CFB\u3001\u9EC3\u8272\u7CFB\u7B49 15 \u500B\u8272\u7CFB\u5206\u7D44\u3002\u9078\u5B9A\u8272\u865F\u5F8C\uFF0C\u7CFB\u7D71\u6703\u5C07 PDF \u7684\u5BE6\u969B\u6750\u8CEA\u8272\u5361\u4E00\u4F75\u5E36\u5165 AI\uFF0C\u8B93\u9810\u89BD\u66F4\u8CBC\u8FD1\u819C\u6599\u8272\u76F8\u8207\u91D1\u5C6C\uFF0F\u73E0\u5149\u8CEA\u611F\u3002",
  "ai.catalog.customLabel": "\u81EA\u8A02",
  "ai.catalog.customPlaceholder": "\u975E\u578B\u9304\u8272\u865F\u53EF\u5728\u6B64\u8F38\u5165",
  "ai.partial.stepLabel": "03\uFF0F\u5C40\u90E8\u5305\u819C\u5BA2\u88FD\u5316",
  "ai.partial.description": "\u53EF\u8907\u9078\u96F6\u4EF6\uFF1B\u6BCF\u9805\u50C5\u63D0\u4F9B\u9ED1\u5316\u6216\u78B3\u7E96\u7DAD\u5169\u7A2E\u6548\u679C\u3002",
  "ai.partial.finishGroupSuffix": "\u6750\u8CEA\u9078\u64C7",
  "ai.partial.appliedPrefix": "\u5DF2\u5957\u7528\uFF1A",
  "ai.error.previewLoad": "\u9810\u89BD\u5716\u7247\u8B80\u53D6\u5931\u6557",
  "ai.error.previewConvert": "\u9810\u89BD\u5716\u7247\u7121\u6CD5\u8F49\u63DB",
  "ai.error.fileType": "\u8ACB\u4E0A\u50B3\u5C0F\u65BC 6MB \u7684 JPG\u3001PNG \u6216 WEBP \u8ECA\u8F1B\u7167\u7247\u3002",
  "ai.error.fileRead": "\u7167\u7247\u8B80\u53D6\u5931\u6557\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u6A94\u6848\u3002",
  "ai.error.fileFormat": "\u7167\u7247\u683C\u5F0F\u7121\u6CD5\u8FA8\u8B58\uFF0C\u8ACB\u91CD\u65B0\u4E0A\u50B3\u3002",
  "ai.error.dimensions": "\u7121\u6CD5\u8FA8\u8B58\u7167\u7247\u5C3A\u5BF8\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u6A94\u6848\u3002",
  "ai.error.photoRequired": "\u8ACB\u5148\u4E0A\u50B3\u4E00\u5F35\u6E05\u695A\u3001\u53EF\u770B\u5230\u5B8C\u6574\u8ECA\u8EAB\u7684\u611B\u8ECA\u7167\u7247\u3002",
  "ai.error.colorRequired": "\u8ACB\u5F9E\u578B\u9304\u9078\u64C7\u4E00\u500B\u8272\u865F\uFF0C\u6216\u8F38\u5165\u81EA\u8A02\u8272\u865F\u3002",
  "ai.auth.loginRequired": "\u8ACB\u5148\u767B\u5165\u6703\u54E1",
  "ai.auth.loginRequiredDescription": "\u767B\u5165\u5F8C\u624D\u80FD\u5C07\u5716\u7247\u4FDD\u5B58 30 \u5929\u3002",
  "ai.toast.generateSuccess": "\u9810\u89BD\u5DF2\u5B8C\u6210",
  "ai.toast.saved": "\u5716\u7247\u5DF2\u4FDD\u5B58 30 \u5929",
  "ai.toast.savedDescription": "\u4F60\u53EF\u4EE5\u5728\u6703\u54E1\u5C08\u5340\u7684\u9810\u89BD\u6B77\u53F2\u4E2D\u67E5\u770B\u3002",
  "ai.toast.saveFailed": "\u5716\u7247\u4FDD\u5B58\u5931\u6557",
  "ai.toast.historySaveWarning": "\u9810\u89BD\u5DF2\u5B8C\u6210\uFF0C\u4F46\u6B77\u53F2\u7D00\u9304\u66AB\u6642\u7121\u6CD5\u4FDD\u5B58",
  "ai.toast.historySaveWarningDescription": "\u8ACB\u7A0D\u5F8C\u5230\u6703\u54E1\u5C08\u5340\u91CD\u8A66\u3002",
  "ai.toast.loginSaveDescription": "\u767B\u5165\u6703\u54E1\u5F8C\uFF0C\u5B8C\u6210\u7684\u9810\u89BD\u624D\u6703\u81EA\u52D5\u4FDD\u5B58\u3002",
  "ai.toast.generateFailed": "\u7121\u6CD5\u751F\u6210\u9810\u89BD",
  "ai.toast.downloadStarted": "\u4E0B\u8F09\u5DF2\u958B\u59CB",
  "ai.toast.savedStatus": "\u5DF2\u4FDD\u5B58 30 \u5929",
  "ai.toast.temporaryStatus": "\u76EE\u524D\u66AB\u5B58 3 \u5929\uFF0C\u6309\u4E0B\u300C\u5132\u5B58\u5716\u7247\u300D\u53EF\u5EF6\u9577\u81F3 30 \u5929",
  "ai.toast.previewSavedDescription": "\u7684\u5305\u819C\u6982\u5FF5\u9810\u89BD\u5DF2\u5B8C\u6210\uFF0C\u5DF2\u66AB\u5B58 3 \u5929\u3002",
  "ai.toast.previewDescription": "\u7684\u5305\u819C\u6982\u5FF5\u9810\u89BD\u5DF2\u5B8C\u6210\u3002",
  "ai.saveButton.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "ai.saveButton.saved": "\u5DF2\u4FDD\u5B58 30 \u5929",
  "ai.saveButton.default": "\u5132\u5B58\u5716\u7247",
  "ai.action.compare": "A\uFF5CB \u6BD4\u8F03",
  "ai.action.download": "\u4E0B\u8F09\u5716\u7247",
  "ai.action.regenerate": "\u91CD\u65B0\u751F\u6210",
  "ai.generateButton.processing": "AI \u6B63\u5728\u751F\u6210\u5305\u819C\u9810\u89BD",
  "ai.generateButton.default": "\u751F\u6210\u8ECA\u8272\u9810\u89BD",
  "ai.output.beforeLabel": "A ORIGINAL",
  "ai.output.afterLabel": "B AI PREVIEW",
  "ai.output.compareAlt": "\u539F\u59CB\u8ECA\u7167\u8207 AI \u8ECA\u8272\u9810\u89BD\u6BD4\u8F03",
  "ai.output.imageAltPrefix": "\u4EE5",
  "ai.output.generatedLabel": "CONCEPT PREVIEW GENERATED",
  "ai.output.targetLabel": "\u76EE\u6A19\u8272\u865F\uFF1A",
  "ai.output.ratioLabel": "\u8F38\u51FA\u6BD4\u4F8B\uFF1A",
  "ai.output.partialLabel": "\u5C40\u90E8\u5305\u819C\uFF1A",
  "ai.output.materialCardLabel": "PDF MATERIAL CARD",
  "ai.output.materialCardEnabled": "\u5BE6\u9AD4\u8272\u5361\u53C3\u8003\u5DF2\u555F\u7528",
  "ai.output.materialCardHelp": "\u8ACB\u5728\u5716\u7247\u5916\u5074\u5C0D\u7167\u8272\u5361\u8207\u8ECA\u8EAB\u4E3B\u8272\uFF1B\u5982\u660E\u986F\u504F\u96E2\uFF0C\u53EF\u91CD\u65B0\u751F\u6210\u3002",
  "ai.processing.title": "PROCESSING SURFACE",
  "ai.processing.description": "AI \u6B63\u5728\u4FDD\u7559\u4F60\u7684\u8ECA\u578B\u8207\u62CD\u651D\u89D2\u5EA6\uFF0C\u4E26\u91CD\u5EFA\u6307\u5B9A\u578B\u9304\u8272\u865F\u7684\u5305\u819C\u6750\u8CEA\u8207\u8ECA\u6F06\u53CD\u5149\u3002",
  "ai.output.placeholderLabel": "OUTPUT PREVIEW",
  "ai.output.placeholderTitleLine1": "YOUR",
  "ai.output.placeholderTitleLine2": "NEXT",
  "ai.output.placeholderTitleLine3": "FINISH.",
  "ai.output.placeholderDescription": "\u4E0A\u50B3\u7167\u7247\u4E26\u5F9E\u578B\u9304\u9078\u64C7\u8272\u865F\u5F8C\uFF0C\u9019\u88E1\u6703\u986F\u793A\u5C08\u5C6C\u65BC\u4F60\u8ECA\u8F1B\u7684\u6539\u8272\u5305\u819C\u6982\u5FF5\u9810\u89BD\u3002",
  "ai.storageNotice": "\u6309\u4E0B\u300C\u5132\u5B58\u5716\u7247\u300D\u9215\u5C07\u4FDD\u5B58 30 \u5929\uFF0C\u672A\u5132\u5B58\u7684\u5716\u7247\u53EA\u4FDD\u7559 3 \u5929",
  "ai.disclaimer": "\u6B64\u529F\u80FD\u63D0\u4F9B AI \u8996\u89BA\u6982\u5FF5\u9810\u89BD\uFF0C\u578B\u9304\u8272\u865F\u8207\u87A2\u5E55\u5448\u73FE\u6703\u53D7\u5F71\u50CF\u5149\u7DDA\u5F71\u97FF\uFF1B\u5BE6\u969B\u65BD\u5DE5\u524D\uFF0C\u4ECD\u61C9\u4EE5\u5BE6\u9AD4\u5305\u819C\u8272\u6A23\u8207\u5E97\u5167\u78BA\u8A8D\u7D50\u679C\u70BA\u6E96\u3002",
  "process.eyebrow": "FROM FIRST LOOK TO FINAL LIGHT",
  "process.titleLine1": "BEFORE",
  "process.titleLine2": "THE FINISH.",
  "process.description": "\u5F9E\u53BB\u9664\u8868\u9762\u6C61\u67D3\u3001\u78BA\u8A8D\u6F06\u9762\u7F3A\u9677\uFF0C\u5230\u819C\u6599\u6536\u908A\u8207\u4EA4\u8ECA\u5F8C\u990A\u8B77\uFF0C\u6BCF\u4E00\u500B\u74B0\u7BC0\u90FD\u6703\u7559\u4E0B\u61C9\u6709\u7684\u5B8C\u6210\u72C0\u614B\u3002",
  "process.0.number": "01",
  "process.0.title": "\u6AA2\u8996",
  "process.0.description": "\u78BA\u8A8D\u8ECA\u6CC1\u3001\u4F7F\u7528\u7FD2\u6163\u8207\u4FDD\u8B77\u76EE\u6A19\u3002",
  "process.1.number": "02",
  "process.1.title": "\u898F\u5283",
  "process.1.description": "\u4F9D\u8ECA\u578B\u8207\u9810\u7B97\u5EFA\u8B70\u65BD\u5DE5\u7BC4\u570D\u8207\u6750\u8CEA\u3002",
  "process.2.number": "03",
  "process.2.title": "\u65BD\u5DE5",
  "process.2.description": "\u5728\u63A7\u6EAB\u3001\u6F54\u6DE8\u7684\u5DE5\u5E8F\u4E2D\u5B8C\u6210\u6BCF\u4E00\u8655\u7D30\u7BC0\u3002",
  "process.3.number": "04",
  "process.3.title": "\u4EA4\u4ED8",
  "process.3.description": "\u8AAA\u660E\u990A\u8B77\u65B9\u5F0F\uFF0C\u8B93\u5B8C\u6210\u72C0\u614B\u6301\u7E8C\u66F4\u4E45\u3002",
  "aftercare.eyebrow": "DESIGNED FOR DAILY REALITY",
  "aftercare.titleLine1": "AFTERCARE",
  "aftercare.titleLine2": "PRESERVES",
  "aftercare.titleLine3": "THE FINISH.",
  "aftercare.description": "\u65BD\u5DE5\u7D50\u675F\u5F8C\uFF0C\u900F\u904E\u6B63\u78BA\u6D17\u8ECA\u3001\u4E7E\u71E5\u8207\u990A\u8B77\u9031\u671F\uFF0C\u8B93\u819C\u9762\u8207\u6F06\u9762\u7684\u5149\u6FA4\u7DAD\u6301\u5728\u4F60\u671F\u5F85\u7684\u72C0\u614B\u3002",
  "aftercare.badge.0.label": "QUALIFIED MATERIALS",
  "aftercare.badge.1.label": "CONTROLLED WORKFLOW",
  "aftercare.badge.2.label": "CARE GUIDANCE",
  "contact.eyebrow": "SCHEDULE A SURFACE REVIEW",
  "contact.titleLine1": "CHECK THE",
  "contact.titleLine2": "FINISH",
  "contact.titleLine3": "FIRST.",
  "contact.description": "\u544A\u8A34\u6211\u5011\u8ECA\u578B\u3001\u6F06\u9762\u72C0\u614B\u8207\u505C\u8ECA\u60C5\u5883\u3002\u5F9E\u4FDD\u8B77\u7BC4\u570D\u3001\u819C\u6599\u9078\u64C7\u5230\u4EA4\u8ECA\u5F8C\u990A\u8B77\uFF0C\u6211\u5011\u6703\u5148\u5B8C\u6210\u4E00\u4EFD\u6E05\u695A\u7684\u65BD\u5DE5\u5EFA\u8B70\u3002",
  "contact.primaryCta": "\u9810\u7D04\u8ECA\u6CC1\u6AA2\u8996",
  "contact.bookingToastTitle": "\u5B98\u65B9 LINE \u9023\u7D50\u5C1A\u672A\u8A2D\u5B9A",
  "contact.bookingToastDescription": "\u8ACB\u65BC\u5F8C\u53F0\u8A2D\u5B9A\u5B98\u65B9 LINE@ \u9023\u7D50\u5F8C\uFF0C\u9EDE\u64CA\u7DA0\u8272\u6309\u9215\u5373\u53EF\u76F4\u63A5\u806F\u7D61\u6211\u5011\u3002",
  "footer.descriptionLine1": "\u6C7D\u8ECA\u5305\u819C\u30FB\u6F06\u9762\u4FDD\u8B77\u819C\u30FB\u7CBE\u7DFB\u6C7D\u8ECA\u7F8E\u5BB9",
  "footer.descriptionLine2": "\u4EE5\u7D30\u7BC0\u8207\u5DE5\u5E8F\u6253\u78E8\u6BCF\u4E00\u6B21\u4EA4\u4ED8\u3002",
  "footer.logoAlt": "Solution Car Wrap",
  "footer.copyright": "\xA9 2026 SOLUTION AUTOMOTIVE STUDIO",
  "footer.credit": "CRAFTED WITH INTENT \xB7 TAIWAN",
  "page.services.eyebrow": "SERVICE INDEX",
  "page.services.title": "\u670D\u52D9\u9805\u76EE",
  "page.services.intro": "\u4F9D\u7167\u8ECA\u6CC1\u3001\u505C\u8ECA\u74B0\u5883\u8207\u4F7F\u7528\u7FD2\u6163\uFF0C\u70BA\u4F60\u7684\u8ECA\u9078\u64C7\u5408\u9069\u7684\u5305\u819C\u3001\u6F06\u9762\u4FDD\u8B77\u8207\u7F8E\u5BB9\u65B9\u6848\u3002",
  "page.services.image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=88",
  "page.services.imageAlt": "Solution \u6C7D\u8ECA\u5305\u819C\u8207\u6F06\u9762\u4FDD\u8B77\u670D\u52D9",
  "page.services.cta": "\u9810\u7D04\u8AEE\u8A62",
  "page.ai.eyebrow": "WRAP COLOR LAB",
  "page.ai.title": "AI \u8ECA\u8272\u9810\u89BD",
  "page.ai.intro": "\u4E0A\u50B3\u611B\u8ECA\u7167\u7247\uFF0C\u5148\u7528\u578B\u9304\u8272\u865F\u770B\u898B\u6539\u8272\u5305\u819C\u7684\u6982\u5FF5\u65B9\u5411\uFF0C\u518D\u8207\u73FE\u5834\u6750\u8CEA\u548C\u65BD\u5DE5\u5EFA\u8B70\u4E00\u8D77\u78BA\u8A8D\u3002",
  "page.ai.image": "/assets/solution-hero-midnight.jpg",
  "page.ai.imageAlt": "\u5C08\u696D\u65BD\u5DE5\u7A7A\u9593\u4E2D\u7684\u8ECA\u8F1B\u8868\u9762\u8207\u5305\u819C\u5149\u6FA4",
  "page.process.eyebrow": "FROM FIRST LOOK TO FINAL LIGHT",
  "page.process.title": "\u65BD\u5DE5\u6D41\u7A0B",
  "page.process.intro": "\u5F9E\u7B2C\u4E00\u6B21\u6AA2\u8996\u5230\u4EA4\u8ECA\u5F8C\u990A\u8B77\uFF0C\u6BCF\u4E00\u500B\u6B65\u9A5F\u90FD\u4EE5\u53EF\u78BA\u8A8D\u3001\u53EF\u7DAD\u6301\u7684\u5B8C\u6210\u72C0\u614B\u70BA\u76EE\u6A19\u3002",
  "page.process.image": "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1600&q=88",
  "page.process.imageAlt": "\u6C7D\u8ECA\u7F8E\u5BB9\u65BD\u5DE5\u4E2D\u7684\u8ECA\u8F1B\u8868\u9762",
  "page.blog.eyebrow": "BLOG / CASE INDEX",
  "page.blog.title": "Blog\uFF0F\u6539\u88DD\u6848\u4F8B",
  "page.blog.intro": "\u8A18\u9304\u6750\u8CEA\u9078\u64C7\u3001\u65BD\u5DE5\u89C0\u5BDF\u8207\u65E5\u5E38\u990A\u8B77\uFF0C\u8B93\u6BCF\u4E00\u6B21\u8868\u9762\u6C7A\u7B56\u90FD\u6709\u6E05\u695A\u7684\u53C3\u8003\u3002",
  "page.blog.emptyTitle": "\u6848\u4F8B\u5167\u5BB9\u6E96\u5099\u4E2D",
  "page.blog.emptyDescription": "\u6B63\u5F0F\u6848\u4F8B\u8207\u65BD\u5DE5\u7D00\u9304\u4E0A\u7DDA\u5F8C\uFF0C\u6703\u5728\u9019\u88E1\u6301\u7E8C\u66F4\u65B0\u3002",
  "page.blog.readCta": "\u95B1\u8B80\u6587\u7AE0",
  "page.blog.backCta": "\u8FD4\u56DE Blog\uFF0F\u6539\u88DD\u6848\u4F8B",
  "page.blog.notFoundTitle": "\u627E\u4E0D\u5230\u9019\u7BC7\u6587\u7AE0",
  "page.blog.image": "/assets/solution-hero-midnight.jpg",
  "page.blog.imageAlt": "Solution \u6C7D\u8ECA\u8868\u9762\u65BD\u5DE5\u7D30\u7BC0",
  "page.about.eyebrow": "THE SOLUTION STANDARD",
  "page.about.title": "\u95DC\u65BC Solution",
  "page.about.intro": "\u597D\u7684\u4FDD\u8B77\u59CB\u65BC\u7406\u89E3\u8ECA\u6CC1\uFF0C\u4E26\u5728\u6750\u6599\u3001\u7CBE\u5EA6\u8207\u990A\u8B77\u4E4B\u9593\u5EFA\u7ACB\u9577\u671F\u53EF\u9760\u7684\u6A19\u6E96\u3002",
  "page.about.image": "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=88",
  "page.about.imageAlt": "\u8ECA\u8F1B\u6F06\u9762\u5728\u5149\u7DDA\u4E0B\u5448\u73FE\u7D30\u7DFB\u53CD\u5149",
  "page.contact.eyebrow": "SCHEDULE A SURFACE REVIEW",
  "page.contact.title": "\u9810\u7D04\u8AEE\u8A62",
  "page.contact.intro": "\u544A\u8A34\u6211\u5011\u8ECA\u578B\u3001\u4F7F\u7528\u60C5\u5883\u8207\u60F3\u9054\u6210\u7684\u8868\u9762\u72C0\u614B\uFF0C\u6211\u5011\u6703\u5148\u5F9E\u8ECA\u6CC1\u6AA2\u8996\u958B\u59CB\uFF0C\u6574\u7406\u9069\u5408\u7684\u65BD\u5DE5\u65B9\u5411\u3002",
  "page.contact.formTitle": "\u52A0\u5165\u5B98\u65B9 LINE@",
  "page.contact.formIntro": "\u900F\u904E LINE \u63D0\u4F9B\u8ECA\u578B\u3001\u4F7F\u7528\u60C5\u5883\u8207\u60F3\u9054\u5230\u7684\u8868\u9762\u72C0\u614B\uFF0C\u6211\u5011\u6703\u5148\u6574\u7406\u9069\u5408\u7684\u65BD\u5DE5\u65B9\u5411\u3002",
  "page.contact.submitCta": "\u52A0\u5165\u5B98\u65B9Line@",
  "page.contact.topic.0": "\u6C7D\u8ECA\u5305\u819C\uFF0F\u6539\u8272",
  "page.contact.topic.1": "\u6F06\u9762\u4FDD\u8B77\u819C",
  "page.contact.topic.2": "\u7CBE\u7DFB\u6C7D\u8ECA\u7F8E\u5BB9",
  "page.contact.image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=88",
  "page.contact.imageAlt": "Solution \u6C7D\u8ECA\u5305\u819C\u9810\u7D04\u8AEE\u8A62",
  "error.notFoundTitle": "PAGE NOT FOUND",
  "error.notFoundBack": "\u56DE\u5230\u9996\u9801"
};
var KNOWN_FIELD_KEYS = new Set(CONTENT_FIELDS.map((item) => item.key));
if (KNOWN_FIELD_KEYS.size !== CONTENT_FIELDS.length) {
  throw new Error("CONTENT_FIELDS contains duplicate keys");
}
function createDefaultFields() {
  const unknownDefaults = Object.keys(DEFAULT_FIELD_VALUES).filter(
    (key) => !KNOWN_FIELD_KEYS.has(key)
  );
  if (unknownDefaults.length > 0) {
    throw new Error(
      `Default content contains unknown fields: ${unknownDefaults.join(", ")}`
    );
  }
  const fields = {};
  for (const definition of CONTENT_FIELDS) {
    const value = DEFAULT_FIELD_VALUES[definition.key];
    if (typeof value !== "string") {
      throw new Error(`Missing default content field: ${definition.key}`);
    }
    fields[definition.key] = value;
  }
  return fields;
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}
var DEFAULT_SITE_CONTENT = deepFreeze({
  schemaVersion: 1,
  fields: createDefaultFields(),
  posts: []
});
var MAX_TEXT_LENGTH = 1e4;
var MAX_DOCUMENT_BYTES = 5e5;
var MAX_POSTS = 100;
var MAX_ID_LENGTH = 128;
var MAX_SLUG_LENGTH = 120;
var POST_KEYS = /* @__PURE__ */ new Set([
  "id",
  "slug",
  "title",
  "category",
  "summary",
  "body",
  "image",
  "published",
  "date"
]);
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertText(value, label, max = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  if (value.length > max) {
    throw new Error(`${label} exceeds the ${max}-character limit`);
  }
  if (value.includes("\0")) {
    throw new Error(`${label} contains an invalid character`);
  }
}
function isSafeRelativeImageUrl(value) {
  if (!value || value.startsWith("//") || /[\u0000-\u0020\\]/.test(value)) {
    return false;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return false;
  }
  const path = value.split(/[?#]/, 1)[0];
  return path.length > 0 && !path.split("/").some((segment) => segment === "." || segment === "..");
}
function isSafeHttpsImageUrl(value) {
  if (!value.startsWith("https://") || /[\u0000-\u0020\\]/.test(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}
function assertImageUrl(value, label) {
  assertText(value, label);
  if (value === "") return;
  if (!isSafeRelativeImageUrl(value) && !isSafeHttpsImageUrl(value)) {
    throw new Error(`${label} must be a safe relative path or HTTPS image URL`);
  }
}
function assertLineUrl(value, label) {
  assertText(value, label, 2048);
  if (value === "") return;
  if (/[\u0000-\u0020\\]/.test(value)) {
    throw new Error(`${label} contains invalid URL characters`);
  }
  try {
    const url = new URL(value);
    const isAllowedHost = url.hostname === "line.me" && url.pathname.length > 1 || url.hostname === "lin.ee" && url.pathname.length > 1 || url.hostname === "liff.line.me" && url.pathname.length > 1;
    if (url.protocol !== "https:" || !isAllowedHost || url.username || url.password) {
      throw new Error(`${label} must use an approved LINE HTTPS URL`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("approved LINE")) {
      throw error;
    }
    throw new Error(`${label} must use an approved LINE HTTPS URL`);
  }
}
function assertDocumentSize(value) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error("Site content must be JSON-serializable");
  }
  const bytes = typeof TextEncoder === "undefined" ? serialized.length : new TextEncoder().encode(serialized).byteLength;
  if (bytes > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Site content exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`
    );
  }
}
function assertExactKeys(record, allowed, label) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error(`${label} contains unknown field: ${key}`);
    }
  }
}
function cloneAndValidatePost(value, index) {
  const label = `posts[${index}]`;
  if (!isRecord2(value)) throw new Error(`${label} must be an object`);
  assertExactKeys(value, POST_KEYS, label);
  POST_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`${label}.${key} is required`);
    }
  });
  assertText(value.id, `${label}.id`, MAX_ID_LENGTH);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value.id)) {
    throw new Error(`${label}.id must be a safe generated identifier`);
  }
  assertText(value.slug, `${label}.slug`, MAX_SLUG_LENGTH);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
    throw new Error(
      `${label}.slug must contain only lowercase ASCII letters, numbers, and hyphens`
    );
  }
  assertText(value.title, `${label}.title`);
  assertText(value.category, `${label}.category`);
  assertText(value.summary, `${label}.summary`);
  assertText(value.body, `${label}.body`);
  assertImageUrl(value.image, `${label}.image`);
  if (typeof value.published !== "boolean") {
    throw new Error(`${label}.published must be a boolean`);
  }
  assertText(value.date, `${label}.date`, 128);
  return {
    id: value.id,
    slug: value.slug,
    title: value.title,
    category: value.category,
    summary: value.summary,
    body: value.body,
    image: value.image,
    published: value.published,
    date: value.date
  };
}
function validateSiteContent(value) {
  assertDocumentSize(value);
  if (!isRecord2(value)) throw new Error("Site content must be an object");
  assertExactKeys(
    value,
    /* @__PURE__ */ new Set(["schemaVersion", "fields", "posts"]),
    "site content"
  );
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported site content schema version");
  }
  if (!isRecord2(value.fields))
    throw new Error("Site content fields must be an object");
  assertExactKeys(value.fields, KNOWN_FIELD_KEYS, "site content fields");
  const fields = {};
  for (const definition of CONTENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value.fields, definition.key)) {
      throw new Error(`Missing required site content field: ${definition.key}`);
    }
    const fieldValue = value.fields[definition.key];
    if (definition.type === "image") {
      assertImageUrl(fieldValue, definition.key);
    } else if (definition.type === "url") {
      assertLineUrl(fieldValue, definition.key);
    } else {
      assertText(fieldValue, definition.key);
    }
    fields[definition.key] = fieldValue;
  }
  if (!Array.isArray(value.posts))
    throw new Error("Site content posts must be an array");
  if (value.posts.length > MAX_POSTS) {
    throw new Error(`Site content supports at most ${MAX_POSTS} posts`);
  }
  const slugs = /* @__PURE__ */ new Set();
  const posts = value.posts.map((post, index) => {
    const safePost = cloneAndValidatePost(post, index);
    if (slugs.has(safePost.slug)) {
      throw new Error(`Duplicate blog post slug: ${safePost.slug}`);
    }
    slugs.add(safePost.slug);
    return safePost;
  });
  return deepFreeze({ schemaVersion: 1, fields, posts });
}

// server/cms/store.ts
var CMS_DOCUMENT_PATH = "cms/site.json";
var INITIAL_REVISION = "0";
var defaultBlobClient = {
  get: blobGet,
  put: blobPut
};
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
function cloneContent(content) {
  return JSON.parse(JSON.stringify(content));
}
function createInitialCmsDocument() {
  const content = cloneContent(DEFAULT_SITE_CONTENT);
  return {
    draft: cloneContent(content),
    published: cloneContent(content),
    revision: INITIAL_REVISION,
    updatedAt: null,
    publishedAt: null
  };
}
function parseNullableTimestamp(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new CmsStorageError("CMS document is invalid.");
  }
  return value;
}
function parseCmsDocument(value) {
  if (!isRecord3(value)) throw new CmsStorageError("CMS document is invalid.");
  const revision = value.revision;
  if (typeof revision !== "string" || !revision || revision.length > 200) {
    throw new CmsStorageError("CMS document is invalid.");
  }
  try {
    return {
      draft: validateSiteContent(value.draft),
      published: validateSiteContent(value.published),
      revision,
      updatedAt: parseNullableTimestamp(value.updatedAt),
      publishedAt: parseNullableTimestamp(value.publishedAt)
    };
  } catch (error) {
    if (error instanceof CmsStorageError) throw error;
    throw new CmsStorageError("CMS document is invalid.");
  }
}
function isBlobConflict(error) {
  if (!isRecord3(error)) return false;
  const name = typeof error.name === "string" ? error.name : "";
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  const status = error.status ?? error.statusCode;
  return name.includes("Precondition") || code.includes("Precondition") || name.includes("AlreadyExists") || code.includes("AlreadyExists") || /already exists|overwrite/i.test(message) || status === 409 || status === 412;
}
async function readStream(stream) {
  try {
    return Buffer.from(await new Response(stream).arrayBuffer());
  } catch {
    throw new CmsStorageError("CMS storage is unavailable.");
  }
}
function isBlobConfiguredByEnvironment() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN
  );
}
function createCmsStore(client = defaultBlobClient, options = {}) {
  const configured = options.configured ?? isBlobConfiguredByEnvironment();
  return {
    configured,
    async readSnapshot() {
      let result;
      try {
        result = await client.get(CMS_DOCUMENT_PATH, {
          access: "private",
          useCache: false
        });
      } catch {
        throw new CmsStorageError("CMS storage is unavailable.");
      }
      if (!result || result.statusCode === 404) {
        return {
          document: createInitialCmsDocument(),
          etag: null,
          exists: false
        };
      }
      if (result.statusCode !== 200 || !result.stream) {
        throw new CmsStorageError("CMS storage is unavailable.");
      }
      const raw = await readStream(result.stream);
      let parsed;
      try {
        parsed = JSON.parse(raw.toString("utf8"));
      } catch {
        throw new CmsStorageError("CMS document is invalid.");
      }
      return {
        document: parseCmsDocument(parsed),
        etag: result.blob.etag,
        exists: true
      };
    },
    async writeSnapshot(snapshot, document) {
      const options2 = {
        access: "private",
        allowOverwrite: snapshot.exists,
        contentType: "application/json; charset=utf-8"
      };
      if (snapshot.exists) {
        if (!snapshot.etag) throw new CmsConflictError();
        options2.ifMatch = snapshot.etag;
      }
      try {
        await client.put(CMS_DOCUMENT_PATH, JSON.stringify(document), options2);
      } catch (error) {
        if (isBlobConflict(error)) throw new CmsConflictError();
        throw new CmsStorageError("CMS storage is unavailable.");
      }
    },
    async uploadMedia(pathname, body) {
      try {
        await client.put(pathname, body, {
          access: "private",
          allowOverwrite: false,
          contentType: "image/webp"
        });
      } catch (error) {
        if (isBlobConflict(error)) throw new CmsConflictError();
        throw new CmsStorageError("CMS storage is unavailable.");
      }
    },
    async readMedia(pathname) {
      let result;
      try {
        result = await client.get(pathname, {
          access: "private",
          useCache: false
        });
      } catch {
        throw new CmsStorageError("CMS storage is unavailable.");
      }
      if (!result || result.statusCode === 404) return null;
      if (result.statusCode !== 200 || !result.stream) {
        throw new CmsStorageError("CMS storage is unavailable.");
      }
      return {
        body: await readStream(result.stream),
        contentType: result.blob.contentType
      };
    }
  };
}

// server/cms/routes.ts
var CMS_PREFIX = "/api/cms";
var CMS_WRITE_HEADER = "X-Solution-CMS";
function isRecord4(value) {
  return typeof value === "object" && value !== null;
}
function getCmsPath(req) {
  const requestPath = req.path || req.url.split("?")[0];
  const queryPath = req.query.path;
  if (requestPath === CMS_PREFIX || requestPath === `${CMS_PREFIX}/`) {
    if (typeof queryPath === "string") return normalizeCmsPath(queryPath);
    if (Array.isArray(queryPath)) return null;
  }
  if (requestPath === CMS_PREFIX || requestPath === `${CMS_PREFIX}/`) {
    return "";
  }
  if (!requestPath.startsWith(`${CMS_PREFIX}/`)) return null;
  return normalizeCmsPath(requestPath.slice(`${CMS_PREFIX}/`.length));
}
function normalizeCmsPath(value) {
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  decoded = decoded.replace(/^\/+|\/+$/g, "");
  if (!decoded || decoded.includes("\\") || decoded.includes("..")) {
    return null;
  }
  return decoded;
}
function getBodyRevision(body) {
  if (!isRecord4(body) || typeof body.revision !== "string") {
    throw new CmsValidationError("A content revision is required.");
  }
  if (!body.revision || body.revision.length > 200) {
    throw new CmsValidationError("The content revision is invalid.");
  }
  return body.revision;
}
function getBodyContent(body) {
  if (!isRecord4(body) || !Object.prototype.hasOwnProperty.call(body, "content")) {
    throw new CmsValidationError("Content is required.");
  }
  try {
    return validateSiteContent(body.content);
  } catch {
    throw new CmsValidationError("Content does not match the CMS schema.");
  }
}
function cloneContent2(content) {
  return JSON.parse(JSON.stringify(content));
}
function adminDocument(document) {
  return {
    draft: document.draft,
    published: document.published,
    revision: document.revision,
    updatedAt: document.updatedAt,
    publishedAt: document.publishedAt
  };
}
function assertExpectedRevision(snapshot, revision) {
  const currentRevision = snapshot.exists ? snapshot.document.revision : INITIAL_REVISION;
  if (revision !== currentRevision) throw new CmsConflictError();
}
function assertTrustedWrite(req) {
  if (req.get(CMS_WRITE_HEADER) !== "1") {
    throw new CmsHttpError(403, "CMS write protection failed.");
  }
  const origin = req.get("Origin");
  if (!origin || !isTrustedCmsOrigin(origin)) {
    throw new CmsHttpError(403, "CMS write protection failed.");
  }
}
function isTrustedCmsOrigin(origin) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search) {
    return false;
  }
  if (parsed.origin === "https://solution-wrap.com" || parsed.origin === "https://www.solution-wrap.com" || parsed.origin === "http://127.0.0.1:3000" || parsed.origin === "http://localhost:3000" || parsed.origin === "https://solution-car-wrap.vercel.app") {
    return true;
  }
  const isTrustedVercelPreview = parsed.protocol === "https:" && parsed.port === "" && /^solution-car-wrap-[a-z0-9-]+-ston0735-9216s-projects\.vercel\.app$/i.test(
    parsed.hostname
  );
  if (isTrustedVercelPreview) return true;
  return parsed.protocol === "https:" && parsed.port === "" && /^(?:[a-z0-9-]+\.)+manus\.computer$/i.test(parsed.hostname);
}
function sendError(res, error) {
  if (error instanceof CmsHttpError) {
    res.status(error.status).json({ error: error.safeMessage });
    return;
  }
  res.status(500).json({ error: "CMS request failed." });
}
async function authenticate(req, authenticateAdmin) {
  try {
    return await authenticateAdmin(req);
  } catch (error) {
    if (error instanceof CmsAuthError) throw error;
    throw new CmsAuthError(503, "Authentication service unavailable.");
  }
}
function registerCmsRoutes(app, options = {}) {
  const store = options.store ?? createCmsStore();
  const authenticateAdmin = options.authenticateAdmin ?? authenticateCmsAdmin;
  const now = options.now ?? (() => /* @__PURE__ */ new Date());
  const handle = async (req, res) => {
    const route = getCmsPath(req);
    if (route === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    try {
      if (req.method === "GET" && route === "status") {
        res.json({ configured: store.configured });
        return;
      }
      if (req.method === "GET" && route === "public") {
        if (!store.configured) {
          const initial = createInitialCmsDocument();
          res.json({ content: initial.published, revision: initial.revision });
          return;
        }
        const snapshot = await store.readSnapshot();
        res.json({
          content: snapshot.document.published,
          revision: snapshot.document.revision
        });
        return;
      }
      if (req.method === "GET" && route === "media") {
        const key = req.query.key;
        if (!isSafeMediaPath(key)) throw new CmsNotFoundError();
        if (!store.configured) throw new CmsStorageError();
        const media = await store.readMedia(key);
        if (!media) throw new CmsNotFoundError();
        if (media.contentType && media.contentType !== "image/webp") {
          throw new CmsNotFoundError();
        }
        res.setHeader("Content-Type", "image/webp");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.status(200).end(media.body);
        return;
      }
      if (req.method === "GET" && route === "admin") {
        await authenticate(req, authenticateAdmin);
        if (!store.configured) throw new CmsStorageError();
        const snapshot = await store.readSnapshot();
        res.json(adminDocument(snapshot.document));
        return;
      }
      if (route === "draft" || route === "publish" || route === "upload") {
        if (req.method !== "PUT" && req.method !== "POST") {
          res.setHeader("Allow", route === "draft" ? "PUT" : "POST");
          res.status(405).json({ error: "Method not allowed" });
          return;
        }
        assertTrustedWrite(req);
        await authenticate(req, authenticateAdmin);
        if (!store.configured) throw new CmsStorageError();
      }
      if (req.method === "PUT" && route === "draft") {
        const revision = getBodyRevision(req.body);
        const content = getBodyContent(req.body);
        const snapshot = await store.readSnapshot();
        assertExpectedRevision(snapshot, revision);
        const updatedAt = now().toISOString();
        const document = {
          ...snapshot.document,
          draft: cloneContent2(content),
          revision: crypto.randomUUID(),
          updatedAt
        };
        await store.writeSnapshot(snapshot, document);
        res.json(adminDocument(document));
        return;
      }
      if (req.method === "POST" && route === "publish") {
        const revision = getBodyRevision(req.body);
        const content = getBodyContent(req.body);
        const snapshot = await store.readSnapshot();
        assertExpectedRevision(snapshot, revision);
        const publishedAt = now().toISOString();
        const document = {
          ...snapshot.document,
          draft: cloneContent2(content),
          published: cloneContent2(content),
          revision: crypto.randomUUID(),
          updatedAt: publishedAt,
          publishedAt
        };
        await store.writeSnapshot(snapshot, document);
        res.json(adminDocument(document));
        return;
      }
      if (req.method === "POST" && route === "upload") {
        if (!isRecord4(req.body)) {
          throw new CmsValidationError("Upload body is required.");
        }
        const filename = sanitizeUploadFilename(req.body.filename);
        const webp = await sanitizeImageDataUrl(req.body.dataUrl);
        const pathname = createMediaPath();
        await store.uploadMedia(pathname, webp);
        res.json({ url: createMediaUrl(pathname), filename });
        return;
      }
      res.setHeader("Allow", "GET, PUT, POST, OPTIONS");
      res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
      sendError(res, error);
    }
  };
  app.options(`${CMS_PREFIX}`, handle);
  app.options(`${CMS_PREFIX}/*`, handle);
  app.all(`${CMS_PREFIX}`, handle);
  app.all(`${CMS_PREFIX}/*`, handle);
  return app;
}
function createCmsApp(options = {}) {
  const app = express();
  app.use(express.json({ limit: "8mb" }));
  registerCmsRoutes(app, options);
  return app;
}
export {
  createCmsApp,
  isTrustedCmsOrigin,
  registerCmsRoutes
};
