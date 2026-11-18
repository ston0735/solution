// server/preview/handler.ts
import express from "express";
import { z } from "zod";

// shared/wrapColorReferenceKeys.ts
var WRAP_COLOR_REFERENCE_KEYS = {
  "GAS285": "GAS285_c218b5a6.jpg",
  "GBM210": "GBM210_44106d6a.jpg",
  "GCB322": "GCB322_eb1faf03.jpg",
  "GCG313": "GCG313_e765eba9.jpg",
  "GEG206": "GEG206_b75a6fb7.jpg",
  "GET260": "GET260_7b7c8520.jpg",
  "GFD275": "GFD275_71849248.jpg",
  "GKG315": "GKG315_c0af647c.jpg",
  "GLD325": "GLD325_6cb1cf51.jpg",
  "GLM262": "GLM262_95e944cc.jpg",
  "GMA283": "GMA283_8627fe1e.jpg",
  "GMB305": "GMB305_8c1ded58.jpg",
  "GMC246": "GMC246_86528709.jpg",
  "GMC263": "GMC263_cdf626af.jpg",
  "GMC267": "GMC267_386c8cb8.jpg",
  "GMD240": "GMD240_4ce67209.jpg",
  "GMD273": "GMD273_b430ab46.jpg",
  "GMD281": "GMD281_599dbfaa.jpg",
  "GMF251": "GMF251_befda5df.jpg",
  "GMG250": "GMG250_b451392c.jpg",
  "GMG264": "GMG264_97e22764.jpg",
  "GMG300": "GMG300_60c8e5e4.jpg",
  "GMG302": "GMG302_a3092b44.jpg",
  "GMI294": "GMI294_fb6962be.jpg",
  "GML286": "GML286_65ae653d.jpg",
  "GMM230": "GMM230_5d1c9be3.jpg",
  "GMM238": "GMM238_18672556.jpg",
  "GMM288": "GMM288_0e002a86.jpg",
  "GMM303": "GMM303_8764bab0.jpg",
  "GMN298": "GMN298_35106bab.jpg",
  "GMO276": "GMO276_f78ac881.jpg",
  "GMP232": "GMP232_2537a73d.jpg",
  "GMP249": "GMP249_19a5bdf6.jpg",
  "GMP299": "GMP299_e2a683fd.jpg",
  "GMQ289": "GMQ289_06b607e1.jpg",
  "GMR245": "GMR245_e7218d28.jpg",
  "GMS233": "GMS233_16fbb807.jpg",
  "GMS282": "GMS282_c2141502.jpg",
  "GMS291": "GMS291_452758c4.jpg",
  "GMT247": "GMT247_04b16c20.jpg",
  "GMT284": "GMT284_aa5be4f2.jpg",
  "GMT290": "GMT290_aaf0fc24.jpg",
  "GMU295": "GMU295_04ce05ff.jpg",
  "GMV261": "GMV261_73d2cc34.jpg",
  "GNB208": "GNB208_b85f20b5.jpg",
  "GOB306": "GOB306_06a6e27b.jpg",
  "GOG204": "GOG204_e8be1f02.jpg",
  "GOG323": "GOG323_73fbc6dc.jpg",
  "GRO318": "GRO318_f1bd3ab3.jpg",
  "GSA309": "GSA309_ed16c6f6.jpg",
  "GSB256": "GSB256_28fb5a2b.jpg",
  "GSB310": "GSB310_b0f3574d.jpg",
  "GSB321": "GSB321_0f5ece06.jpg",
  "GSG271": "GSG271_c5d5743f.jpg",
  "GSG312": "GSG312_f17df31d.jpg",
  "GSI265": "GSI265_8caa08fa.jpg",
  "GSK236": "GSK236_6fbf8b53.jpg",
  "GSL287": "GSL287_c39b6845.jpg",
  "GSM227": "GSM227_a6685b9e.jpg",
  "GSM301": "GSM301_e5caa8a4.jpg",
  "GSR252": "GSR252_53efe84b.jpg",
  "GSR266": "GSR266_674a5e90.jpg",
  "GSS307": "GSS307_ad055552.jpg",
  "GST257": "GST257_61cacf0b.jpg",
  "GST268": "GST268_eafc3032.jpg",
  "GTG197": "GTG197_8551534c.jpg",
  "GTG314": "GTG314_22556b0e.jpg",
  "GUB229": "GUB229_c1fabb60.jpg",
  "GUB231": "GUB231_eb4dbfe1.jpg",
  "GUB243": "GUB243_186a8b92.jpg",
  "GUD258": "GUD258_cce67ff4.jpg",
  "GUL239": "GUL239_a1e6e643.jpg",
  "GUL241": "GUL241_62cefa95.jpg",
  "GUL254": "GUL254_de66aac6.jpg",
  "GUM228": "GUM228_1d27bc07.jpg",
  "GUM244": "GUM244_660d5a1b.jpg",
  "GUM269": "GUM269_6fee403d.jpg",
  "GUM277": "GUM277_f0f944f3.jpg",
  "GUS234": "GUS234_b3d79315.jpg",
  "GV213": "GV213_4e166eff.jpg",
  "KA129B": "KA129B_01d0b9f4.jpg",
  "KAG117P": "KAG117P_e50b562d.jpg",
  "KAG122P": "KAG122P_56b791a4.jpg",
  "KAM130R": "KAM130R_09ab8778.jpg",
  "KBB158LR": "KBB158LR_1dbea43b.jpg",
  "KBG137BM": "KBG137BM_523c8b62.jpg",
  "KBG138BM": "KBG138BM_57384b48.jpg",
  "KBG1500B": "KBG1500B_18c70394.jpg",
  "KBK133R": "KBK133R_ebb66dff.jpg",
  "KBP149DB": "KBP149DB_0aa1a58b.jpg",
  "KBR156MN": "KBR156MN_6e4cd356.jpg",
  "KBV134R": "KBV134R_6f7f41b3.jpg",
  "KCB142MB": "KCB142MB_6acf4074.jpg",
  "KCG143MB": "KCG143MB_ec288cb7.jpg",
  "KCG145MB": "KCG145MB_66375a00.jpg",
  "KCR100T": "KCR100T_a464f816.jpg",
  "KDC135R": "KDC135R_d676690d.jpg",
  "KDE127B": "KDE127B_bb7e241c.jpg",
  "KDS136BM": "KDS136BM_5369b1a5.jpg",
  "KDS140MB": "KDS140MB_45436d89.jpg",
  "KFB109P": "KFB109P_287a5786.jpg",
  "KFG101T": "KFG101T_ca0ea53b.jpg",
  "KFL107N": "KFL107N_0c2a55fd.jpg",
  "KGB102T": "KGB102T_15002b61.jpg",
  "KGB128B": "KGB128B_7d311e8b.jpg",
  "KGG144MB": "KGG144MB_e356cfdb.jpg",
  "KGM200MB": "KGM200MB_855a327a.jpg",
  "KGN147AD": "KGN147AD_db8a1add.jpg",
  "KGS108P": "KGS108P_9e32260c.jpg",
  "KLC131R": "KLC131R_8597eb1f.jpg",
  "KLO112P": "KLO112P_be73801c.jpg",
  "KMB119P": "KMB119P_e3c21264.jpg",
  "KMB151DB": "KMB151DB_8d2590a2.jpg",
  "KMB1520B": "KMB1520B_f7d767cb.jpg",
  "KMB222LB": "KMB222LB_0ca5531b.jpg",
  "KME141MB": "KME141MB_e8d9b9df.jpg",
  "KMG114P": "KMG114P_4578f728.jpg",
  "KMG118P": "KMG118P_deb4d120.jpg",
  "KMG139MB": "KMG139MB_8c9d54ab.jpg",
  "KMK126B": "KMK126B_4a01b8bc.jpg",
  "KML225LB": "KML225LB_1560a2e2.jpg",
  "KMM120P": "KMM120P_7bfbbc92.jpg",
  "KMO123M": "KMO123M_08d3ee8b.jpg",
  "KMS224LB": "KMS224LB_5c686895.jpg",
  "KMS226LB": "KMS226LB_c889923b.jpg",
  "KOB146MB": "KOB146MB_fae92f1d.jpg",
  "KPW155MN": "KPW155MN_b5742780.jpg",
  "KRC124F": "KRC124F_94d22aa6.jpg",
  "KRI153DB": "KRI153DB_d620aab5.jpg",
  "KRS111P": "KRS111P_05645512.jpg",
  "KSB159LR": "KSB159LR_c751ccee.jpg",
  "KSC104TM": "KSC104TM_5b39eb56.jpg",
  "KSF154DB": "KSF154DB_503fbb3d.jpg",
  "KSG103T": "KSG103T_25f311af.jpg",
  "KSG116P": "KSG116P_8387e482.jpg",
  "KSG121P": "KSG121P_086b69dd.jpg",
  "KSG132R": "KSG132R_fcbf76c0.jpg",
  "KSG157MN": "KSG157MN_c81b98e4.jpg",
  "KSR106TM": "KSR106TM_7af24737.jpg",
  "KSR110P": "KSR110P_f642e314.jpg",
  "KSS105TM": "KSS105TM_809414b7.jpg",
  "KSY113P": "KSY113P_7d4ba03a.jpg",
  "KVC148DB": "KVC148DB_f4cbbf0c.jpg",
  "KVF125F": "KVF125F_e9ca8add.jpg",
  "SAG167": "SAG167_0ff7742c.jpg",
  "SBP166": "SBP166_11c30c1c.jpg",
  "SCB190": "SCB190_7031f405.jpg",
  "SCB191": "SCB191_3d9591a8.jpg",
  "SCF186": "SCF186_b6208ca0.jpg",
  "SCG198": "SCG198_2d88bf69.jpg",
  "SCP185": "SCP185_1570d066.jpg",
  "SDB194": "SDB194_200b29e8.jpg",
  "SDG193": "SDG193_27a01de7.jpg",
  "SDG196": "SDG196_51025ef0.jpg",
  "SDP184": "SDP184_5e3629ce.jpg",
  "SDP192": "SDP192_5df6fd2b.jpg",
  "SDP195": "SDP195_fa08f8b4.jpg",
  "SG178": "SG178_2c308ed1.jpg",
  "SG180": "SG180_d5a177f5.jpg",
  "SGG188": "SGG188_a12a8cdf.jpg",
  "SGM187": "SGM187_1e60937a.jpg",
  "SLEP201": "SLEP201_4579aff9.jpg",
  "SLM168": "SLM168_84e0dbab.jpg",
  "SLM169": "SLM169_4a427f77.jpg",
  "SLM170": "SLM170_4d7e9320.jpg",
  "SLM171": "SLM171_dfbb990d.jpg",
  "SLM172": "SLM172_8989169d.jpg",
  "SLM173": "SLM173_d3da3509.jpg",
  "SMM163": "SMM163_d246296f.jpg",
  "SMW165": "SMW165_1a21088c.jpg",
  "SOM199": "SOM199_796dfb6a.jpg",
  "SOWJ164": "SOWJ164_7b0987ea.jpg",
  "SPG189": "SPG189_40400b51.jpg",
  "SRG181": "SRG181_18fe6754.jpg",
  "SRO162": "SRO162_8cc16b46.jpg",
  "SSB161M": "SSB161M_7e364a1c.jpg",
  "SSB183": "SSB183_a4b139e7.jpg",
  "SSD177": "SSD177_4543b18e.jpg",
  "SSG179": "SSG179_d14976f3.jpg",
  "SSL174M": "SSL174M_bf5c6478.jpg",
  "SSL175M": "SSL175M_4c4c0e75.jpg",
  "SSO160M": "SSO160M_97a9ca84.jpg",
  "SSP182": "SSP182_8340ca36.jpg",
  "SSW176": "SSW176_6c8860db.jpg"
};

