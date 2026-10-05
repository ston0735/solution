import sharp from "sharp";

export type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
  red: number;
  green: number;
  blue: number;
};

export type ColorMetricReport = {
  status: "matched" | "mismatch" | "unavailable";
  mode: "hue" | "neutral";
  reference: HsvColor;
  preview: HsvColor;
  hueDelta: number;
  saturationDelta: number;
  valueDelta: number;
  rgbDistance: number;
  message: string;
};

const degreesBetween = (first: number, second: number) => {
  const difference = Math.abs(first - second) % 360;
  return difference > 180 ? 360 - difference : difference;
};

export function rgbToHsv(red: number, green: number, blue: number): HsvColor {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return { hue, saturation: max === 0 ? 0 : delta / max, value: max, red, green, blue };
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  return totalWeight === 0 ? 0 : values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

export async function measureDominantColor(image: Buffer): Promise<HsvColor> {
  const { data, info } = await sharp(image)
    .rotate()
    .resize({ width: 160, height: 120, fit: "inside", withoutEnlargement: false })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: HsvColor[] = [];
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const color = rgbToHsv(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
    if (color.value > 0.12) pixels.push(color);
  }
  if (pixels.length === 0) throw new Error("找不到足夠的影像色彩資料。");

  const saturated = pixels.filter(color => color.saturation >= 0.2 && color.value >= 0.16);
  if (saturated.length < Math.max(32, pixels.length * 0.02)) {
    const neutral = pixels.filter(color => color.saturation < 0.32 && color.value > 0.18);
    const sample = neutral.length ? neutral : pixels;
    return rgbToHsv(
      Math.round(weightedAverage(sample.map(color => ({ value: color.red, weight: color.value })))),
      Math.round(weightedAverage(sample.map(color => ({ value: color.green, weight: color.value })))),
      Math.round(weightedAverage(sample.map(color => ({ value: color.blue, weight: color.value })))),
    );
  }

  const buckets = Array.from({ length: 36 }, () => [] as HsvColor[]);
  saturated.forEach(color => buckets[Math.floor(color.hue / 10) % 36]?.push(color));
  const dominantBucket = buckets.reduce((best, bucket) => bucket.length > best.length ? bucket : best, buckets[0] ?? []);
  const sample = dominantBucket.length ? dominantBucket : saturated;
  const sine = weightedAverage(sample.map(color => ({ value: Math.sin(color.hue * Math.PI / 180), weight: color.saturation * color.value })));
  const cosine = weightedAverage(sample.map(color => ({ value: Math.cos(color.hue * Math.PI / 180), weight: color.saturation * color.value })));
  const hue = (Math.atan2(sine, cosine) * 180 / Math.PI + 360) % 360;
  return {
    hue,
    saturation: weightedAverage(sample.map(color => ({ value: color.saturation, weight: color.value }))),
    value: weightedAverage(sample.map(color => ({ value: color.value, weight: color.saturation }))),
    red: Math.round(weightedAverage(sample.map(color => ({ value: color.red, weight: color.saturation * color.value })))),
    green: Math.round(weightedAverage(sample.map(color => ({ value: color.green, weight: color.saturation * color.value })))),
    blue: Math.round(weightedAverage(sample.map(color => ({ value: color.blue, weight: color.saturation * color.value })))),
  };
}

/** Measure changed vehicle pixels so matching background colors do not dominate hue checks. */
export async function measureVehicleChangeColor(sourceImage: Buffer, previewImage: Buffer): Promise<HsvColor> {
  const [source, preview] = await Promise.all([
    sharp(sourceImage).rotate().resize({ width: 160, height: 120, fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(previewImage).rotate().resize({ width: 160, height: 120, fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const pixels: HsvColor[] = [];
  const width = Math.min(source.info.width, preview.info.width);
  const height = Math.min(source.info.height, preview.info.height);
  const pixelCount = Math.min(source.data.length, preview.data.length) / 3;
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 3;
    const x = index % width;
    const y = Math.floor(index / width);
    const changed = Math.sqrt(
      (source.data[offset]! - preview.data[offset]!) ** 2
      + (source.data[offset + 1]! - preview.data[offset + 1]!) ** 2
      + (source.data[offset + 2]! - preview.data[offset + 2]!) ** 2,
    ) / Math.sqrt(3 * 255 ** 2);
    const color = rgbToHsv(preview.data[offset] ?? 0, preview.data[offset + 1] ?? 0, preview.data[offset + 2] ?? 0);
    const centralVehicleArea = x >= width * 0.08 && x <= width * 0.92 && y >= height * 0.18;
    if (centralVehicleArea && changed >= 0.12 && color.value > 0.12 && (color.saturation >= 0.1 || changed >= 0.22)) pixels.push(color);
  }
  if (pixels.length < 24) return measureDominantColor(previewImage);
  const saturated = pixels.filter(color => color.saturation >= 0.2 && color.value >= 0.16);
  const sample = saturated.length >= Math.max(16, pixels.length * 0.02) ? saturated : pixels;
  const sine = weightedAverage(sample.map(color => ({ value: Math.sin(color.hue * Math.PI / 180), weight: Math.max(color.saturation, 0.12) * color.value })));
  const cosine = weightedAverage(sample.map(color => ({ value: Math.cos(color.hue * Math.PI / 180), weight: Math.max(color.saturation, 0.12) * color.value })));
  return {
    hue: (Math.atan2(sine, cosine) * 180 / Math.PI + 360) % 360,
    saturation: weightedAverage(sample.map(color => ({ value: color.saturation, weight: Math.max(color.value, 0.12) }))),
    value: weightedAverage(sample.map(color => ({ value: color.value, weight: Math.max(color.saturation, 0.12) }))),
    red: Math.round(weightedAverage(sample.map(color => ({ value: color.red, weight: Math.max(color.saturation, 0.12) * color.value })))),
    green: Math.round(weightedAverage(sample.map(color => ({ value: color.green, weight: Math.max(color.saturation, 0.12) * color.value })))),
    blue: Math.round(weightedAverage(sample.map(color => ({ value: color.blue, weight: Math.max(color.saturation, 0.12) * color.value })))),
  };
}

export async function measureColorConsistency(referenceImage: Buffer, previewImage: Buffer, sourceImage?: Buffer): Promise<ColorMetricReport> {
  const [reference, preview] = await Promise.all([
    measureDominantColor(referenceImage),
    sourceImage ? measureVehicleChangeColor(sourceImage, previewImage) : measureDominantColor(previewImage),
  ]);
  const hueDelta = degreesBetween(reference.hue, preview.hue);
  const saturationDelta = Math.abs(reference.saturation - preview.saturation);
  const valueDelta = Math.abs(reference.value - preview.value);
  const rgbDistance = Math.sqrt((reference.red - preview.red) ** 2 + (reference.green - preview.green) ** 2 + (reference.blue - preview.blue) ** 2) / Math.sqrt(3 * 255 ** 2);
  const neutral = reference.saturation < 0.18;
  const matched = neutral
    ? rgbDistance <= 0.34 && valueDelta <= 0.48
    : hueDelta <= 38 && saturationDelta <= 0.5 && valueDelta <= 0.52;

  return {
    status: matched ? "matched" : "mismatch",
    mode: neutral ? "neutral" : "hue",
    reference,
    preview,
    hueDelta,
    saturationDelta,
    valueDelta,
    rgbDistance,
    message: matched
      ? `數值色相檢查通過：色相差 ${Math.round(hueDelta)}°。`
      : `數值色相偏差較大：色相差 ${Math.round(hueDelta)}°，建議重新生成。`,
  };
}
