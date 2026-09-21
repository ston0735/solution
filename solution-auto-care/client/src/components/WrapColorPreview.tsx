import { trpc } from "@/lib/trpc";
import { WRAP_COLOR_CATALOG, type WrapColor } from "@/data/wrapColorCatalog";
import { getWrapColorPresentation } from "@/lib/wrapColorPresentation";
import { Checkbox } from "@/components/ui/checkbox";
import { PARTIAL_WRAP_FINISHES, PARTIAL_WRAP_PART_LIST, PARTIAL_WRAP_PARTS, type PartialWrapCustomization, type PartialWrapFinish, type PartialWrapPartId } from "@shared/partialWrapOptions";
import { AlertTriangle, Check, ImagePlus, Layers3, LoaderCircle, RefreshCcw, WandSparkles, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_BYTES = 6 * 1024 * 1024;

function formatColorLabel(color: WrapColor) {
  const name = color.nameZh || color.name;
  return name ? `${color.code} · ${name}` : color.code;
}

export default function WrapColorPreview() {
  const fileInputId = useId();
  const categories = useMemo(() => Array.from(new Set(WRAP_COLOR_CATALOG.map(color => color.category))), []);
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? "");
  const [selectedCode, setSelectedCode] = useState(() => WRAP_COLOR_CATALOG[0]?.code ?? "");
  const [customColorId, setCustomColorId] = useState("");
  const [sourcePreview, setSourcePreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState("");
  const [generatedColorId, setGeneratedColorId] = useState("");
  const [generatedMaterialReferenceUrl, setGeneratedMaterialReferenceUrl] = useState("");
  const [generatedColorReview, setGeneratedColorReview] = useState<{ status: string; confidence: number; message: string } | null>(null);
  const [generatedColorMetrics, setGeneratedColorMetrics] = useState<{ status: string; message: string; hueDelta: number; mode: string } | null>(null);
  const [partialWrapSelections, setPartialWrapSelections] = useState<Partial<Record<PartialWrapPartId, PartialWrapFinish>>>({});
  const [generatedPartialWrapCustomizations, setGeneratedPartialWrapCustomizations] = useState<PartialWrapCustomization[]>([]);
  const [fileName, setFileName] = useState("");
  const [inputError, setInputError] = useState("");

  const colorsInCategory = useMemo(
    () => WRAP_COLOR_CATALOG.filter(color => color.category === selectedCategory),
    [selectedCategory],
  );
  const selectedColor = useMemo(
    () => WRAP_COLOR_CATALOG.find(color => color.code === selectedCode),
    [selectedCode],
  );
  const selectedColorPresentation = useMemo(
    () => selectedColor ? getWrapColorPresentation(selectedColor) : undefined,
    [selectedColor],
  );
  const targetColorId = customColorId.trim() || selectedColor?.code || "";
  const catalogColorContext = useMemo(
    () => customColorId.trim() || !selectedColor ? undefined : ({
      code: selectedColor.code,
      category: selectedColor.category,
      categoryEn: selectedColor.categoryEn,
      name: selectedColor.name,
      nameZh: selectedColor.nameZh,
      swatch: selectedColor.swatch,
    }),
    [customColorId, selectedColor],
  );

  const generatePreview = trpc.wrapPreview.generate.useMutation({
    onSuccess: result => {
      setGeneratedPreview(result.previewUrl);
      setGeneratedColorId(result.pantoneId);
      setGeneratedMaterialReferenceUrl(result.materialReferenceUrl ?? "");
      setGeneratedColorReview(result.colorReview);
      setGeneratedColorMetrics(result.colorMetrics ?? null);
      setGeneratedPartialWrapCustomizations(result.partialWrapCustomizations);
      toast.success("預覽已生成", { description: `${result.pantoneId} 的包膜概念預覽已完成。` });
    },
    onError: error => {
      setInputError(error.message);
      toast.error("無法生成預覽", { description: error.message });
    },
  });

  useEffect(() => () => {
    if (sourcePreview.startsWith("blob:")) URL.revokeObjectURL(sourcePreview);
  }, [sourcePreview]);

  const resetGeneratedPreview = () => {
    setGeneratedPreview("");
    setGeneratedColorId("");
    setGeneratedMaterialReferenceUrl("");
    setGeneratedColorReview(null);
    setGeneratedColorMetrics(null);
    setGeneratedPartialWrapCustomizations([]);
  };

  const partialWrapCustomizations = useMemo(
    () => PARTIAL_WRAP_PART_LIST.flatMap(part => {
      const finish = partialWrapSelections[part.id];
      return finish ? [{ part: part.id, finish }] : [];
    }),
    [partialWrapSelections],
  );

  const getGenerationInput = () => ({
    pantoneId: targetColorId,
    imageBase64,
    ...(catalogColorContext ? { catalogColor: catalogColorContext } : {}),
    ...(partialWrapCustomizations.length ? { partialWrapCustomizations } : {}),
  });

  const updatePartialWrapSelection = (part: PartialWrapPartId, checked: boolean) => {
    setPartialWrapSelections(current => {
      const next = { ...current };
      if (checked) next[part] = current[part] ?? "blackout";
      else delete next[part];
      return next;
    });
    resetGeneratedPreview();
  };

  const choosePartialWrapFinish = (part: PartialWrapPartId, finish: PartialWrapFinish) => {
    setPartialWrapSelections(current => ({ ...current, [part]: finish }));
    resetGeneratedPreview();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setInputError("");
    resetGeneratedPreview();
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_FILE_BYTES) {
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
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setSourcePreview("");
    setImageBase64("");
    setFileName("");
    setInputError("");
    resetGeneratedPreview();
    const input = document.getElementById(fileInputId) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleCategoryChange = (category: string) => {
    const firstColor = WRAP_COLOR_CATALOG.find(color => color.category === category);
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

  const isGenerating = generatePreview.isPending;

  return (
    <section id="wrap-preview" className="relative overflow-hidden border-y border-white/10 bg-[#151712] px-5 py-20 sm:px-8 lg:px-10 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_15%,rgba(169,255,68,0.11),transparent_29%),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,72px_72px,72px_72px]" />
      <div data-reveal className="relative mx-auto max-w-[1600px]">
        <div className="grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="eyebrow">WRAP COLOR LAB / 01</p>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">上傳實車照片，從 KSG 型錄選擇色系與色號，先在線上檢視改色包膜的概念方向。</p>
          </div>
          <div>
            <h2 className="font-display text-[clamp(3rem,6.6vw,7.45rem)] font-medium uppercase leading-[0.79] tracking-[-0.05em] text-[#f5f6f0]">COLOR,<br /><span className="text-[#a9ff44]">SIMULATED.</span></h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">線上客製化包膜車色預覽，讓你的愛車在正式施工前，先看見下一種表面狀態。</p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:gap-12">
          <form onSubmit={handleSubmit} className="border border-white/15 bg-black/20 p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/12 pb-4 text-[0.62rem] font-semibold tracking-[0.17em] text-white/46">
              <span>INPUT MODULE</span><span>01—02</span>
            </div>

            <div className="mt-7">
              <label htmlFor={fileInputId} className="mb-3 block text-xs font-bold tracking-[0.12em] text-white/86">01／上傳愛車照片</label>
              {!sourcePreview ? (
                <label htmlFor={fileInputId} className="group flex min-h-56 flex-col items-center justify-center border border-dashed border-white/25 bg-[#0d0e0b] px-6 text-center transition-colors hover:border-[#a9ff44] hover:bg-[#11150d]">
                  <ImagePlus size={26} strokeWidth={1.4} className="text-[#a9ff44]" />
                  <span className="mt-4 text-sm font-semibold text-white/90">選擇車輛照片</span>
                  <span className="mt-2 text-xs leading-5 text-white/45">JPG、PNG、WEBP・最大 6MB<br />建議使用日間、車身完整入鏡的照片</span>
                </label>
              ) : (
                <div className="relative overflow-hidden border border-white/20 bg-[#0d0e0b]">
                  <img src={sourcePreview} alt="待生成預覽的上傳愛車照片" className="h-64 w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/76 px-3 py-2 backdrop-blur-sm">
                    <span className="truncate text-xs text-white/72">{fileName}</span>
                    <button type="button" onClick={clearPhoto} disabled={isGenerating} className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/20 text-white transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]" aria-label="移除照片"><X size={14} /></button>
                  </div>
                </div>
              )}
              <input id={fileInputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="sr-only" disabled={isGenerating} />
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-4">
                <label htmlFor="wrap-color-code" className="text-xs font-bold tracking-[0.12em] text-white/86">02／型錄色卡色號</label>
                <span className="text-[0.6rem] font-semibold tracking-[0.13em] text-[#a9ff44]">{WRAP_COLOR_CATALOG.length} COLORS / KSG TPU</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[0.82fr_1.18fr]">
                <label className="sr-only" htmlFor="wrap-color-category">選擇色系</label>
                <select id="wrap-color-category" value={selectedCategory} onChange={event => handleCategoryChange(event.target.value)} disabled={isGenerating} className="h-14 min-w-0 border border-white/20 bg-[#0d0e0b] px-4 text-sm font-semibold text-white outline-none transition-colors focus:border-[#a9ff44] disabled:opacity-60">
                  {categories.map(category => <option key={category} value={category} className="bg-[#10110e] text-white">{category}・{WRAP_COLOR_CATALOG.filter(color => color.category === category).length} 色</option>)}
                </select>
                <label className="sr-only" htmlFor="wrap-color-code">選擇型錄色號</label>
                <select id="wrap-color-code" value={selectedCode} onChange={event => handleColorChange(event.target.value)} disabled={isGenerating} className="h-14 min-w-0 border border-white/20 bg-[#0d0e0b] px-4 text-sm tracking-[0.04em] text-white outline-none transition-colors focus:border-[#a9ff44] disabled:opacity-60">
                  {colorsInCategory.map(color => <option key={color.code} value={color.code} className="bg-[#10110e] text-white">{formatColorLabel(color)}</option>)}
                </select>
              </div>
              {selectedColor && selectedColorPresentation && (
                <div className="mt-3 flex items-center gap-3 border border-white/10 bg-black/20 px-3 py-3">
                  <span className="h-8 w-8 shrink-0 border border-white/20" style={{ backgroundColor: selectedColor.swatch }} aria-hidden="true" />
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold tracking-[0.08em] text-white">{selectedColor.code}</p><span className="border border-[#a9ff44]/35 px-1.5 py-0.5 text-[0.56rem] font-semibold tracking-[0.1em] text-[#a9ff44]">{selectedColorPresentation.category}</span></div><p className="mt-1 truncate text-xs text-white/48"><span className="mr-2 text-[0.56rem] font-semibold tracking-[0.1em] text-white/35">{selectedColorPresentation.descriptorLabel}</span>{selectedColorPresentation.descriptor}</p></div>
                </div>
              )}
              <p className="mt-3 text-xs leading-5 text-white/43">型錄已依紅色系、橙色系、黃色系等 15 個色系分組。選定色號後，系統會將 PDF 的實際材質色卡一併帶入 AI，讓預覽更貼近膜料色相與金屬／珠光質感。</p>
              <div className="mt-3 flex border border-white/15 bg-[#0d0e0b] focus-within:border-[#a9ff44]">
                <label htmlFor="custom-color-id" className="flex items-center border-r border-white/15 px-4 text-[0.6rem] font-semibold tracking-[0.12em] text-white/46">自訂</label>
                <input id="custom-color-id" value={customColorId} onChange={event => { setCustomColorId(event.target.value); resetGeneratedPreview(); }} placeholder="非型錄色號可在此輸入" maxLength={48} disabled={isGenerating} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm tracking-[0.06em] text-white outline-none placeholder:text-white/25" />
              </div>
            </div>

            <div className="mt-7 border-t border-white/12 pt-7">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold tracking-[0.12em] text-white/86">03／局部包膜客製化</p><p className="mt-2 text-xs leading-5 text-white/45">可複選零件；每項僅提供黑化或碳纖維兩種效果。</p></div>
                <Layers3 size={18} strokeWidth={1.4} className="shrink-0 text-[#a9ff44]" />
              </div>
              <div className="divide-y divide-white/10 border-y border-white/10">
                {PARTIAL_WRAP_PART_LIST.map(part => {
                  const selectedFinish = partialWrapSelections[part.id];
                  const isSelected = Boolean(selectedFinish);
                  return <div key={part.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,0.88fr)_minmax(220px,1.12fr)] sm:items-center">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-white/85">
                      <Checkbox checked={isSelected} onCheckedChange={checked => updatePartialWrapSelection(part.id, checked === true)} disabled={isGenerating} className="border-white/35 data-[state=checked]:border-[#a9ff44] data-[state=checked]:bg-[#a9ff44] data-[state=checked]:text-[#11130c]" />
                      {part.label}
                    </label>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${part.label} 材質選擇`}>
                      {(Object.entries(PARTIAL_WRAP_FINISHES) as Array<[PartialWrapFinish, typeof PARTIAL_WRAP_FINISHES[PartialWrapFinish]]>).map(([finish, detail]) => <button key={finish} type="button" disabled={!isSelected || isGenerating} aria-pressed={selectedFinish === finish} onClick={() => choosePartialWrapFinish(part.id, finish)} className={`min-h-10 border px-2 text-[0.65rem] font-bold tracking-[0.08em] transition-colors ${selectedFinish === finish ? "border-[#a9ff44] bg-[#a9ff44] text-[#11130c]" : "border-white/18 bg-black/20 text-white/55 hover:border-white/45 hover:text-white"} disabled:cursor-not-allowed disabled:opacity-35`}>{detail.label}</button>)}
                    </div>
                  </div>;
                })}
              </div>
              {partialWrapCustomizations.length > 0 && <p className="mt-3 flex gap-2 text-xs leading-5 text-white/58"><Check size={15} className="mt-0.5 shrink-0 text-[#a9ff44]" />已套用：{partialWrapCustomizations.map(item => `${PARTIAL_WRAP_PARTS[item.part].label}・${PARTIAL_WRAP_FINISHES[item.finish].label}`).join("、")}</p>}
            </div>

            {inputError && <p role="alert" className="mt-5 flex gap-2 border-l-2 border-[#a9ff44] bg-[#a9ff44]/8 px-3 py-2 text-xs leading-5 text-white/78"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#a9ff44]" />{inputError}</p>}

            <button type="submit" disabled={isGenerating} className="mt-7 flex w-full items-center justify-center gap-3 bg-[#a9ff44] px-5 py-4 text-xs font-bold tracking-[0.14em] text-[#11130c] transition-all hover:bg-white disabled:cursor-wait disabled:opacity-65 active:scale-[0.98]">
              {isGenerating ? <><LoaderCircle size={16} className="animate-spin" /> AI 正在生成包膜預覽</> : <><WandSparkles size={16} /> 生成車色預覽</>}
            </button>
          </form>

          <div className="relative min-h-[440px] overflow-hidden border border-white/15 bg-[#0b0b0a] sm:min-h-[560px]">
            {generatedPreview ? (
              <>
                <img src={generatedPreview} alt={`以 ${generatedColorId} 為目標色號的 AI 車色包膜概念預覽`} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 bg-[linear-gradient(0deg,rgba(0,0,0,0.94),transparent)] px-5 pb-5 pt-20 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#a9ff44]">CONCEPT PREVIEW GENERATED</p><p className="mt-2 text-sm text-white/80">目標色號：{generatedColorId}</p></div>
                  <button type="button" onClick={() => generatePreview.mutate(getGenerationInput())} disabled={isGenerating} className="flex items-center gap-2 self-start border border-white/25 bg-black/45 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:opacity-60 sm:self-auto"><RefreshCcw size={14} />重新生成</button>
                </div>
                {generatedPartialWrapCustomizations.length > 0 && <p className="absolute left-5 top-5 max-w-[calc(100%-2.5rem)] border-l-2 border-[#a9ff44] bg-black/55 px-3 py-2 text-[0.62rem] font-semibold leading-5 tracking-[0.06em] text-white/86 backdrop-blur-sm">PARTIAL WRAP ／ {generatedPartialWrapCustomizations.map(item => `${PARTIAL_WRAP_PARTS[item.part].label}・${PARTIAL_WRAP_FINISHES[item.finish].label}`).join("  |  ")}</p>}
                {generatedMaterialReferenceUrl && <div className="absolute right-5 top-5 max-w-[calc(100%-2.5rem)] border border-white/20 bg-black/65 p-2 backdrop-blur-sm"><div className="flex items-center gap-2"><img src={generatedMaterialReferenceUrl} alt={`${generatedColorId} 的 PDF 原始材質色卡`} className="h-11 w-16 shrink-0 object-cover" /><div><p className="text-[0.55rem] font-bold tracking-[0.12em] text-[#a9ff44]">PDF MATERIAL CARD</p><p className="mt-1 text-[0.65rem] text-white/78">實體色卡參考已啟用</p></div></div><p className="mt-2 max-w-[205px] border-t border-white/10 pt-2 text-[0.58rem] leading-4 text-white/58">請先比對色卡與車身主色；如明顯偏離，可按下方「重新生成」再次以同一色卡校正。</p></div>}
                <div className="absolute bottom-20 left-5 max-w-[min(420px,calc(100%-2.5rem))] space-y-2">
                  {generatedColorMetrics && <p className={`border-l-2 px-3 py-2 text-xs leading-5 backdrop-blur-sm ${generatedColorMetrics.status === "mismatch" ? "border-amber-300 bg-amber-300/12 text-amber-50" : "border-[#a9ff44] bg-black/55 text-white/78"}`}>{generatedColorMetrics.message}</p>}
                  {generatedColorReview && <p className={`border-l-2 px-3 py-2 text-xs leading-5 backdrop-blur-sm ${generatedColorReview.status === "mismatch" ? "border-amber-300 bg-amber-300/12 text-amber-50" : "border-[#a9ff44] bg-black/55 text-white/78"}`}>{generatedColorReview.message}</p>}
                </div>
              </>
            ) : isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                <div className="relative flex h-28 w-28 items-center justify-center border border-[#a9ff44]/40"><LoaderCircle size={28} className="animate-spin text-[#a9ff44]" /><span className="absolute inset-2 border border-white/10" /></div>
                <p className="font-display mt-7 text-3xl tracking-[0.04em] text-white">PROCESSING SURFACE</p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/53">AI 正在保留你的車型與拍攝角度，並重建指定型錄色號的包膜材質與車漆反光。</p>
                <div className="mt-7 h-px w-full max-w-xs overflow-hidden bg-white/12"><span className="block h-full w-1/2 bg-[#a9ff44] motion-safe:animate-[scan_1.4s_ease-in-out_infinite]" /></div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                <div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center border border-[#a9ff44]/50 text-[#a9ff44]"><WandSparkles size={18} strokeWidth={1.4} /></span><span className="text-[0.58rem] font-semibold tracking-[0.18em] text-white/38">OUTPUT PREVIEW</span></div>
                <div><p className="font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.82] tracking-[-0.04em] text-white/16">YOUR<br />NEXT<br />FINISH.</p><p className="mt-6 max-w-sm border-l border-[#a9ff44] pl-4 text-sm leading-6 text-white/58">上傳照片並從型錄選擇色號後，這裡會顯示專屬於你車輛的改色包膜概念預覽。</p></div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-white/43"><Check size={15} className="mt-0.5 shrink-0 text-[#a9ff44]" /><p>此功能提供 AI 視覺概念預覽，型錄色號與螢幕呈現會受影像光線影響；實際施工前，仍應以實體包膜色樣與店內確認結果為準。</p></div>
      </div>
    </section>
  );
}