// shared/partialWrapOptions.ts
var PARTIAL_WRAP_PARTS = {
  mirrors: {
    label: "\u5169\u5074\u5F8C\u8996\u93E1",
    promptLabel: "both exterior side mirrors"
  },
  roof: {
    label: "\u8ECA\u9802",
    promptLabel: "the entire exterior roof panel only"
  },
  spoiler: {
    label: "\u5C3E\u7FFC",
    promptLabel: "the rear spoiler or rear wing only"
  },
  frontLowerBumper: {
    label: "\u524D\u4FDD\u687F\u4E0B\u7DE3",
    promptLabel: "the lower lip and lower edge of the front bumper only"
  }
};
var PARTIAL_WRAP_FINISHES = {
  blackout: {
    label: "\u9ED1\u5316",
    promptLabel: "deep neutral black automotive vinyl wrap, with no purple, blue, green, or colored cast"
  },
  carbon_fiber: {
    label: "\u78B3\u7E96\u7DAD",
    promptLabel: "realistic black carbon-fiber vinyl film with a subtle fine woven pattern, natural clear-coat sheen, and no colored tint"
  }
};
var PARTIAL_WRAP_PART_LIST = Object.entries(PARTIAL_WRAP_PARTS).map(([id, value]) => ({
  id,
  ...value
}));

