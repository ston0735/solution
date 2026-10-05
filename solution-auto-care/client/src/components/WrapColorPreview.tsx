import { useAuth } from "@/_core/hooks/useAuth";
import ABCompare from "@/components/ABCompare";
import { trpc } from "@/lib/trpc";
import {
  createMemberPreviewHistory,
  saveMemberPreviewHistory,
} from "@/lib/memberHistory";
import { WRAP_COLOR_CATALOG, type WrapColor } from "@/data/wrapColorCatalog";
import { getWrapColorPresentation } from "@/lib/wrapColorPresentation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PARTIAL_WRAP_FINISHES,
  PARTIAL_WRAP_PART_LIST,
  PARTIAL_WRAP_PARTS,
  type PartialWrapCustomization,
  type PartialWrapFinish,
  type PartialWrapPartId,
} from "@shared/partialWrapOptions";
import { getMaterialCardAssetPath } from "@shared/wrapAssetPaths";
import { WRAP_COLOR_REFERENCE_KEYS } from "@shared/wrapColorReferenceKeys";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Check,
  Download,
  ImagePlus,
  Layers3,
  LoaderCircle,
  RefreshCcw,
  WandSparkles,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

const MAX_FILE_BYTES = 6 * 1024 * 1024;

type ImageDimensions = {
  width: number;
  height: number;
};

function formatColorLabel(color: WrapColor) {
  const name = color.nameZh || color.name;
  return name ? `${color.code} · ${name}` : color.code;
}

function getAspectRatioLabel({ width, height }: ImageDimensions) {
  const greatestCommonDivisor = (a: number, b: number): number =>
    b === 0 ? a : greatestCommonDivisor(b, a % b);
  const divisor = greatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

async function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("預覽圖片讀取失敗"));
    image.src = source;
  });
}

async function cropPreviewToSourceAspectRatio(
  previewUrl: string,
  source: ImageDimensions
) {
  const preview = await loadImage(previewUrl);
  const targetAspectRatio = source.width / source.height;
  const previewAspectRatio = preview.naturalWidth / preview.naturalHeight;
  const cropWidth =
    previewAspectRatio > targetAspectRatio
      ? preview.naturalHeight * targetAspectRatio
      : preview.naturalWidth;
  const cropHeight =
    previewAspectRatio > targetAspectRatio
      ? preview.naturalHeight
      : preview.naturalWidth / targetAspectRatio;
  const cropLeft = (preview.naturalWidth - cropWidth) / 2;
  const cropTop = (preview.naturalHeight - cropHeight) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth);
  canvas.height = Math.round(cropHeight);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("預覽圖片無法轉換");

  context.drawImage(
    preview,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("預覽圖片無法轉換");
  return {
    previewUrl: URL.createObjectURL(blob),
    outputSize: `${canvas.width}x${canvas.height}`,
  };
}

