from __future__ import annotations

import re
from pathlib import Path


PROJECT = Path("/home/ubuntu/solution-auto-care")
UPLOAD_LOG = PROJECT / "material-swatch-upload-urls.txt"
OUTPUT = PROJECT / "shared/wrapColorReferenceKeys.ts"


def main() -> None:
    pattern = re.compile(r"solution-color-card-references/([A-Z0-9]+)\.jpg -> /manus-storage/([^\s]+)")
    entries: dict[str, str] = {}
    for code, stored_file in pattern.findall(UPLOAD_LOG.read_text(encoding="utf-8")):
        entries[code] = stored_file

    if len(entries) != 184:
        raise SystemExit(f"Expected 184 uploaded color references, found {len(entries)}")

    lines = [
        "/**",
        " * Generated from the owner-provided KSG color catalog PDF.",
        " * Values are S3 object keys for the cropped physical material samples.",
        " */",
        "export const WRAP_COLOR_REFERENCE_KEYS: Record<string, string> = {",
    ]
    lines.extend(f'  "{code}": "{entries[code]}",' for code in sorted(entries))
    lines.extend(["};", ""])
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(entries)} color reference keys to {OUTPUT}")


if __name__ == "__main__":
    main()