// server/wrapPreview.ts
import sharp from "sharp";
var MAX_IMAGE_BYTES = 6 * 1024 * 1024;
var IMAGE_GENERATION_LONG_EDGE = 1536;
var MIN_IMAGE_GENERATION_RATIO = 1 / 3;
var MAX_IMAGE_GENERATION_RATIO = 3;
var allowedMimeTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var allowedPartialWrapPartIds = new Set(
  Object.keys(PARTIAL_WRAP_PARTS)
);
var allowedPartialWrapFinishes = new Set(
  Object.keys(PARTIAL_WRAP_FINISHES)
);
function normalizePartialWrapCustomizations(items = []) {
  if (items.length > Object.keys(PARTIAL_WRAP_PARTS).length) {
    throw new Error("\u5C40\u90E8\u5305\u819C\u9078\u9805\u6578\u91CF\u4E0D\u6B63\u78BA\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u3002");
  }
  const selectedParts = /* @__PURE__ */ new Set();
  return items.map((item) => {
    if (!allowedPartialWrapPartIds.has(item.part) || !allowedPartialWrapFinishes.has(item.finish)) {
      throw new Error("\u5C40\u90E8\u5305\u819C\u50C5\u652F\u63F4\u6307\u5B9A\u96F6\u4EF6\u7684\u9ED1\u5316\u6216\u78B3\u7E96\u7DAD\u6548\u679C\u3002");
    }
    if (selectedParts.has(item.part)) {
      throw new Error("\u540C\u4E00\u500B\u5C40\u90E8\u96F6\u4EF6\u4E0D\u80FD\u91CD\u8907\u9078\u64C7\uFF0C\u8ACB\u91CD\u65B0\u8A2D\u5B9A\u3002");
    }
    selectedParts.add(item.part);
    return item;
  });
}
function normalizePantoneId(value) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}
function assertPantoneId(value) {
  const pantoneId = normalizePantoneId(value);
  if (pantoneId.length < 2 || pantoneId.length > 48 || !/^[A-Z0-9# .+-]+$/.test(pantoneId)) {
    throw new Error("\u8ACB\u9078\u64C7\u6216\u8F38\u5165\u6709\u6548\u7684\u578B\u9304\u8272\u865F\u6216 Pantone \u8272\u865F\u3002");
  }
  return pantoneId;
}
function decodeVehicleImage(base64Image) {
  const normalized = base64Image.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const buffer = Buffer.from(normalized, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("\u8ACB\u4E0A\u50B3\u5C0F\u65BC 6MB \u7684 JPG\u3001PNG \u6216 WEBP \u8ECA\u8F1B\u7167\u7247\u3002");
  }
  const mimeType = detectImageMimeType(buffer);
  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    throw new Error("\u6A94\u6848\u683C\u5F0F\u4E0D\u652F\u63F4\uFF0C\u8ACB\u4E0A\u50B3 JPG\u3001PNG \u6216 WEBP \u8ECA\u8F1B\u7167\u7247\u3002");
  }
  return { buffer, mimeType };
}
async function getVehicleImageDimensions(buffer) {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("\u7121\u6CD5\u8FA8\u8B58\u4E0A\u50B3\u8ECA\u7167\u7684\u5F71\u50CF\u5C3A\u5BF8\uFF0C\u8ACB\u91CD\u65B0\u4E0A\u50B3\u7167\u7247\u3002");
  }
  const rotatesToPortrait = [5, 6, 7, 8].includes(metadata.orientation ?? 0);
  return {
    width: rotatesToPortrait ? metadata.height : metadata.width,
    height: rotatesToPortrait ? metadata.width : metadata.height
  };
}
function roundToSixteen(value) {
  return Math.max(16, Math.round(value / 16) * 16);
}
function dimensionsForAspectRatio(aspectRatio) {
  if (aspectRatio >= 1) {
    return {
      width: IMAGE_GENERATION_LONG_EDGE,
      height: roundToSixteen(IMAGE_GENERATION_LONG_EDGE / aspectRatio)
    };
  }
  return {
    width: roundToSixteen(IMAGE_GENERATION_LONG_EDGE * aspectRatio),
    height: IMAGE_GENERATION_LONG_EDGE
  };
}
function getImageGenerationDimensions(source) {
  const sourceAspectRatio = source.width / source.height;
  const apiAspectRatio = Math.min(
    MAX_IMAGE_GENERATION_RATIO,
    Math.max(MIN_IMAGE_GENERATION_RATIO, sourceAspectRatio)
  );
  return dimensionsForAspectRatio(apiAspectRatio);
}
function getImageOutputDimensions(source) {
  return dimensionsForAspectRatio(source.width / source.height);
}
function getImageAspectRatioLabel(source) {
  const greatestCommonDivisor = (a, b) => b === 0 ? a : greatestCommonDivisor(b, a % b);
  const divisor = greatestCommonDivisor(source.width, source.height);
  return `${source.width / divisor}:${source.height / divisor}`;
}
function getImageGenerationSize(source) {
  const dimensions = getImageGenerationDimensions(source);
  return `${dimensions.width}x${dimensions.height}`;
}
function detectImageMimeType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP")
    return "image/webp";
  return void 0;
}
function getWrapPreviewErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = rawMessage.toLowerCase();
  if (normalizedMessage.includes("openai_key_missing")) {
    return "AI \u5716\u7247\u670D\u52D9\u5C1A\u672A\u5B8C\u6210\u4F3A\u670D\u5668\u7AEF\u8A2D\u5B9A\uFF0C\u8ACB\u901A\u77E5\u7DB2\u7AD9\u7BA1\u7406\u54E1\u3002";
  }
  if (normalizedMessage.includes("openai_auth")) {
    return "AI \u5716\u7247\u670D\u52D9\u9A57\u8B49\u5931\u6557\uFF0C\u8ACB\u901A\u77E5\u7DB2\u7AD9\u7BA1\u7406\u54E1\u6AA2\u67E5\u4F3A\u670D\u5668\u7AEF\u8A2D\u5B9A\u3002";
  }
  if (normalizedMessage.includes("openai_quota") || normalizedMessage.includes("insufficient_quota")) {
    return "AI \u5716\u7247\u751F\u6210\u670D\u52D9\u7684\u53EF\u7528\u984D\u5EA6\u4E0D\u8DB3\uFF0C\u66AB\u6642\u7121\u6CD5\u751F\u6210\u9810\u89BD\uFF1B\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.includes("openai_rate_limit")) {
    return "AI \u5716\u7247\u751F\u6210\u670D\u52D9\u76EE\u524D\u8F03\u5FD9\u788C\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.includes("openai_moderation")) {
    return "\u9019\u6B21\u9810\u89BD\u8ACB\u6C42\u672A\u80FD\u901A\u904E\u5716\u7247\u670D\u52D9\u7684\u5B89\u5168\u5BE9\u6838\uFF0C\u8ACB\u66F4\u63DB\u8ECA\u7167\u6216\u8ABF\u6574\u9700\u6C42\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.includes("openai_invalid_image_input")) {
    return "\u4E0A\u50B3\u7684\u8ECA\u7167\u6216\u8272\u5361\u53C3\u8003\u7121\u6CD5\u7531 AI \u5716\u7247\u670D\u52D9\u8B80\u53D6\uFF0C\u8ACB\u66F4\u63DB\u5716\u7247\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.includes("preview_daily_limit")) {
    return "\u70BA\u7DAD\u6301\u9810\u89BD\u670D\u52D9\u54C1\u8CEA\uFF0C\u540C\u4E00\u7DB2\u8DEF\u4F4D\u5740\u6BCF\u5929\u6700\u591A\u53EF\u5EFA\u7ACB 2 \u5F35\u65B0\u9810\u89BD\u5716\uFF1B\u8ACB\u65BC\u660E\u65E5\u518D\u8A66\uFF0C\u6216\u76F4\u63A5\u806F\u7D61 Solution \u9810\u7D04\u8AEE\u8A62\u3002";
  }
  if (normalizedMessage.includes("preview_concurrent_limit")) {
    return "\u6B64\u7DB2\u8DEF\u4F4D\u5740\u5DF2\u6709\u4E00\u7B46\u9810\u89BD\u6B63\u5728\u751F\u6210\u4E2D\uFF0C\u8ACB\u7B49\u5F85\u76EE\u524D\u6D41\u7A0B\u5B8C\u6210\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.includes("preview_limiter_unavailable")) {
    return "\u9810\u89BD\u670D\u52D9\u7684\u7528\u91CF\u4FDD\u8B77\u66AB\u6642\u7121\u6CD5\u78BA\u8A8D\uFF0C\u70BA\u907F\u514D\u7522\u751F\u672A\u53D7\u63A7\u8CBB\u7528\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.startsWith("openai_")) {
    return "\u76EE\u524D\u7121\u6CD5\u751F\u6210\u5305\u819C\u9810\u89BD\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.includes("usage exhausted") || normalizedMessage.includes("usage_exhausted")) {
    return "AI \u5716\u7247\u751F\u6210\u670D\u52D9\u76EE\u524D\u7684\u53EF\u7528\u984D\u5EA6\u5DF2\u7528\u76E1\uFF0C\u66AB\u6642\u7121\u6CD5\u751F\u6210\u9810\u89BD\uFF1B\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
  }
  if (normalizedMessage.includes("429") || normalizedMessage.includes("rate limit") || normalizedMessage.includes("too many requests")) {
    return "AI \u5716\u7247\u751F\u6210\u670D\u52D9\u76EE\u524D\u8F03\u5FD9\u788C\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
  }
  return error instanceof Error && error.message ? error.message : "\u76EE\u524D\u7121\u6CD5\u751F\u6210\u5305\u819C\u9810\u89BD\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
}
function normalizeCatalogColorContext(catalogColor) {
  if (!catalogColor) return void 0;
  const swatch = catalogColor.swatch.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(swatch)) {
    throw new Error("\u578B\u9304\u8272\u5361\u7684\u8272\u6A23\u8CC7\u6599\u683C\u5F0F\u4E0D\u6B63\u78BA\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u8272\u865F\u3002");
  }
  const category = catalogColor.category.trim();
  const categoryEn = catalogColor.categoryEn.trim();
  const code = catalogColor.code.trim().toUpperCase();
  if (!category || !categoryEn || !code) {
    throw new Error("\u578B\u9304\u8272\u5361\u8CC7\u6599\u4E0D\u5B8C\u6574\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u8272\u865F\u3002");
  }
  return {
    code,
    category,
    categoryEn,
    name: catalogColor.name.trim(),
    nameZh: catalogColor.nameZh.trim(),
    swatch
  };
}
function getCatalogColorReferenceKey(pantoneId, catalogColor) {
  const normalized = normalizeCatalogColorContext(catalogColor);
  if (!normalized) return void 0;
  if (normalized.code !== pantoneId) {
    throw new Error("\u6240\u9078\u578B\u9304\u8272\u865F\u8207\u8272\u5361\u53C3\u8003\u4E0D\u4E00\u81F4\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u8272\u865F\u3002");
  }
  const referenceKey = WRAP_COLOR_REFERENCE_KEYS[normalized.code];
  if (!referenceKey) {
    throw new Error("\u627E\u4E0D\u5230\u6B64\u578B\u9304\u8272\u865F\u7684\u5BE6\u9AD4\u8272\u5361\u53C3\u8003\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u8272\u865F\u3002");
  }
  return referenceKey;
}
function getCatalogColorDirection(catalogColor) {
  const normalized = normalizeCatalogColorContext(catalogColor);
  if (!normalized) {
    return "Use the intended color reference supplied by the customer. Do not infer a different color from reflections or the original paint.";
  }
  const red = Number.parseInt(normalized.swatch.slice(1, 3), 16);
  const green = Number.parseInt(normalized.swatch.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.swatch.slice(5, 7), 16);
  const name = normalized.nameZh || normalized.name || "no formal name provided";
  const isGreenFamily = normalized.categoryEn.toLowerCase() === "green";
  const antiDrift = isGreenFamily ? "This is a green-family target. Keep a green to teal-green dominant hue matching the supplied swatch. It must not become purple, violet, magenta, fuchsia, lavender, burgundy, or red under any lighting." : `Keep the result within the ${normalized.categoryEn.toLowerCase()} color family; do not substitute an unrelated hue because of reflections or stylization.`;
  return `CATALOG COLOR IS THE AUTHORITATIVE COLOR REFERENCE: code ${normalized.code}; family ${normalized.category} (${normalized.categoryEn}); name ${name}; target swatch ${normalized.swatch} (RGB ${red}, ${green}, ${blue}). Match this hue and saturation across the painted body panels, allowing only physically realistic highlight and shadow variation. ${antiDrift}`;
}
function buildWrapPreviewPrompt(pantoneId, catalogColor, hasMaterialReference = false, partialWrapCustomizations = [], aspectRatio) {
  const catalogColorDirection = getCatalogColorDirection(catalogColor);
  const partialWrapDirection = normalizePartialWrapCustomizations(
    partialWrapCustomizations
  );
  const partialWrapInstructions = partialWrapDirection.length ? `ADDITIONAL PARTIAL WRAP REQUESTS: ${partialWrapDirection.map((item, index) => `${index + 1}. Apply ${PARTIAL_WRAP_FINISHES[item.finish].promptLabel} to ${PARTIAL_WRAP_PARTS[item.part].promptLabel}.`).join(" ")} Only alter these explicitly selected components if they are visible in the source image. Preserve their original shape, panel gaps, badges, lights, and all adjacent surfaces. Do not apply black or carbon fiber to any unselected part.` : "No partial-wrap accents have been selected. Keep mirrors, roof, spoiler, and lower bumper details in their original finish.";
  const materialReferenceDirection = hasMaterialReference ? "The first supplied image is the customer vehicle. The second supplied image is the actual physical KSG material card for the selected code. Use the second image only as the authoritative visual color and finish reference: transfer its hue, saturation, lightness, metallic or pearl character, and fine surface texture to the vehicle body panels. Do not copy the card shape, labels, logo, text, holes, or background. Never substitute a merely plausible color." : "The supplied image is the customer vehicle photograph.";
  const aspectRatioDirection = aspectRatio ? `The final output must use the same ${aspectRatio} aspect ratio as the supplied vehicle photograph. Preserve the complete vehicle composition within that frame; do not force it into a square or a default 3:2 crop.` : "Preserve the supplied vehicle photograph's original composition and aspect ratio.";
  return `Edit the supplied customer vehicle photograph into a photorealistic premium automotive vinyl-wrap concept preview. ${materialReferenceDirection} ${aspectRatioDirection} Preserve the exact vehicle make, model, body shape, wheels, tires, glass, lights, badges, trim, camera angle, crop, location, background, people, reflections, and lighting. Change only the exterior painted body panels to a uniform professionally installed full vehicle wrap using the intended KSG catalog color code or PANTONE color reference ${pantoneId}. ${catalogColorDirection} ${partialWrapInstructions} The finish should look like high-quality wrap film with realistic panel reflections, clean edges, consistent coverage, and natural material depth. Do not recolor windows, lights, wheels, tires, chrome, black plastic trim, road, or background except for the explicitly selected partial-wrap elements. Do not add or remove objects. OUTPUT ONLY THE CLEAN EDITED PHOTOGRAPH: never render words, numbers, color codes, labels, captions, UI, comparison panels, badges, stickers, watermarks, signatures, logos, sample cards, borders, or graphic overlays inside the image. Do not alter the license plate text or invent plate characters. This is a color concept preview, not a production color specification.`;
}

