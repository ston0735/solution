import { useAuth } from "@/_core/hooks/useAuth";
import ABCompare from "@/components/ABCompare";
import { trpc } from "@/lib/trpc";
import { useSiteContent } from "@/contexts/SiteContentContext";
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

async function loadImage(source: string, errorMessage: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(errorMessage));
    image.src = source;
  });
}

async function cropPreviewToSourceAspectRatio(
  previewUrl: string,
  source: ImageDimensions,
  messages: { loadError: string; convertError: string }
) {
  const preview = await loadImage(previewUrl, messages.loadError);
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
  if (!context) throw new Error(messages.convertError);

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
  if (!blob) throw new Error(messages.convertError);
  return {
    previewUrl: URL.createObjectURL(blob),
    outputSize: `${canvas.width}x${canvas.height}`,
  };
}

export default function WrapColorPreview() {
  const { isAuthenticated } = useAuth();
  const { text, image } = useSiteContent();
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
  const [vehicleModel, setVehicleModel] = useState("");
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
            sourceDimensions,
            {
              loadError: text("ai.error.previewLoad"),
              convertError: text("ai.error.previewConvert"),
            }
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
            vehicleModel: vehicleModel.trim() || null,
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
          toast.warning(text("ai.toast.historySaveWarning"), {
            description:
              error instanceof Error
                ? error.message
                : text("ai.toast.historySaveWarningDescription"),
          });
        }
      }
      toast.success(text("ai.toast.generateSuccess"), {
        description: historySaved
          ? `${result.pantoneId}${text("ai.toast.previewSavedDescription")}`
          : isAuthenticated
            ? `${result.pantoneId}${text("ai.toast.previewDescription")}`
            : text("ai.toast.loginSaveDescription"),
      });
    },
    onError: error => {
      setInputError(error.message);
      toast.error(text("ai.toast.generateFailed"), {
        description: error.message,
      });
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
      setInputError(text("ai.error.fileType"));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setInputError(text("ai.error.fileRead"));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const separatorIndex = dataUrl.indexOf(",");
      if (separatorIndex === -1) {
        setInputError(text("ai.error.fileFormat"));
        return;
      }
      setSourcePreview(dataUrl);
      setImageBase64(dataUrl.slice(separatorIndex + 1));
      setFileName(file.name);
      void loadImage(dataUrl, text("ai.error.fileRead"))
        .then(image =>
          setSourceDimensions({
            width: image.naturalWidth,
            height: image.naturalHeight,
          })
        )
        .catch(() => setInputError(text("ai.error.dimensions")));
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
      setInputError(text("ai.error.photoRequired"));
      return;
    }
    if (!targetColorId) {
      setInputError(text("ai.error.colorRequired"));
      return;
    }
    generatePreview.mutate(getGenerationInput());
  };

  const handleSavePreview = async () => {
    if (!isAuthenticated) {
      toast.info(text("ai.auth.loginRequired"), {
        description: text("ai.auth.loginRequiredDescription"),
      });
      return;
    }
    if (!historyId || historyIsSaved || historySaving) return;

    setHistorySaving(true);
    try {
      const response = await saveMemberPreviewHistory(historyId);
      setHistoryIsSaved(response.item.isSaved);
      toast.success(text("ai.toast.saved"), {
        description: text("ai.toast.savedDescription"),
      });
    } catch (error) {
      toast.error(text("ai.toast.saveFailed"), {
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
    toast.success(text("ai.toast.downloadStarted"));
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
            <p className="eyebrow">{text("ai.eyebrow")}</p>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">
              {text("ai.intro")}
            </p>
          </div>
          <div>
            <h2 className="font-display text-[clamp(3rem,6.6vw,7.45rem)] font-medium uppercase leading-[0.79] tracking-[-0.05em] text-[#f5f6f0]">
              {text("ai.titleLine1")}
              <br />
              <span className="text-[#a9ff44]">{text("ai.titleLine2")}</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              {text("ai.description")}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:gap-12">
          <form
            onSubmit={handleSubmit}
            className="border border-white/15 bg-black/20 p-5 sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-white/12 pb-4 text-[0.62rem] font-semibold tracking-[0.17em] text-white/46">
              <span>{text("ai.inputModuleLabel")}</span>
              <span>{text("ai.inputModuleStep")}</span>
            </div>

            <div className="mt-7">
              <label
                htmlFor={fileInputId}
                className="mb-3 block text-xs font-bold tracking-[0.12em] text-white/86"
              >
                {text("ai.photo.stepLabel")}
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
                    {text("ai.photo.selectLabel")}
                  </span>
                  <span className="mt-2 whitespace-pre-line text-xs leading-5 text-white/45">
                    {text("ai.photo.formatHint")}
                  </span>
                </label>
              ) : (
                <div className="relative overflow-hidden border border-white/20 bg-[#0d0e0b]">
                  <img
                    src={sourcePreview}
                    alt={text("ai.photo.uploadedAlt")}
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
                      aria-label={text("ai.photo.removeAriaLabel")}
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
              <label
                htmlFor="vehicle-model"
                className="mb-3 block text-xs font-bold tracking-[0.12em] text-white/86"
              >
                {text("ai.vehicle.label")}
              </label>
              <input
                id="vehicle-model"
                value={vehicleModel}
                onChange={event => setVehicleModel(event.target.value)}
                placeholder={text("ai.vehicle.placeholder")}
                maxLength={120}
                disabled={isGenerating}
                className="h-12 w-full border border-white/20 bg-[#0d0e0b] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#a9ff44] disabled:opacity-60"
              />
              <p className="mt-2 text-xs leading-5 text-white/40">
                {text("ai.vehicle.help")}
              </p>
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-4">
                <label
                  htmlFor="wrap-color-code"
                  className="text-xs font-bold tracking-[0.12em] text-white/86"
                >
                  {text("ai.catalog.stepLabel")}
                </label>
                <span className="text-[0.6rem] font-semibold tracking-[0.13em] text-[#a9ff44]">
                  {WRAP_COLOR_CATALOG.length} {text("ai.catalog.countSuffix")}{" "}
                  <img
                    src={image("global.ksgLogo")}
                    alt={text("global.ksgLogoAlt")}
                    className="ml-1 inline-block h-5 max-w-16 object-contain"
                  />
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[0.82fr_1.18fr]">
                <label className="sr-only" htmlFor="wrap-color-category">
                  {text("ai.catalog.categorySelectLabel")}
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
                      {text("ai.catalog.colorCountSuffix")}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="wrap-color-code">
                  {text("ai.catalog.colorSelectLabel")}
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
                      alt={`${selectedColor.code} ${text("ai.catalog.swatchAltSuffix")}`}
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
                {text("ai.catalog.description")}
              </p>
              <div className="mt-3 flex border border-white/15 bg-[#0d0e0b] focus-within:border-[#a9ff44]">
                <label
                  htmlFor="custom-color-id"
                  className="flex items-center border-r border-white/15 px-4 text-[0.6rem] font-semibold tracking-[0.12em] text-white/46"
                >
                  {text("ai.catalog.customLabel")}
                </label>
                <input
                  id="custom-color-id"
                  value={customColorId}
                  onChange={event => {
                    setCustomColorId(event.target.value);
                    resetGeneratedPreview();
                  }}
                  placeholder={text("ai.catalog.customPlaceholder")}
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
                    {text("ai.partial.stepLabel")}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    {text("ai.partial.description")}
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
                        aria-label={`${part.label} ${text("ai.partial.finishGroupSuffix")}`}
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
                  {text("ai.partial.appliedPrefix")}
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
                  <WandSparkles size={16} /> {text("ai.generateButton.default")}
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
                      beforeLabel={text("ai.output.beforeLabel")}
                      afterLabel={text("ai.output.afterLabel")}
                      alt={text("ai.output.compareAlt")}
                      className="absolute inset-0"
                    />
                  ) : (
                    <img
                      src={generatedPreview}
                      alt={`${text("ai.output.imageAltPrefix")} ${generatedColorId} 的 AI 車色包膜概念預覽`}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="border-t border-white/15 bg-[#11120f] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#a9ff44]">
                        {text("ai.output.generatedLabel")}
                      </p>
                      <p className="mt-2 text-sm text-white/80">
                        {text("ai.output.targetLabel")}
                        {generatedColorId}
                      </p>
                      {generatedAspectRatio && (
                        <p className="mt-1 text-xs text-white/55">
                          {text("ai.output.ratioLabel")}
                          {generatedAspectRatio}
                          {generatedOutputSize
                            ? ` · ${generatedOutputSize}`
                            : ""}
                        </p>
                      )}
                      {generatedPartialWrapCustomizations.length > 0 && (
                        <p className="mt-2 text-xs leading-5 text-white/58">
                          {text("ai.output.partialLabel")}
                          {generatedPartialWrapCustomizations
                            .map(
                              item =>
                                `${PARTIAL_WRAP_PARTS[item.part].label}・${PARTIAL_WRAP_FINISHES[item.finish].label}`
                            )
                            .join("、")}
                        </p>
                      )}
                      {isAuthenticated && historyId && (
                        <p className="mt-2 text-[0.65rem] text-white/45">
                          {historyIsSaved
                            ? text("ai.toast.savedStatus")
                            : text("ai.toast.temporaryStatus")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCompareMode(current => !current)}
                        disabled={!sourcePreview || isGenerating}
                        className={`flex items-center gap-2 border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${compareMode ? "border-[#a9ff44] bg-[#a9ff44]/15 text-[#a9ff44]" : "border-white/35 bg-black/55 text-white hover:border-[#a9ff44] hover:text-[#a9ff44]"}`}
                      >
                        {text("ai.action.compare")}
                      </button>
                      {isAuthenticated && historyId && (
                        <button
                          type="button"
                          onClick={() => void handleSavePreview()}
                          disabled={
                            historyIsSaved || historySaving || isGenerating
                          }
                          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${historyIsSaved ? "border border-[#a9ff44]/60 bg-[#a9ff44]/15 text-[#a9ff44]" : "bg-[#a9ff44] text-[#10130a] hover:bg-white"}`}
                        >
                          {historyIsSaved ? (
                            <BookmarkCheck size={14} />
                          ) : (
                            <Bookmark size={14} />
                          )}
                          {historySaving
                            ? text("ai.saveButton.saving")
                            : historyIsSaved
                              ? text("ai.saveButton.saved")
                              : text("ai.saveButton.default")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDownloadPreview}
                        disabled={isGenerating}
                        className="flex items-center gap-2 border border-white/35 bg-black/55 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:opacity-60"
                      >
                        <Download size={14} />
                        {text("ai.action.download")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          generatePreview.mutate(getGenerationInput())
                        }
                        disabled={isGenerating}
                        className="flex items-center gap-2 border border-white/25 bg-black/45 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:opacity-60"
                      >
                        <RefreshCcw size={14} />
                        {text("ai.action.regenerate")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(200px,0.55fr)]">
                    <div className="space-y-2">
                      {generatedColorMetrics && (
                        <p
                          className={`border-l-2 px-3 py-2 text-xs leading-5 ${generatedColorMetrics.status === "mismatch" ? "border-amber-300 bg-amber-300/12 text-amber-50" : "border-[#a9ff44] bg-black/35 text-white/78"}`}
                        >
                          {generatedColorMetrics.message}
                        </p>
                      )}
                      {generatedColorReview && (
                        <p
                          className={`border-l-2 px-3 py-2 text-xs leading-5 ${generatedColorReview.status === "mismatch" ? "border-amber-300 bg-amber-300/12 text-amber-50" : "border-[#a9ff44] bg-black/35 text-white/78"}`}
                        >
                          {generatedColorReview.message}
                        </p>
                      )}
                    </div>
                    {generatedMaterialReferenceUrl && (
                      <div className="border border-white/15 bg-black/25 p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={generatedMaterialReferenceUrl}
                            alt={`${generatedColorId} ${text("ai.output.materialCardLabel")}`}
                            className="h-20 w-28 shrink-0 object-cover"
                          />
                          <div>
                            <p className="text-[0.55rem] font-bold tracking-[0.12em] text-[#a9ff44]">
                              {text("ai.output.materialCardLabel")}
                            </p>
                            <p className="mt-1 text-[0.68rem] leading-5 text-white/72">
                              {text("ai.output.materialCardEnabled")}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/55">
                          {text("ai.output.materialCardHelp")}
                        </p>
                      </div>
                    )}
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
                  {text("ai.processing.title")}
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/53">
                  {text("ai.processing.description")}
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
                    {text("ai.output.placeholderLabel")}
                  </span>
                </div>
                <div>
                  <p className="font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.82] tracking-[-0.04em] text-white/16">
                    {text("ai.output.placeholderTitleLine1")}
                    <br />
                    {text("ai.output.placeholderTitleLine2")}
                    <br />
                    {text("ai.output.placeholderTitleLine3")}
                  </p>
                  <p className="mt-6 max-w-sm border-l border-[#a9ff44] pl-4 text-sm leading-6 text-white/58">
                    {text("ai.output.placeholderDescription")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {generatedPreview && (
          <p className="mt-4 border-l-2 border-[#a9ff44] bg-[#a9ff44]/8 px-3 py-2 text-xs leading-5 text-white/58">
            {text("ai.storageNotice")}
          </p>
        )}

        <div className="mt-5 flex gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-white/43">
          <Check size={15} className="mt-0.5 shrink-0 text-[#a9ff44]" />
          <p>{text("ai.disclaimer")}</p>
        </div>
      </div>
    </section>
  );
}
