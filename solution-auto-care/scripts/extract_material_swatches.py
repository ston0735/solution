from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageEnhance


PROJECT = Path("/home/ubuntu/solution-auto-care")
CATALOG_PDF = Path("/home/ubuntu/upload/20260804改色色卡全.pdf")
CATALOG_TS = PROJECT / "client/src/data/wrapColorCatalog.ts"
OUTPUT_DIR = Path("/home/ubuntu/webdev-static-assets/solution-color-card-references")


def load_catalog() -> list[dict[str, object]]:
    content = CATALOG_TS.read_text(encoding="utf-8")
    prefix = "export const WRAP_COLOR_CATALOG: WrapColor[] = "
    body = content.split(prefix, 1)[1].split(";\n\nexport const WRAP_COLOR_CATEGORY_COUNTS", 1)[0]
    return json.loads(body)


def render_page(page: int, output_path: Path) -> None:
    subprocess.run(
        [
            "pdftoppm",
            "-f", str(page),
            "-l", str(page),
            "-r", "100",
            "-jpeg",
            "-jpegopt", "quality=90",
            "-singlefile",
            str(CATALOG_PDF),
            str(output_path.with_suffix("")),
        ],
        check=True,
        capture_output=True,
    )


def extract_material_sample(source: Path, destination: Path) -> None:
    with Image.open(source).convert("RGB") as image:
        width, height = image.size
        # Keep a broad, text-free central material field. This removes binder notches,
        # the KSG logo, and the printed color name while preserving the film texture.
        crop = image.crop((int(width * 0.16), int(height * 0.15), int(width * 0.78), int(height * 0.78)))
        crop = crop.resize((520, 360), Image.Resampling.LANCZOS)
        crop = ImageEnhance.Color(crop).enhance(1.03)
        crop.save(destination, "JPEG", quality=88, optimize=True, progressive=True)


def main() -> None:
    entries = load_catalog()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, object]] = {}

    with tempfile.TemporaryDirectory(prefix="solution-color-card-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        for index, entry in enumerate(entries, start=1):
            code = str(entry["code"])
            page = int(entry["page"])
            rendered = temp_dir / f"page-{page:03d}.jpg"
            output = OUTPUT_DIR / f"{code}.jpg"
            render_page(page, rendered)
            extract_material_sample(rendered, output)
            manifest[code] = {
                "file": output.name,
                "category": entry["category"],
                "page": page,
                "swatch": entry["swatch"],
            }
            print(f"[{index}/{len(entries)}] {code} page {page}")

    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"created {len(manifest)} material references in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