// server/colorMetrics.ts
import sharp2 from "sharp";
var degreesBetween = (first, second) => {
  const difference = Math.abs(first - second) % 360;
  return difference > 180 ? 360 - difference : difference;
};
function rgbToHsv(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * ((g - b) / delta % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return { hue, saturation: max === 0 ? 0 : delta / max, value: max, red, green, blue };
}
function weightedAverage(values) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  return totalWeight === 0 ? 0 : values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}
async function measureDominantColor(image) {
  const { data, info } = await sharp2(image).rotate().resize({ width: 160, height: 120, fit: "inside", withoutEnlargement: false }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = [];
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const color = rgbToHsv(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
    if (color.value > 0.12) pixels.push(color);
  }
  if (pixels.length === 0) throw new Error("\u627E\u4E0D\u5230\u8DB3\u5920\u7684\u5F71\u50CF\u8272\u5F69\u8CC7\u6599\u3002");
  const saturated = pixels.filter((color) => color.saturation >= 0.2 && color.value >= 0.16);
  if (saturated.length < Math.max(32, pixels.length * 0.02)) {
    const neutral = pixels.filter((color) => color.saturation < 0.32 && color.value > 0.18);
    const sample2 = neutral.length ? neutral : pixels;
    return rgbToHsv(
      Math.round(weightedAverage(sample2.map((color) => ({ value: color.red, weight: color.value })))),
      Math.round(weightedAverage(sample2.map((color) => ({ value: color.green, weight: color.value })))),
      Math.round(weightedAverage(sample2.map((color) => ({ value: color.blue, weight: color.value }))))
    );
  }
  const buckets = Array.from({ length: 36 }, () => []);
  saturated.forEach((color) => buckets[Math.floor(color.hue / 10) % 36]?.push(color));
  const dominantBucket = buckets.reduce((best, bucket) => bucket.length > best.length ? bucket : best, buckets[0] ?? []);
  const sample = dominantBucket.length ? dominantBucket : saturated;
  const sine = weightedAverage(sample.map((color) => ({ value: Math.sin(color.hue * Math.PI / 180), weight: color.saturation * color.value })));
  const cosine = weightedAverage(sample.map((color) => ({ value: Math.cos(color.hue * Math.PI / 180), weight: color.saturation * color.value })));
  const hue = (Math.atan2(sine, cosine) * 180 / Math.PI + 360) % 360;
  return {
    hue,
    saturation: weightedAverage(sample.map((color) => ({ value: color.saturation, weight: color.value }))),
    value: weightedAverage(sample.map((color) => ({ value: color.value, weight: color.saturation }))),
    red: Math.round(weightedAverage(sample.map((color) => ({ value: color.red, weight: color.saturation * color.value })))),
    green: Math.round(weightedAverage(sample.map((color) => ({ value: color.green, weight: color.saturation * color.value })))),
    blue: Math.round(weightedAverage(sample.map((color) => ({ value: color.blue, weight: color.saturation * color.value }))))
  };
}
async function measureVehicleChangeColor(sourceImage, previewImage) {
  const [source, preview] = await Promise.all([
    sharp2(sourceImage).rotate().resize({ width: 160, height: 120, fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp2(previewImage).rotate().resize({ width: 160, height: 120, fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);
  const pixels = [];
  const width = Math.min(source.info.width, preview.info.width);
  const height = Math.min(source.info.height, preview.info.height);
  const pixelCount = Math.min(source.data.length, preview.data.length) / 3;
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 3;
    const x = index % width;
    const y = Math.floor(index / width);
    const changed = Math.sqrt(
      (source.data[offset] - preview.data[offset]) ** 2 + (source.data[offset + 1] - preview.data[offset + 1]) ** 2 + (source.data[offset + 2] - preview.data[offset + 2]) ** 2
    ) / Math.sqrt(3 * 255 ** 2);
    const color = rgbToHsv(preview.data[offset] ?? 0, preview.data[offset + 1] ?? 0, preview.data[offset + 2] ?? 0);
    const centralVehicleArea = x >= width * 0.08 && x <= width * 0.92 && y >= height * 0.18;
    if (centralVehicleArea && changed >= 0.12 && color.value > 0.12 && (color.saturation >= 0.1 || changed >= 0.22)) pixels.push(color);
  }
  if (pixels.length < 24) return measureDominantColor(previewImage);
  const saturated = pixels.filter((color) => color.saturation >= 0.2 && color.value >= 0.16);
  const sample = saturated.length >= Math.max(16, pixels.length * 0.02) ? saturated : pixels;
  const sine = weightedAverage(sample.map((color) => ({ value: Math.sin(color.hue * Math.PI / 180), weight: Math.max(color.saturation, 0.12) * color.value })));
  const cosine = weightedAverage(sample.map((color) => ({ value: Math.cos(color.hue * Math.PI / 180), weight: Math.max(color.saturation, 0.12) * color.value })));
  return {
    hue: (Math.atan2(sine, cosine) * 180 / Math.PI + 360) % 360,
    saturation: weightedAverage(sample.map((color) => ({ value: color.saturation, weight: Math.max(color.value, 0.12) }))),
    value: weightedAverage(sample.map((color) => ({ value: color.value, weight: Math.max(color.saturation, 0.12) }))),
    red: Math.round(weightedAverage(sample.map((color) => ({ value: color.red, weight: Math.max(color.saturation, 0.12) * color.value })))),
    green: Math.round(weightedAverage(sample.map((color) => ({ value: color.green, weight: Math.max(color.saturation, 0.12) * color.value })))),
    blue: Math.round(weightedAverage(sample.map((color) => ({ value: color.blue, weight: Math.max(color.saturation, 0.12) * color.value }))))
  };
}
async function measureColorConsistency(referenceImage, previewImage, sourceImage) {
  const [reference, preview] = await Promise.all([
    measureDominantColor(referenceImage),
    sourceImage ? measureVehicleChangeColor(sourceImage, previewImage) : measureDominantColor(previewImage)
  ]);
  const hueDelta = degreesBetween(reference.hue, preview.hue);
  const saturationDelta = Math.abs(reference.saturation - preview.saturation);
  const valueDelta = Math.abs(reference.value - preview.value);
  const rgbDistance = Math.sqrt((reference.red - preview.red) ** 2 + (reference.green - preview.green) ** 2 + (reference.blue - preview.blue) ** 2) / Math.sqrt(3 * 255 ** 2);
  const neutral = reference.saturation < 0.18;
  const matched = neutral ? rgbDistance <= 0.34 && valueDelta <= 0.48 : hueDelta <= 38 && saturationDelta <= 0.5 && valueDelta <= 0.52;
  return {
    status: matched ? "matched" : "mismatch",
    mode: neutral ? "neutral" : "hue",
    reference,
    preview,
    hueDelta,
    saturationDelta,
    valueDelta,
    rgbDistance,
    message: matched ? `\u6578\u503C\u8272\u76F8\u6AA2\u67E5\u901A\u904E\uFF1A\u8272\u76F8\u5DEE ${Math.round(hueDelta)}\xB0\u3002` : `\u6578\u503C\u8272\u76F8\u504F\u5DEE\u8F03\u5927\uFF1A\u8272\u76F8\u5DEE ${Math.round(hueDelta)}\xB0\uFF0C\u5EFA\u8B70\u91CD\u65B0\u751F\u6210\u3002`
  };
}

// server/memberEntitlements.ts
var MEMBER_AUTH_BRIDGE_ORIGIN = "https://solutionauth-zcgxwa4c.manus.space";
var BRIDGE_SESSION_COOKIE = "webdev_app_session";
var UNLIMITED_MEMBER_EMAILS = /* @__PURE__ */ new Set(["jim700510@gmail.com"]);
function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}
function isUnlimitedMemberEmail(email) {
  return UNLIMITED_MEMBER_EMAILS.has(normalizeEmail(email));
}
function readCookie(request, name) {
  const cookieHeader = request.headers.cookie ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}
function readBridgeIdentity(payload) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload;
  const data = root.result?.data;
  if (!data || typeof data !== "object") return null;
  if ("json" in data) return data.json ?? null;
  return data;
}
async function hasUnlimitedMemberAccess(request) {
  const session = readCookie(request, BRIDGE_SESSION_COOKIE);
  if (!session) return false;
  try {
    const response = await fetch(
      `${MEMBER_AUTH_BRIDGE_ORIGIN}/api/trpc/auth.me`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: `${BRIDGE_SESSION_COOKIE}=${encodeURIComponent(session)}`
        },
        signal: AbortSignal.timeout(2500)
      }
    );
    if (!response.ok) return false;
    const payload = await response.json();
    const identity = readBridgeIdentity(payload);
    if (!identity || typeof identity !== "object") return false;
    const email = identity.email;
    return typeof email === "string" && isUnlimitedMemberEmail(email);
  } catch {
    return false;
  }
}

// shared/wrapAssetPaths.ts
var WRAP_ASSET_BASE_PATH = "/assets";
var WRAP_GITHUB_RAW_ASSET_BASE_URL = "https://raw.githubusercontent.com/ston0735/solution/main/solution-auto-care/client/public/assets";
var WRAP_LOGO_ASSET_PATH = `${WRAP_ASSET_BASE_PATH}/solution-car-wrap-logo.png`;
function getMaterialCardAssetFilename(storageKey) {
  return storageKey.replace(/_[0-9a-f]{8}(?=\.jpg$)/i, "");
}
function getMaterialCardAssetPath(storageKey) {
  return `${WRAP_ASSET_BASE_PATH}/color-card-references/${getMaterialCardAssetFilename(storageKey)}`;
}
function getMaterialCardRawUrl(storageKey) {
  return `${WRAP_GITHUB_RAW_ASSET_BASE_URL}/color-card-references/${getMaterialCardAssetFilename(storageKey)}`;
}

// server/preview/env.ts
function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
var PREVIEW_ENV = {
  /** Only ever read server-side; never shipped to the browser bundle. */
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  imageModel: process.env.WRAP_PREVIEW_IMAGE_MODEL ?? "gpt-image-2",
  dailyGenerationsPerIp: readPositiveInteger(
    process.env.WRAP_PREVIEW_DAILY_LIMIT,
    2
  ),
  concurrentGenerationsPerIp: readPositiveInteger(
    process.env.WRAP_PREVIEW_CONCURRENT_LIMIT,
    1
  ),
  rateLimitBypassIps: process.env.WRAP_PREVIEW_RATE_LIMIT_BYPASS_IPS ?? "",
  /** Member auth bridge used to resolve an HttpOnly session server-to-server. */
  memberBridgeOrigin: process.env.WRAP_PREVIEW_MEMBER_BRIDGE_ORIGIN ?? "https://solutionauth-zcgxwa4c.manus.space",
  /** Legacy storage origin kept as the fallback source of material cards. */
  materialCardFallbackOrigin: process.env.WRAP_PREVIEW_MATERIAL_FALLBACK_ORIGIN ?? "https://solauto1care-rmvw9wqm.manus.space"
};
var PREVIEW_BLOB_PREFIX = "wrap-preview";

// server/preview/imageGeneration.ts
import sharp3 from "sharp";

// server/preview/blobStore.ts
import { del, head, list, put } from "@vercel/blob";
var BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
function getBlobToken() {
  return process.env.WRAP_PREVIEW_BLOB_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN ?? "";
}
function isStoredBlobUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(BLOB_HOST_SUFFIX) && url.pathname.startsWith("/generated/");
  } catch {
    return false;
  }
}
function requireToken() {
  const token = getBlobToken();
  if (!token) throw new Error("PREVIEW_LIMITER_UNAVAILABLE");
  return token;
}
function toMarker(entry) {
  if (!entry || typeof entry !== "object") return void 0;
  const blob = entry;
  if (typeof blob.url !== "string" || typeof blob.pathname !== "string") {
    return void 0;
  }
  return {
    url: blob.url,
    pathname: blob.pathname,
    uploadedAt: blob.uploadedAt instanceof Date ? blob.uploadedAt.toISOString() : typeof blob.uploadedAt === "string" ? blob.uploadedAt : ""
  };
}
async function putBlobFile(pathname, body, contentType) {
  const token = requireToken();
  const blob = await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    contentType,
    token
  });
  return blob.url;
}
async function listByPrefix(prefix, limit = 100) {
  const token = requireToken();
  const markers = [];
  let cursor;
  do {
    const result = await list({ prefix, limit, cursor, token });
    for (const entry of result.blobs ?? []) {
      const marker = toMarker(entry);
      if (marker) markers.push(marker);
    }
    cursor = result.hasMore && result.cursor ? result.cursor : void 0;
  } while (cursor && markers.length < 1e3);
  return markers;
}
async function readBlobResponse(url) {
  const token = getBlobToken();
  const attempts = [
    { cache: "no-store", headers: { Authorization: `Bearer ${token}` } },
    { cache: "no-store" }
  ];
  let lastStatus = 0;
  for (const init of attempts) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(2e4)
      });
      if (response.ok) {
        return { status: response.status, body: await response.arrayBuffer() };
      }
      lastStatus = response.status;
    } catch {
    }
  }
  return { status: lastStatus || 502, body: new ArrayBuffer(0) };
}
async function readBlobBuffer(url) {
  const result = await readBlobResponse(url);
  if (!result.body.byteLength) {
    throw new Error("PREVIEW_STORAGE_READ_FAILED");
  }
  return Buffer.from(result.body);
}
async function readBlobWithStatus(url) {
  const token = getBlobToken();
  const bearer = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(2e4)
  }).catch(() => null);
  if (bearer && bearer.ok) {
    const body = await bearer.arrayBuffer();
    return {
      status: bearer.status,
      byteLength: body.byteLength,
      contentType: bearer.headers.get("content-type") ?? ""
    };
  }
  const plain = await fetch(url, {
    signal: AbortSignal.timeout(2e4)
  }).catch(() => null);
  return {
    status: (bearer?.status ?? 0) || (plain?.status ?? 502),
    byteLength: plain && plain.ok ? (await plain.arrayBuffer()).byteLength : 0,
    contentType: plain?.headers.get("content-type") ?? ""
  };
}
async function readLatestJson(prefix) {
  const markers = await listByPrefix(prefix, 100);
  if (!markers.length) return void 0;
  markers.sort((a, b) => a.uploadedAt < b.uploadedAt ? 1 : -1);
  const latest = markers[0];
  if (!latest) return void 0;
  try {
    const result = await readBlobResponse(latest.url);
    if (!result.body.byteLength) return void 0;
    return JSON.parse(new TextDecoder().decode(result.body));
  } catch {
    return void 0;
  }
}
async function deleteByUrl(url) {
  try {
    await del(url, { token: getBlobToken() });
  } catch {
  }
}

