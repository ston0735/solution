from __future__ import annotations

import json
from pathlib import Path


PROJECT = Path("/home/ubuntu/solution-auto-care")
BY_PAGE_PATH = PROJECT / "tmp/catalog-colors-by-page.json"
ANALYSIS_PATH = PROJECT / "tmp/catalog-page-analysis.json"
RECOVERY_PATH = Path("/home/ubuntu/recover_catalog_color_codes.json")
OUTPUT_PATH = PROJECT / "client/src/data/wrapColorCatalog.ts"


def page_from_input(value: str) -> int:
    name = Path(value).stem
    return int(name.split("-")[-1])


def sanitize_name(value: str) -> str:
    return "" if value == "UNREADABLE" else value


def main() -> None:
    by_page = json.loads(BY_PAGE_PATH.read_text(encoding="utf-8"))
    analysis = {row["page"]: row for row in json.loads(ANALYSIS_PATH.read_text(encoding="utf-8"))}
    recovery_results = json.loads(RECOVERY_PATH.read_text(encoding="utf-8"))["results"]
    recovered = {
        page_from_input(item["input"]): item["output"]
        for item in recovery_results
        if item.get("output") and item["output"].get("color_code") != "UNREADABLE"
    }

    entries: list[dict] = []
    for row in by_page:
        page = row["page"]
        fallback = recovered.get(page, {})
        code = row["code"] or fallback.get("color_code", "")
        if not code:
            raise ValueError(f"Missing color code for page {page}")
        rgb = analysis[page]["average_rgb"]
        entries.append(
            {
                "code": code,
                "category": row["category"],
                "categoryEn": row["category_en"],
                "name": sanitize_name(fallback.get("english_name", "")),
                "nameZh": sanitize_name(fallback.get("chinese_name", "")),
                "swatch": "#%02x%02x%02x" % tuple(rgb),
                "page": page,
            }
        )

    counts: dict[str, int] = {}
    for entry in entries:
        counts[entry["category"]] = counts.get(entry["category"], 0) + 1

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    output = """/**
 * 由使用者提供的「20260804改色色卡全.pdf」整理而成。
 * 色號依 PDF 的分類扉頁分組；swatch 來自對應色卡頁的近似主色，僅用於 UI 識別。
 */
export type WrapColor = {
  code: string;
  category: string;
  categoryEn: string;
  name: string;
  nameZh: string;
  swatch: string;
  page: number;
};

export const WRAP_COLOR_CATALOG: WrapColor[] = """ + json.dumps(entries, ensure_ascii=False, indent=2) + ";\n\n" + "export const WRAP_COLOR_CATEGORY_COUNTS: Record<string, number> = " + json.dumps(counts, ensure_ascii=False, indent=2) + ";\n"
    OUTPUT_PATH.write_text(output, encoding="utf-8")
    print(f"wrote {len(entries)} entries across {len(counts)} categories")
    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
