import { createPreviewApp } from "../server/preview/handler.js";

/**
 * Vercel serverless entry for the car-wrap colour preview service.
 *
 * One file at the `api/` root is what Vercel actually builds into a function,
 * so `vercel.json` addresses its operations with `?op=` exactly like the CMS
 * entry does. Everything else under `/api` keeps proxying to the Manus backend.
 */
export const maxDuration = 60;

export default createPreviewApp();