// server/preview/imageGeneration.ts
var OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";
var DEFAULT_IMAGE_QUALITY = "medium";
var OPENAI_TIMEOUT_MS = 55e3;
function normalizedMimeType(mimeType) {
  if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp") {
    return mimeType;
  }
  return "image/png";
}
function extensionForMimeType(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}
async function inputImageToBlob(image) {
  const mimeType = normalizedMimeType(image.mimeType);
  if (image.b64Json) {
    const buffer = Buffer.from(
      image.b64Json.replace(/^data:[^;]+;base64,/, ""),
      "base64"
    );
    if (!buffer.length) throw new Error("OPENAI_INVALID_IMAGE_INPUT");
    return new Blob([new Uint8Array(buffer)], { type: mimeType });
  }
  if (image.url) {
    const response = await fetch(image.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(2e4)
    });
    if (!response.ok) throw new Error("OPENAI_INVALID_IMAGE_INPUT");
    const fetchedType = normalizedMimeType(
      response.headers.get("content-type")?.split(";")[0]
    );
    return new Blob([await response.arrayBuffer()], { type: fetchedType });
  }
  throw new Error("OPENAI_INVALID_IMAGE_INPUT");
}
async function toSafeOpenAIError(response) {
  let code = "";
  let type = "";
  try {
    const body = await response.json();
    code = String(body.error?.code ?? "").toLowerCase();
    type = String(body.error?.type ?? "").toLowerCase();
  } catch {
  }
  const descriptor = `${code} ${type}`;
  if (response.status === 401 || response.status === 403 || descriptor.includes("invalid_api_key")) {
    return new Error("OPENAI_AUTH");
  }
  if (response.status === 402 || descriptor.includes("insufficient_quota") || descriptor.includes("billing_hard_limit") || descriptor.includes("quota_exceeded")) {
    return new Error("OPENAI_QUOTA");
  }
  if (response.status === 429 || descriptor.includes("rate_limit")) {
    return new Error("OPENAI_RATE_LIMIT");
  }
  if (descriptor.includes("moderation") || descriptor.includes("content_policy")) {
    return new Error("OPENAI_MODERATION");
  }
  return new Error("OPENAI_IMAGE_REQUEST_FAILED");
}
async function generatePreviewImage(options) {
  if (!PREVIEW_ENV.openAiApiKey) throw new Error("OPENAI_KEY_MISSING");
  const sourceImages = options.originalImages ?? [];
  if (!sourceImages.length || sourceImages.length > 16) {
    throw new Error("OPENAI_INVALID_IMAGE_INPUT");
  }
  const form = new FormData();
  form.set("model", PREVIEW_ENV.imageModel);
  form.set("prompt", options.prompt);
  form.set("quality", options.quality || DEFAULT_IMAGE_QUALITY);
  if (options.size) form.set("size", options.size);
  form.set("background", "opaque");
  form.set("output_format", "png");
  for (let index = 0; index < sourceImages.length; index += 1) {
    const image = sourceImages[index];
    if (!image) continue;
    const blob = await inputImageToBlob(image);
    form.append(
      "image[]",
      blob,
      `reference-${index + 1}.${extensionForMimeType(blob.type)}`
    );
  }
  const response = await fetch(OPENAI_IMAGE_EDITS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PREVIEW_ENV.openAiApiKey}`
    },
    body: form,
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS)
  });
  if (!response.ok) throw await toSafeOpenAIError(response);
  const result = await response.json();
  const b64Json = result.data?.[0]?.b64_json;
  if (!b64Json) throw new Error("OPENAI_INVALID_RESPONSE");
  const outputMimeType = result.output_format === "jpeg" ? "image/jpeg" : result.output_format === "webp" ? "image/webp" : "image/png";
  let generated = Buffer.from(b64Json, "base64");
  if (options.outputDimensions) {
    generated = await sharp3(generated).resize({
      width: options.outputDimensions.width,
      height: options.outputDimensions.height,
      fit: "cover",
      position: "centre"
    }).png().toBuffer();
  }
  const key = `generated/vercel-wrap-preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionForMimeType(outputMimeType)}`;
  const url = await putBlobFile(key, generated, outputMimeType);
  return { url, buffer: generated };
}

// server/preview/limits.ts
import { createHash } from "node:crypto";
var LEASE_STALENESS_MS = 12e4;
function getClientIp(headers) {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(",")[0]?.trim() || "unknown";
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  return "unknown";
}
function hashClientIp(ip) {
  return createHash("sha256").update(`${ip}|wrap-preview-vercel`).digest("hex").slice(0, 32);
}
function getRateLimitBypassIps() {
  return (process.env.WRAP_PREVIEW_RATE_LIMIT_BYPASS_IPS ?? "").split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0 && entry.toLowerCase() !== "unknown");
}
function isRateLimitBypassed(ip) {
  if (!ip || ip === "unknown") return false;
  return getRateLimitBypassIps().some((entry) => entry === ip);
}
function createPreviewCacheKey(ipHash, input) {
  const digest = createHash("sha256").update(
    JSON.stringify({
      ipHash,
      pantoneId: input.pantoneId ?? "",
      catalogColor: input.catalogColor ?? null,
      partialWrapCustomizations: input.partialWrapCustomizations ?? [],
      image: String(input.imageBase64 ?? "").length,
      imageFingerprint: createHash("sha256").update(String(input.imageBase64 ?? "").slice(0, 4096)).digest("hex").slice(0, 16)
    })
  ).digest("hex").slice(0, 40);
  return `${PREVIEW_BLOB_PREFIX}/cache/${digest}`;
}
async function getCachedPreview(cacheKey) {
  try {
    return await readLatestJson(cacheKey);
  } catch {
    return void 0;
  }
}
async function saveCachedPreview(cacheKey, payload) {
  try {
    await putBlobFile(
      `${cacheKey}.json`,
      JSON.stringify(payload),
      "application/json"
    );
  } catch (error) {
    console.error("[WrapPreview] cache write failed", error);
  }
}
function todayKey() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
async function putMarker(prefix) {
  return putBlobFile(
    `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
    JSON.stringify({ at: (/* @__PURE__ */ new Date()).toISOString() }),
    "application/json"
  );
}
async function claimGeneration(ipHash, options) {
  const leasePrefix = `${PREVIEW_BLOB_PREFIX}/lease/${ipHash}/`;
  const leases = await listByPrefix(leasePrefix, 20).catch(() => []);
  const freshCutoff = Date.now() - LEASE_STALENESS_MS;
  const active = leases.filter((marker) => {
    const uploadedAt = Date.parse(marker.uploadedAt);
    return Number.isFinite(uploadedAt) && uploadedAt > freshCutoff;
  });
  if (active.length >= PREVIEW_ENV.concurrentGenerationsPerIp) {
    throw new Error("PREVIEW_CONCURRENT_LIMIT");
  }
  let usageUrl;
  if (!options.skipDailyLimit) {
    const usagePrefix = `${PREVIEW_BLOB_PREFIX}/usage/${ipHash}/${todayKey()}/`;
    const usage = await listByPrefix(usagePrefix, 50).catch(() => []);
    if (usage.length >= PREVIEW_ENV.dailyGenerationsPerIp) {
      throw new Error("PREVIEW_DAILY_LIMIT");
    }
    usageUrl = await putMarker(usagePrefix).catch(() => void 0);
  }
  const leaseUrl = await putMarker(leasePrefix);
  return { leaseUrl, usageUrl };
}
async function releaseGeneration(claim, completed) {
  await deleteByUrl(claim.leaseUrl);
  if (!completed && claim.usageUrl) {
    await deleteByUrl(claim.usageUrl);
  }
}

