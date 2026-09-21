from __future__ import annotations

import csv
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


PROJECT = Path("/home/ubuntu/solution-auto-care")
PAGES_DIR = PROJECT / "tmp/catalog-pages"
PAGE_ANALYSIS = PROJECT / "tmp/catalog-page-analysis.json"
OUTPUT_CSV = PROJECT / "tmp/catalog-colors-raw.csv"
OUTPUT_JSON = PROJECT / "tmp/catalog-colors-raw.json"
CROP_DIR = PROJECT / "tmp/catalog-label-crops"

GROUPS = [
    ("紅色系", "Red", 3, 12),
    ("橙色系", "Orange", 14, 19),
    ("黃色系", "Yellow", 21, 26),
    ("綠色系", "Green", 28, 60),
    ("藍色系", "Blue", 62, 84),
    ("紫色系", "Purple", 86, 98),
    ("白色系", "White", 100, 108),
    ("灰色系", "Grey", 110, 137),
    ("黑色系", "Black", 139, 153),
    ("金色系", "Gold", 155, 161),
    ("銀色系", "Silver", 163, 175),
    ("粉色系", "Pink", 177, 188),
    ("古銅色系", "Bronze", 190, 191),
    ("鈦鋼色系", "Titanium", 193, 197),
    ("碳纖維系列", "Carbon Fiber", 199, 200),
]

CODE_RE = re.compile(r"\b(?:[KSG][A-Z]{1,3}\d{2,4}[A-Z]?)\b")
NOISE = {"KSG", "TPU", "PPF", "MADE", "WITH", "ALL", "COLOR", "FILM"}


def clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip(" ·|—-_")


def ocr_label(page: int) -> list[str]:
    image_path = PAGES_DIR / f"page-{page:03d}.jpg"
    with Image.open(image_path).convert("RGB") as image:
        width, height = image.size
        # The printed code and names consistently sit in the lower-right quadrant.
        crop = image.crop((int(width * 0.58), int(height * 0.52), int(width * 0.99), int(height * 0.97)))
        crop = crop.resize((crop.width * 3, crop.height * 3))
        crop = ImageEnhance.Contrast(crop).enhance(2.4)
        crop = ImageEnhance.Sharpness(crop).enhance(2)
        crop = crop.filter(ImageFilter.SHARPEN)
        output_crop = CROP_DIR / f"label-{page:03d}.png"
        crop.save(output_crop)

    attempts: list[str] = []
    for source in (output_crop,):
        for psm in (6, 11):
            result = subprocess.run(
                ["tesseract", str(source), "stdout", "-l", "eng+chi_tra", "--psm", str(psm)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.stdout.strip():
                attempts.extend(clean_line(line) for line in result.stdout.splitlines() if clean_line(line))
    return list(dict.fromkeys(attempts))


def pick_code(lines: list[str], fallback_codes: list[str]) -> str:
    candidates = []
    for line in lines:
        candidates.extend(CODE_RE.findall(line.upper().replace(" ", "")))
    candidates.extend(fallback_codes)
    return candidates[0] if candidates else ""


def pick_name(lines: list[str], code: str) -> str:
    usable: list[str] = []
    for line in lines:
        normalized = clean_line(line)
        caps = normalized.upper()
        if not normalized or code in normalized.replace(" ", "") or caps in NOISE:
            continue
        if re.fullmatch(r"(?:TPU|PPF|KSG|[\W\d_]+)", caps):
            continue
        if any(marker in caps for marker in ("TPU", "PPF", "KSG")) and len(normalized) < 18:
            continue
        usable.append(normalized)
    return " / ".join(usable[:3])


def main() -> None:
    CROP_DIR.mkdir(parents=True, exist_ok=True)
    fallback = {item["page"]: item["codes"] for item in json.loads(PAGE_ANALYSIS.read_text(encoding="utf-8"))}
    rows: list[dict[str, str | int]] = []
    for category, english_category, start, end in GROUPS:
        for page in range(start, end + 1):
            lines = ocr_label(page)
            code = pick_code(lines, fallback.get(page, []))
            rows.append(
                {
                    "page": page,
                    "category": category,
                    "category_en": english_category,
                    "code": code,
                    "name_ocr": pick_name(lines, code),
                    "ocr_lines": " | ".join(lines),
                }
            )

    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    OUTPUT_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    missing = [row["page"] for row in rows if not row["code"]]
    print(f"total color cards: {len(rows)}")
    print(f"recognized codes: {len(rows) - len(missing)}")
    print(f"missing code pages: {missing}")
    for row in rows:
        print(f"{row['page']:03d}\t{row['category']}\t{row['code']}\t{row['name_ocr']}")


if __name__ == "__main__":
    main()
