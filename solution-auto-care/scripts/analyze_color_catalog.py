from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat


PROJECT = Path("/home/ubuntu/solution-auto-care")
OCR_PATH = PROJECT / "tmp/20260804-color-catalog-ocr.txt"
PAGES_DIR = PROJECT / "tmp/catalog-pages"
OUTPUT_JSON = PROJECT / "tmp/catalog-page-analysis.json"
CONTACT_DIR = PROJECT / "tmp/catalog-contacts"

PAGE_SPLIT = re.compile(r"===== PAGE (\d{3}) =====")
CODE_RE = re.compile(r"\b(?:K|S|G)[A-Z]{1,3}\d{2,4}[A-Z]?\b")


def parse_pages() -> dict[int, str]:
    raw = OCR_PATH.read_text(encoding="utf-8", errors="ignore")
    matches = list(PAGE_SPLIT.finditer(raw))
    pages: dict[int, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
        pages[int(match.group(1))] = raw[match.end() : end].strip()
    return pages


def average_rgb(image_path: Path) -> list[int]:
    with Image.open(image_path).convert("RGB") as source:
        width, height = source.size
        # Avoid the left-side binder and right-bottom colour label when estimating the swatch surface.
        crop = source.crop((int(width * 0.14), int(height * 0.12), int(width * 0.78), int(height * 0.75)))
        sample = crop.resize((1, 1))
        return list(sample.getpixel((0, 0)))


def create_contacts(records: list[dict]) -> None:
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    for first in range(1, 201, 50):
        subset = records[first - 1 : first + 49]
        tile_width, tile_height = 225, 175
        columns, rows = 5, 10
        canvas = Image.new("RGB", (columns * tile_width, rows * tile_height), "#151515")
        draw = ImageDraw.Draw(canvas)
        for position, record in enumerate(subset):
            row, col = divmod(position, columns)
            image_path = PAGES_DIR / f"page-{record['page']:03d}.jpg"
            with Image.open(image_path).convert("RGB") as image:
                image.thumbnail((tile_width - 12, tile_height - 34))
                x = col * tile_width + 6
                y = row * tile_height + 22
                canvas.paste(image, (x, y))
            label = f"P{record['page']:03d} {','.join(record['codes']) or '-'}"
            draw.text((col * tile_width + 6, row * tile_height + 5), label, fill="#f5f5f5", font=font)
        canvas.save(CONTACT_DIR / f"contact-{first:03d}-{first + 49:03d}.jpg", quality=88)


def main() -> None:
    pages = parse_pages()
    records: list[dict] = []
    for page in range(1, 201):
        text = pages.get(page, "")
        image_path = PAGES_DIR / f"page-{page:03d}.jpg"
        records.append(
            {
                "page": page,
                "codes": sorted(set(CODE_RE.findall(text))),
                "ocr_lines": [line.strip() for line in text.splitlines() if line.strip()][:50],
                "average_rgb": average_rgb(image_path),
            }
        )
    OUTPUT_JSON.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    create_contacts(records)


if __name__ == "__main__":
    main()
