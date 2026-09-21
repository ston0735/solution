from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


PROJECT = Path("/home/ubuntu/solution-auto-care")
PAGES_DIR = PROJECT / "tmp/catalog-pages"
ANALYSIS_PATH = PROJECT / "tmp/catalog-page-analysis.json"
OUTPUT_PATH = PROJECT / "tmp/catalog-colors-by-page.json"
CROP_DIR = PROJECT / "tmp/catalog-code-crops"

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


def codes_from(text: str) -> list[str]:
    return list(dict.fromkeys(CODE_RE.findall(text.upper().replace(" ", ""))))


def crop_code(page: int) -> list[str]:
    image_path = PAGES_DIR / f"page-{page:03d}.jpg"
    with Image.open(image_path).convert("RGB") as image:
        width, height = image.size
        crop = image.crop((int(width * 0.60), int(height * 0.60), int(width * 0.995), int(height * 0.975)))
        crop = crop.resize((crop.width * 2, crop.height * 2))
        crop = ImageOps.autocontrast(ImageOps.grayscale(crop))
        crop = ImageEnhance.Contrast(crop).enhance(2.8)
        crop = crop.filter(ImageFilter.SHARPEN)
        destination = CROP_DIR / f"code-{page:03d}.png"
        crop.save(destination)
    result = subprocess.run(
        ["tesseract", str(destination), "stdout", "-l", "eng", "--psm", "11"],
        capture_output=True,
        text=True,
        check=False,
    )
    return codes_from(result.stdout)


def main() -> None:
    CROP_DIR.mkdir(parents=True, exist_ok=True)
    fallback = {row["page"]: row["codes"] for row in json.loads(ANALYSIS_PATH.read_text(encoding="utf-8"))}
    rows: list[dict[str, str | int]] = []
    for category, category_en, start, end in GROUPS:
        for page in range(start, end + 1):
            detected = fallback.get(page, [])
            source = "full-page-ocr"
            if not detected:
                detected = crop_code(page)
                source = "label-crop-ocr" if detected else "unread"
            rows.append(
                {
                    "page": page,
                    "category": category,
                    "category_en": category_en,
                    "code": detected[0] if detected else "",
                    "all_codes": ", ".join(detected),
                    "source": source,
                }
            )
    OUTPUT_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    missing = [row["page"] for row in rows if not row["code"]]
    print(f"cards={len(rows)} codes={len(rows) - len(missing)} missing={missing}")
    for row in rows:
        print(f"{row['page']:03d}\t{row['category']}\t{row['code']}\t{row['source']}")


if __name__ == "__main__":
    main()