export default function WrapColorPreview() {
  const { isAuthenticated } = useAuth();
  const fileInputId = useId();
  const categories = useMemo(
    () => Array.from(new Set(WRAP_COLOR_CATALOG.map(color => color.category))),
    []
  );
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? "");
  const [selectedCode, setSelectedCode] = useState(
    () => WRAP_COLOR_CATALOG[0]?.code ?? ""
  );
  const [customColorId, setCustomColorId] = useState("");
  const [sourcePreview, setSourcePreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [sourceDimensions, setSourceDimensions] =
    useState<ImageDimensions | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState("");
  const [generatedColorId, setGeneratedColorId] = useState("");
  const [generatedMaterialReferenceUrl, setGeneratedMaterialReferenceUrl] =
    useState("");
  const [generatedColorReview, setGeneratedColorReview] = useState<{
    status: string;
    confidence: number;
    message: string;
  } | null>(null);
  const [generatedColorMetrics, setGeneratedColorMetrics] = useState<{
    status: string;
    message: string;
    hueDelta: number;
    mode: string;
  } | null>(null);
  const [generatedAspectRatio, setGeneratedAspectRatio] = useState("");
  const [generatedOutputSize, setGeneratedOutputSize] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [historyIsSaved, setHistoryIsSaved] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [partialWrapSelections, setPartialWrapSelections] = useState<
    Partial<Record<PartialWrapPartId, PartialWrapFinish>>
  >({});
  const [
    generatedPartialWrapCustomizations,
    setGeneratedPartialWrapCustomizations,
  ] = useState<PartialWrapCustomization[]>([]);
  const [fileName, setFileName] = useState("");
  const [inputError, setInputError] = useState("");

  const colorsInCategory = useMemo(
    () =>
      WRAP_COLOR_CATALOG.filter(color => color.category === selectedCategory),
    [selectedCategory]
  );
  const selectedColor = useMemo(
    () => WRAP_COLOR_CATALOG.find(color => color.code === selectedCode),
    [selectedCode]
  );
  const selectedColorPresentation = useMemo(
    () => (selectedColor ? getWrapColorPresentation(selectedColor) : undefined),
    [selectedColor]
  );
  const selectedMaterialCardKey = selectedColor
    ? WRAP_COLOR_REFERENCE_KEYS[selectedColor.code]
    : undefined;
  const selectedMaterialCardUrl = selectedMaterialCardKey
    ? getMaterialCardAssetPath(selectedMaterialCardKey)
    : "";
  const targetColorId = customColorId.trim() || selectedColor?.code || "";
  const catalogColorContext = useMemo(
    () =>
      customColorId.trim() || !selectedColor
        ? undefined
        : {
            code: selectedColor.code,
            category: selectedColor.category,
            categoryEn: selectedColor.categoryEn,
            name: selectedColor.name,
            nameZh: selectedColor.nameZh,
            swatch: selectedColor.swatch,
          },
    [customColorId, selectedColor]
  );

  const generatePreview = trpc.wrapPreview.generate.useMutation({
    onSuccess: async result => {
      let previewUrl = result.previewUrl;
      let outputSize = result.outputSize ?? "";
      const aspectRatio =
        result.aspectRatio ??
        (sourceDimensions ? getAspectRatioLabel(sourceDimensions) : "");

      if (sourceDimensions) {
        try {
          const normalized = await cropPreviewToSourceAspectRatio(
            result.previewUrl,
            sourceDimensions
          );
          previewUrl = normalized.previewUrl;
          outputSize = normalized.outputSize;
        } catch {
          // The server-side output remains available if a browser blocks canvas conversion.
        }
      }

      setGeneratedPreview(previewUrl);
      setGeneratedColorId(result.pantoneId);
      setGeneratedMaterialReferenceUrl(result.materialReferenceUrl ?? "");
      setGeneratedColorReview(result.colorReview);
      setGeneratedColorMetrics(result.colorMetrics ?? null);
      setGeneratedPartialWrapCustomizations(result.partialWrapCustomizations);
      setGeneratedAspectRatio(aspectRatio);
      setGeneratedOutputSize(outputSize);
      let historySaved = false;
      if (isAuthenticated) {
        try {
          const historyResponse = await createMemberPreviewHistory({
            previewUrl: result.previewUrl,
            originalImageDataUrl: sourcePreview,
            pantoneId: result.pantoneId,
            catalogColor: catalogColorContext ?? null,
            aspectRatio,
            outputSize,
            partialWrapCustomizations: result.partialWrapCustomizations,
          });
          setHistoryId(historyResponse.item.id);
          setHistoryIsSaved(historyResponse.item.isSaved);
          historySaved = true;
        } catch (error) {
          toast.warning("預覽已完成，但歷史紀錄暫時無法保存", {
            description:
              error instanceof Error ? error.message : "請稍後到會員專區重試。",
          });
        }
      }
      toast.success("預覽已生成", {
        description: historySaved
          ? `${result.pantoneId} 的包膜概念預覽已完成，已暫存 3 天。`
          : isAuthenticated
            ? `${result.pantoneId} 的包膜概念預覽已完成。`
            : "登入會員後，完成的預覽才會自動保存。",
      });
    },
    onError: error => {
      setInputError(error.message);
      toast.error("無法生成預覽", { description: error.message });
    },
  });

  useEffect(
    () => () => {
      if (sourcePreview.startsWith("blob:")) URL.revokeObjectURL(sourcePreview);
    },
    [sourcePreview]
  );

  useEffect(
    () => () => {
      if (generatedPreview.startsWith("blob:"))
        URL.revokeObjectURL(generatedPreview);
    },
    [generatedPreview]
  );

  const resetGeneratedPreview = () => {
    setGeneratedPreview("");
    setGeneratedColorId("");
    setGeneratedMaterialReferenceUrl("");
    setGeneratedColorReview(null);
    setGeneratedColorMetrics(null);
    setGeneratedPartialWrapCustomizations([]);
    setGeneratedAspectRatio("");
    setGeneratedOutputSize("");
    setHistoryId(null);
    setHistoryIsSaved(false);
    setHistorySaving(false);
    setCompareMode(false);
  };

  const partialWrapCustomizations = useMemo(
    () =>
      PARTIAL_WRAP_PART_LIST.flatMap(part => {
        const finish = partialWrapSelections[part.id];
        return finish ? [{ part: part.id, finish }] : [];
      }),
    [partialWrapSelections]
  );

  const getGenerationInput = () => ({
    pantoneId: targetColorId,
    imageBase64,
    ...(catalogColorContext ? { catalogColor: catalogColorContext } : {}),
    ...(partialWrapCustomizations.length ? { partialWrapCustomizations } : {}),
  });

  const updatePartialWrapSelection = (
    part: PartialWrapPartId,
    checked: boolean
  ) => {
    setPartialWrapSelections(current => {
      const next = { ...current };
      if (checked) next[part] = current[part] ?? "blackout";
      else delete next[part];
      return next;
    });
    resetGeneratedPreview();
  };

  const choosePartialWrapFinish = (
    part: PartialWrapPartId,
    finish: PartialWrapFinish
  ) => {
    setPartialWrapSelections(current => ({ ...current, [part]: finish }));
    resetGeneratedPreview();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setInputError("");
    resetGeneratedPreview();
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > MAX_FILE_BYTES
    ) {
      setInputError("請上傳小於 6MB 的 JPG、PNG 或 WEBP 車輛照片。");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setInputError("照片讀取失敗，請重新選擇檔案。");
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const separatorIndex = dataUrl.indexOf(",");
      if (separatorIndex === -1) {
        setInputError("照片格式無法辨識，請重新上傳。");
        return;
      }
      setSourcePreview(dataUrl);
      setImageBase64(dataUrl.slice(separatorIndex + 1));
      setFileName(file.name);
      void loadImage(dataUrl)
        .then(image =>
          setSourceDimensions({
            width: image.naturalWidth,
            height: image.naturalHeight,
          })
        )
        .catch(() => setInputError("無法辨識照片尺寸，請重新選擇檔案。"));
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setSourcePreview("");
    setImageBase64("");
    setSourceDimensions(null);
    setFileName("");
    setInputError("");
    resetGeneratedPreview();
    const input = document.getElementById(
      fileInputId
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleCategoryChange = (category: string) => {
    const firstColor = WRAP_COLOR_CATALOG.find(
      color => color.category === category
    );
    setSelectedCategory(category);
    setSelectedCode(firstColor?.code ?? "");
    setCustomColorId("");
    resetGeneratedPreview();
  };

  const handleColorChange = (code: string) => {
    setSelectedCode(code);
    setCustomColorId("");
    resetGeneratedPreview();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInputError("");
    if (!imageBase64) {
      setInputError("請先上傳一張清楚、可看到完整車身的愛車照片。");
      return;
    }
    if (!targetColorId) {
      setInputError("請從型錄選擇一個色號，或輸入自訂色號。");
      return;
    }
    generatePreview.mutate(getGenerationInput());
  };

  const handleSavePreview = async () => {
    if (!isAuthenticated) {
      toast.info("請先登入會員", {
        description: "登入後才能將圖片保存 30 天。",
      });
      return;
    }
    if (!historyId || historyIsSaved || historySaving) return;

    setHistorySaving(true);
    try {
      const response = await saveMemberPreviewHistory(historyId);
      setHistoryIsSaved(response.item.isSaved);
      toast.success("圖片已保存 30 天", {
        description: "你可以在會員專區的預覽歷史中查看。",
      });
    } catch (error) {
      toast.error("圖片保存失敗", {
        description: error instanceof Error ? error.message : "請稍後再試。",
      });
    } finally {
      setHistorySaving(false);
    }
  };

  const handleDownloadPreview = () => {
    if (!generatedPreview) return;
    const link = document.createElement("a");
    link.href = generatedPreview;
    link.download = `solution-${generatedColorId || "wrap-preview"}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("下載已開始");
  };

  const isGenerating = generatePreview.isPending;

  return (
    <section
      id="wrap-preview"
      className="relative overflow-hidden border-y border-white/10 bg-[#151712] px-5 py-20 sm:px-8 lg:px-10 lg:py-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_15%,rgba(169,255,68,0.11),transparent_29%),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,72px_72px,72px_72px]" />
      <div data-reveal className="relative mx-auto max-w-[1600px]">
        <div className="grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="eyebrow">WRAP COLOR LAB / 01</p>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">
              上傳實車照片，從 KSG
              型錄選擇色系與色號，先在線上檢視改色包膜的概念方向。
            </p>
          </div>
          <div>
            <h2 className="font-display text-[clamp(3rem,6.6vw,7.45rem)] font-medium uppercase leading-[0.79] tracking-[-0.05em] text-[#f5f6f0]">
              COLOR,
              <br />
              <span className="text-[#a9ff44]">SIMULATED.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              線上客製化包膜車色預覽，讓你的愛車在正式施工前，先看見下一種表面狀態。
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:gap-12">
          <form
            onSubmit={handleSubmit}
            className="border border-white/15 bg-black/20 p-5 sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-white/12 pb-4 text-[0.62rem] font-semibold tracking-[0.17em] text-white/46">
              <span>INPUT MODULE</span>
              <span>01—02</span>
            </div>

            <div className="mt-7">
              <label
                htmlFor={fileInputId}
                className="mb-3 block text-xs font-bold tracking-[0.12em] text-white/86"
              >
                01／上傳愛車照片
              </label>
              {!sourcePreview ? (
                <label
                  htmlFor={fileInputId}
                  className="group flex min-h-56 flex-col items-center justify-center border border-dashed border-white/25 bg-[#0d0e0b] px-6 text-center transition-colors hover:border-[#a9ff44] hover:bg-[#11150d]"
                >
                  <ImagePlus
                    size={26}
                    strokeWidth={1.4}
                    className="text-[#a9ff44]"
                  />
                  <span className="mt-4 text-sm font-semibold text-white/90">
                    選擇車輛照片
                  </span>
                  <span className="mt-2 text-xs leading-5 text-white/45">
                    JPG、PNG、WEBP・最大 6MB
                    <br />
                    建議使用日間、車身完整入鏡的照片
                  </span>
                </label>
              ) : (
                <div className="relative overflow-hidden border border-white/20 bg-[#0d0e0b]">
                  <img
                    src={sourcePreview}
                    alt="待生成預覽的上傳愛車照片"
                    className="h-64 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/76 px-3 py-2 backdrop-blur-sm">
                    <span className="truncate text-xs text-white/72">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      disabled={isGenerating}
                      className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/20 text-white transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]"
                      aria-label="移除照片"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
              <input
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
                disabled={isGenerating}
              />
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-4">
                <label
                  htmlFor="wrap-color-code"
                  className="text-xs font-bold tracking-[0.12em] text-white/86"
                >
                  02／型錄色卡色號
                </label>
                <span className="text-[0.6rem] font-semibold tracking-[0.13em] text-[#a9ff44]">
                  {WRAP_COLOR_CATALOG.length} COLORS / KSG TPU
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[0.82fr_1.18fr]">
                <label className="sr-only" htmlFor="wrap-color-category">
                  選擇色系
                </label>
                <select
                  id="wrap-color-category"
                  value={selectedCategory}
                  onChange={event => handleCategoryChange(event.target.value)}
                  disabled={isGenerating}
                  className="h-14 min-w-0 border border-white/20 bg-[#0d0e0b] px-4 text-sm font-semibold text-white outline-none transition-colors focus:border-[#a9ff44] disabled:opacity-60"
                >
                  {categories.map(category => (
                    <option
                      key={category}
                      value={category}
                      className="bg-[#10110e] text-white"
                    >
                      {category}・
                      {
                        WRAP_COLOR_CATALOG.filter(
                          color => color.category === category
                        ).length
                      }{" "}
                      色
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="wrap-color-code">
                  選擇型錄色號
                </label>
                <select
                  id="wrap-color-code"
                  value={selectedCode}
                  onChange={event => handleColorChange(event.target.value)}
                  disabled={isGenerating}
                  className="h-14 min-w-0 border border-white/20 bg-[#0d0e0b] px-4 text-sm tracking-[0.04em] text-white outline-none transition-colors focus:border-[#a9ff44] disabled:opacity-60"
                >
                  {colorsInCategory.map(color => (
                    <option
                      key={color.code}
                      value={color.code}
                      className="bg-[#10110e] text-white"
                    >
                      {formatColorLabel(color)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedColor && selectedColorPresentation && (
                <div className="mt-3 flex items-center gap-4 border border-white/10 bg-black/20 p-3">
                  {selectedMaterialCardUrl ? (
                    <img
                      src={selectedMaterialCardUrl}
                      alt={`${selectedColor.code} 實體材質色卡預覽`}
                      className="h-20 w-28 shrink-0 border border-white/20 object-cover shadow-[0_0_24px_rgba(169,255,68,0.08)]"
                    />
                  ) : (
                    <span
                      className="h-20 w-28 shrink-0 border border-white/20"
                      style={{ backgroundColor: selectedColor.swatch }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold tracking-[0.08em] text-white">
                        {selectedColor.code}
                      </p>
                      <span className="border border-[#a9ff44]/35 px-1.5 py-0.5 text-[0.56rem] font-semibold tracking-[0.1em] text-[#a9ff44]">
                        {selectedColorPresentation.category}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/48">
                      <span className="mr-2 text-[0.56rem] font-semibold tracking-[0.1em] text-white/35">
                        {selectedColorPresentation.descriptorLabel}
                      </span>
                      {selectedColorPresentation.descriptor}
                    </p>
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs leading-5 text-white/43">
                型錄已依紅色系、橙色系、黃色系等 15
                個色系分組。選定色號後，系統會將 PDF 的實際材質色卡一併帶入
                AI，讓預覽更貼近膜料色相與金屬／珠光質感。
              </p>
              <div className="mt-3 flex border border-white/15 bg-[#0d0e0b] focus-within:border-[#a9ff44]">
                <label
                  htmlFor="custom-color-id"
                  className="flex items-center border-r border-white/15 px-4 text-[0.6rem] font-semibold tracking-[0.12em] text-white/46"
                >
                  自訂
                </label>
                <input
                  id="custom-color-id"
                  value={customColorId}
                  onChange={event => {
                    setCustomColorId(event.target.value);
                    resetGeneratedPreview();
                  }}
                  placeholder="非型錄色號可在此輸入"
                  maxLength={48}
                  disabled={isGenerating}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm tracking-[0.06em] text-white outline-none placeholder:text-white/25"
                />
              </div>
            </div>

            <div className="mt-7 border-t border-white/12 pt-7">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.12em] text-white/86">
                    03／局部包膜客製化
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    可複選零件；每項僅提供黑化或碳纖維兩種效果。
                  </p>
                </div>
                <Layers3
                  size={18}
                  strokeWidth={1.4}
                  className="shrink-0 text-[#a9ff44]"
                />
              </div>
              <div className="divide-y divide-white/10 border-y border-white/10">
                {PARTIAL_WRAP_PART_LIST.map(part => {
                  const selectedFinish = partialWrapSelections[part.id];
                  const isSelected = Boolean(selectedFinish);
                  return (
                    <div
                      key={part.id}
                      className="grid gap-3 py-3 sm:grid-cols-[minmax(0,0.88fr)_minmax(220px,1.12fr)] sm:items-center"
                    >
                      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-white/85">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={checked =>
                            updatePartialWrapSelection(
                              part.id,
                              checked === true
                            )
                          }
                          disabled={isGenerating}
                          className="border-white/35 data-[state=checked]:border-[#a9ff44] data-[state=checked]:bg-[#a9ff44] data-[state=checked]:text-[#11130c]"
                        />
                        {part.label}
                      </label>
                      <div
                        className="grid grid-cols-2 gap-2"
                        role="group"
                        aria-label={`${part.label} 材質選擇`}
                      >
                        {(
                          Object.entries(PARTIAL_WRAP_FINISHES) as Array<
                            [
                              PartialWrapFinish,
                              (typeof PARTIAL_WRAP_FINISHES)[PartialWrapFinish],
                            ]
                          >
                        ).map(([finish, detail]) => (
                          <button
                            key={finish}
                            type="button"
                            disabled={!isSelected || isGenerating}
                            aria-pressed={selectedFinish === finish}
                            onClick={() =>
                              choosePartialWrapFinish(part.id, finish)
                            }
                            className={`min-h-10 border px-2 text-[0.65rem] font-bold tracking-[0.08em] transition-colors ${selectedFinish === finish ? "border-[#a9ff44] bg-[#a9ff44] text-[#11130c]" : "border-white/18 bg-black/20 text-white/55 hover:border-white/45 hover:text-white"} disabled:cursor-not-allowed disabled:opacity-35`}
                          >
                            {detail.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {partialWrapCustomizations.length > 0 && (
                <p className="mt-3 flex gap-2 text-xs leading-5 text-white/58">
                  <Check size={15} className="mt-0.5 shrink-0 text-[#a9ff44]" />
                  已套用：
                  {partialWrapCustomizations
                    .map(
                      item =>
                        `${PARTIAL_WRAP_PARTS[item.part].label}・${PARTIAL_WRAP_FINISHES[item.finish].label}`
                    )
                    .join("、")}
                </p>
              )}
            </div>

            {inputError && (
              <p
                role="alert"
                className="mt-5 flex gap-2 border-l-2 border-[#a9ff44] bg-[#a9ff44]/8 px-3 py-2 text-xs leading-5 text-white/78"
              >
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0 text-[#a9ff44]"
                />
                {inputError}
              </p>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="mt-7 flex w-full items-center justify-center gap-3 bg-[#a9ff44] px-5 py-4 text-xs font-bold tracking-[0.14em] text-[#11130c] transition-all hover:bg-white disabled:cursor-wait disabled:opacity-65 active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> AI
                  正在生成包膜預覽
                </>
              ) : (
                <>
                  <WandSparkles size={16} /> 生成車色預覽
                </>
              )}
            </button>
          </form>

          <div
            className={`relative overflow-hidden border border-white/15 bg-[#0b0b0a] ${generatedPreview && sourceDimensions ? "min-h-0" : "min-h-[440px] sm:min-h-[560px]"}`}
            style={
              generatedPreview && sourceDimensions
                ? {
                    aspectRatio: `${sourceDimensions.width} / ${sourceDimensions.height}`,
                  }
                : undefined
            }
          >
            {generatedPreview ? (
              <div className="flex min-h-full flex-col">
                <div className="relative min-h-[440px] flex-1 bg-[#050505] sm:min-h-[560px]">
                  {compareMode && sourcePreview ? (
                    <ABCompare
                      key={generatedPreview}
                      beforeUrl={sourcePreview}
                      afterUrl={generatedPreview}
                      beforeLabel="A ORIGINAL"
                      afterLabel="B AI PREVIEW"
                      alt="原始車照與 AI 車色預覽比較"
                      className="absolute inset-0"
                    />
                  ) : (
                    <img
                      src={generatedPreview}
                      alt={`以 ${generatedColorId} 為目標色號的 AI 車色包膜概念預覽`}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="border-t border-white/15 bg-[#11120f] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#a9ff44]">CONCEPT PREVIEW GENERATED</p>
                      <p className="mt-2 text-sm text-white/80">目標色號：{generatedColorId}</p>
                      {generatedAspectRatio && <p className="mt-1 text-xs text-white/55">輸出比例：{generatedAspectRatio}{generatedOutputSize ? ` · ${generatedOutputSize}` : ""}</p>}
                      {generatedPartialWrapCustomizations.length > 0 && <p className="mt-2 text-xs leading-5 text-white/58">局部包膜：{generatedPartialWrapCustomizations.map(item => `${PARTIAL_WRAP_PARTS[item.part].label}・${PARTIAL_WRAP_FINISHES[item.finish].label}`).join("、")}</p>}
                      {isAuthenticated && historyId && <p className="mt-2 text-[0.65rem] text-white/45">{historyIsSaved ? "已保存 30 天" : "目前暫存 3 天，按下「儲存圖片」可延長至 30 天"}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setCompareMode(current => !current)} disabled={!sourcePreview || isGenerating} className={`flex items-center gap-2 border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${compareMode ? "border-[#a9ff44] bg-[#a9ff44]/15 text-[#a9ff44]" : "border-white/35 bg-black/55 text-white hover:border-[#a9ff44] hover:text-[#a9ff44]"}`}>A｜B 比較</button>
                      {isAuthenticated && historyId && <button type="button" onClick={() => void handleSavePreview()} disabled={historyIsSaved || historySaving || isGenerating} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${historyIsSaved ? "border border-[#a9ff44]/60 bg-[#a9ff44]/15 text-[#a9ff44]" : "bg-[#a9ff44] text-[#10130a] hover:bg-white"}`}>{historyIsSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}{historySaving ? "保存中…" : historyIsSaved ? "已保存 30 天" : "儲存圖片"}</button>}
                      <button type="button" onClick={handleDownloadPreview} disabled={isGenerating} className="flex items-center gap-2 border border-white/35 bg-black/55 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:opacity-60"><Download size={14} />下載圖片</button>
                      <button type="button" onClick={() => generatePreview.mutate(getGenerationInput())} disabled={isGenerating} className="flex items-center gap-2 border border-white/25 bg-black/45 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:opacity-60"><RefreshCcw size={14} />重新生成</button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(200px,0.55fr)]">
                    <div className="space-y-2">
                      {generatedColorMetrics && <p className={`border-l-2 px-3 py-2 text-xs leading-5 ${generatedColorMetrics.status === "mismatch" ? "border-amber-300 bg-amber-300/12 text-amber-50" : "border-[#a9ff44] bg-black/35 text-white/78"}`}>{generatedColorMetrics.message}</p>}
                      {generatedColorReview && <p className={`border-l-2 px-3 py-2 text-xs leading-5 ${generatedColorReview.status === "mismatch" ? "border-amber-300 bg-amber-300/12 text-amber-50" : "border-[#a9ff44] bg-black/35 text-white/78"}`}>{generatedColorReview.message}</p>}
                    </div>
                    {generatedMaterialReferenceUrl && <div className="border border-white/15 bg-black/25 p-3"><div className="flex items-center gap-3"><img src={generatedMaterialReferenceUrl} alt={`${generatedColorId} 的 PDF 原始材質色卡`} className="h-20 w-28 shrink-0 object-cover" /><div><p className="text-[0.55rem] font-bold tracking-[0.12em] text-[#a9ff44]">PDF MATERIAL CARD</p><p className="mt-1 text-[0.68rem] leading-5 text-white/72">實體色卡參考已啟用</p></div></div><p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/55">請在圖片外側對照色卡與車身主色；如明顯偏離，可重新生成。</p></div>}
                  </div>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                <div className="relative flex h-28 w-28 items-center justify-center border border-[#a9ff44]/40">
                  <LoaderCircle
                    size={28}
                    className="animate-spin text-[#a9ff44]"
                  />
                  <span className="absolute inset-2 border border-white/10" />
                </div>
                <p className="font-display mt-7 text-3xl tracking-[0.04em] text-white">
                  PROCESSING SURFACE
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/53">
                  AI
                  正在保留你的車型與拍攝角度，並重建指定型錄色號的包膜材質與車漆反光。
                </p>
                <div className="mt-7 h-px w-full max-w-xs overflow-hidden bg-white/12">
                  <span className="block h-full w-1/2 bg-[#a9ff44] motion-safe:animate-[scan_1.4s_ease-in-out_infinite]" />
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center border border-[#a9ff44]/50 text-[#a9ff44]">
                    <WandSparkles size={18} strokeWidth={1.4} />
                  </span>
                  <span className="text-[0.58rem] font-semibold tracking-[0.18em] text-white/38">
                    OUTPUT PREVIEW
                  </span>
                </div>
                <div>
                  <p className="font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.82] tracking-[-0.04em] text-white/16">
                    YOUR
                    <br />
                    NEXT
                    <br />
                    FINISH.
                  </p>
                  <p className="mt-6 max-w-sm border-l border-[#a9ff44] pl-4 text-sm leading-6 text-white/58">
                    上傳照片並從型錄選擇色號後，這裡會顯示專屬於你車輛的改色包膜概念預覽。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {generatedPreview && (
          <p className="mt-4 border-l-2 border-[#a9ff44] bg-[#a9ff44]/8 px-3 py-2 text-xs leading-5 text-white/58">
            按下「儲存圖片」鈕將保存 30 天，未儲存的圖片只保留 3 天
          </p>
        )}

        <div className="mt-5 flex gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-white/43">
          <Check size={15} className="mt-0.5 shrink-0 text-[#a9ff44]" />
          <p>
            此功能提供 AI
            視覺概念預覽，型錄色號與螢幕呈現會受影像光線影響；實際施工前，仍應以實體包膜色樣與店內確認結果為準。
          </p>
        </div>
      </div>
    </section>
  );
}
