export const WRAP_ASSET_BASE_PATH = "/assets";

export const WRAP_GITHUB_RAW_ASSET_BASE_URL =
  "https://raw.githubusercontent.com/ston0735/solution/main/solution-auto-care/client/public/assets";

export const WRAP_LOGO_ASSET_PATH = `${WRAP_ASSET_BASE_PATH}/solution-car-wrap-logo.png`;
export const WRAP_HERO_IMAGE_ASSET_PATH = `${WRAP_ASSET_BASE_PATH}/solution-hero-midnight.jpg`;
export const WRAP_HERO_VIDEO_ASSET_PATH = `${WRAP_ASSET_BASE_PATH}/solution-hero-motion.mp4`;

export function getMaterialCardAssetFilename(storageKey: string) {
  return storageKey.replace(/_[0-9a-f]{8}(?=\.jpg$)/i, "");
}

export function getMaterialCardAssetPath(storageKey: string) {
  return `${WRAP_ASSET_BASE_PATH}/color-card-references/${getMaterialCardAssetFilename(storageKey)}`;
}

export function getMaterialCardRawUrl(storageKey: string) {
  return `${WRAP_GITHUB_RAW_ASSET_BASE_URL}/color-card-references/${getMaterialCardAssetFilename(storageKey)}`;
}