// server/preview/handler.ts
var generateInputSchema = z.object({
  pantoneId: z.string().min(2).max(48),
  // Vercel caps a function request body, so the browser resizes the photo
  // before upload; this ceiling keeps the encoded payload inside that cap.
  imageBase64: z.string().min(16).max(39e5),
  catalogColor: z.object({
    code: z.string().min(2).max(48),
    category: z.string().min(1).max(40),
    categoryEn: z.string().min(1).max(40),
    name: z.string().max(80),
    nameZh: z.string().max(80),
    swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
  }).optional(),
  partialWrapCustomizations: z.array(
    z.object({
      part: z.enum(["mirrors", "roof", "spoiler", "frontLowerBumper"]),
      finish: z.enum(["blackout", "carbon_fiber"])
    })
  ).max(4).optional()
});
var COLOR_REVIEW_UNAVAILABLE_MESSAGE = "\u672C\u6B21\u9810\u89BD\u672A\u57F7\u884C\u4F3A\u670D\u5668\u7AEF\u8272\u5F69\u5BE9\u67E5\uFF1B\u984F\u8272\u4ECD\u4EE5\u6240\u9078\u578B\u9304\u8272\u865F\u70BA\u6E96\u3002";
function sendTrpcSuccess(res, payload) {
  res.status(200).type("json").send([
    {
      result: {
        data: { json: payload }
      }
    }
  ]);
}
function sendTrpcError(res, message, path, httpStatus = 500) {
  res.status(httpStatus).type("json").send([
    {
      error: {
        json: {
          message,
          code: -32603,
          data: { code: "INTERNAL_SERVER_ERROR", httpStatus, path }
        }
      }
    }
  ]);
}
function readSuperJsonInput(body) {
  if (!body || typeof body !== "object") return void 0;
  const root = body;
  const first = (Array.isArray(root) ? root[0] : void 0) ?? root["0"] ?? (typeof root.json === "object" || typeof root.json === "string" ? root : void 0);
  if (!first || typeof first !== "object") return void 0;
  return first.json;
}
async function loadCatalogMaterialReference(key) {
  if (!key) return void 0;
  const candidates = [
    getMaterialCardRawUrl(key),
    `${PREVIEW_ENV.materialCardFallbackOrigin}/manus-storage/${key}`
  ];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        cache: "no-store",
        signal: AbortSignal.timeout(2e4)
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) continue;
      return {
        b64Json: buffer.toString("base64"),
        mimeType: contentType,
        signedUrl: candidate,
        buffer
      };
    } catch {
    }
  }
  throw new Error("\u578B\u9304\u8272\u5361\u53C3\u8003\u6A94\u76EE\u524D\u7121\u6CD5\u8B80\u53D6\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002");
}
function isKnownGuardError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.startsWith("PREVIEW_");
}
function createPreviewApp() {
  const app = express();
  app.use(express.json({ limit: "4mb" }));
  const healthPaths = ["/health", "/api/wrap-preview/health"];
  const generatePaths = ["/generate", "/api/wrap-preview/generate"];
  const imagePaths = ["/image", "/api/wrap-preview/image"];
  const storageCheckPaths = [
    "/storage-check",
    "/api/wrap-preview/storage-check"
  ];
  app.get(imagePaths, async (req, res) => {
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
        extension === "webp" ? "image/webp" : extension === "jpg" ? "image/jpeg" : "image/png"
      );
      res.status(200).send(buffer);
    } catch (error) {
      console.error("[WrapPreview] preview image read failed", error);
      res.status(502).type("json").send({ error: "preview_unavailable" });
    }
  });
  app.get(storageCheckPaths, async (_req, res) => {
    const report = {
      runtime: "vercel",
      tokenConfigured: Boolean(getBlobToken()),
      writeOk: false,
      readStatus: 0,
      readBytes: 0,
      contentType: "",
      cleanupOk: false
    };
    try {
      const key = `generated/vercel-wrap-preview-storage-check-${Date.now()}.png`;
      const url = await putBlobFile(
        key,
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
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
      report.error = error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160);
    }
    res.setHeader("Cache-Control", "no-store, private");
    res.status(200).type("json").send(report);
  });
  app.get(healthPaths, (_req, res) => {
    res.setHeader("Cache-Control", "no-store, private");
    sendTrpcSuccess(res, {
      provider: "openai",
      model: PREVIEW_ENV.imageModel,
      credentialConfigured: Boolean(PREVIEW_ENV.openAiApiKey),
      runtime: "vercel",
      limits: {
        dailyGenerationsPerIp: PREVIEW_ENV.dailyGenerationsPerIp,
        concurrentGenerationsPerIp: PREVIEW_ENV.concurrentGenerationsPerIp,
        rateLimitBypassConfigured: PREVIEW_ENV.rateLimitBypassIps.trim().length > 0
      }
    });
  });
  app.post(generatePaths, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, private");
    let usageClaim;
    let generationCompleted = false;
    try {
      const rawInput = readSuperJsonInput(req.body);
      const parsed = generateInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new Error("\u4E0A\u50B3\u8CC7\u6599\u683C\u5F0F\u4E0D\u5B8C\u6574\uFF0C\u8ACB\u91CD\u65B0\u4E0A\u50B3\u8ECA\u7167\u5F8C\u518D\u8A66\u3002");
      }
      const input = parsed.data;
      const clientIp = getClientIp(req.headers);
      const ipHash = hashClientIp(clientIp);
      const cacheKey = createPreviewCacheKey(
        ipHash,
        input
      );
      const cached = await getCachedPreview(cacheKey);
      if (cached) {
        sendTrpcSuccess(res, cached);
        return;
      }
      if (!isRateLimitBypassed(clientIp)) {
        try {
          const hasUnlimitedAccess = await hasUnlimitedMemberAccess(req);
          usageClaim = await claimGeneration(ipHash, {
            skipDailyLimit: hasUnlimitedAccess
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
      const materialReference = await loadCatalogMaterialReference(materialReferenceKey);
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
          ...materialReference ? [materialReference] : []
        ],
        size: imageGenerationSize,
        outputDimensions,
        // Two-image catalog edits stay inside the function time limit.
        quality: materialReference ? "low" : void 0
      });
      if (!generated.url) throw new Error("AI \u672A\u56DE\u50B3\u9810\u89BD\u5716\u7247\u3002");
      generationCompleted = true;
      const colorMetrics = materialReference ? await measureColorConsistency(
        materialReference.buffer,
        generated.buffer,
        buffer
      ) : void 0;
      const previewUrl = `/api/wrap-preview/image?u=${encodeURIComponent(
        generated.url
      )}`;
      const previewResponse = {
        previewUrl,
        pantoneId,
        materialReferenceUrl: materialReferenceKey ? getMaterialCardAssetPath(materialReferenceKey) : void 0,
        colorReview: {
          status: "unavailable",
          confidence: 0,
          message: materialReference ? COLOR_REVIEW_UNAVAILABLE_MESSAGE : "\u6B64\u9810\u89BD\u672A\u4F7F\u7528\u578B\u9304\u5BE6\u9AD4\u8272\u5361\u53C3\u8003\u3002"
        },
        colorMetrics,
        partialWrapCustomizations,
        outputSize: `${outputDimensions.width}x${outputDimensions.height}`,
        aspectRatio
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
          (error) => {
            console.error("[WrapPreview] usage release failed", error);
          }
        );
      }
    }
  });
  return app;
}
export {
  createPreviewApp
};
