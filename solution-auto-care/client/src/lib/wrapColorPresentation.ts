import type { WrapColor } from "@/data/wrapColorCatalog";

export function getWrapColorPresentation(color: WrapColor) {
  const name = color.nameZh || color.name;

  return {
    category: color.category,
    descriptorLabel: name ? "色卡名稱" : "型錄註記",
    descriptor: name || "此 PDF 色卡未標註正式色名",
  };
}
