import { createPreviewApp } from "../server/preview/handler.js";

/**
 * Vercel serverless entry for the car-wrap colour preview service.
 *
 * `vercel.json` rewrites `/api/trpc/wrapPreview.generate` and
 * `/api/trpc/wrapPreview.health` onto these paths; everything else under
 * `/api` keeps proxying to the existing Manus backend.
 */
export const maxDuration = 60;

export default createPreviewApp();
