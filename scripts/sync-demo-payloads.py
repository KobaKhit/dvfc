#!/usr/bin/env python3
"""Sync the live-demo spec payloads in site-src/index.html from the
examples/site-gallery/landing.* mirror files.

The YAML/TOML/JSON panes show the exact file contents. The Python pane shows
the builder portion of landing_dash.py (shebang, docstring, and __main__
boilerplate stripped).
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GALLERY = ROOT / "examples" / "site-gallery"
INDEX = ROOT / "site-src" / "index.html"


def python_payload() -> str:
    text = (GALLERY / "landing_dash.py").read_text()
    lines = text.splitlines()
    # Drop shebang + module docstring (first two lines).
    if lines and lines[0].startswith("#!"):
        lines = lines[1:]
    if lines and lines[0].startswith('"""'):
        lines = lines[1:]
    # Drop trailing __main__ block.
    cut = next(
        (i for i, line in enumerate(lines) if line.startswith('if __name__ == "__main__"')),
        len(lines),
    )
    lines = lines[:cut]
    # Trim leading/trailing blank lines.
    while lines and not lines[0].strip():
        lines = lines[1:]
    while lines and not lines[-1].strip():
        lines = lines[:-1]
    return "\n".join(lines) + "\n"


def main() -> None:
    payloads = {
        "yaml": (GALLERY / "landing.dash.yaml").read_text(),
        "toml": (GALLERY / "landing.dash.toml").read_text(),
        "json": (GALLERY / "landing.dash.json").read_text(),
        "python": python_payload(),
    }
    block = json.dumps(payloads, indent=2, ensure_ascii=False)
    html = INDEX.read_text()
    pattern = re.compile(
        r'(<script type="application/json" id="spec-payloads">\n).*?(\n  </script>)',
        re.DOTALL,
    )
    if not pattern.search(html):
        sys.exit("spec-payloads block not found in site-src/index.html")
    INDEX.write_text(pattern.sub(lambda m: m.group(1) + block + m.group(2), html, count=1))
    print(f"synced payloads: { {k: len(v.splitlines()) for k, v in payloads.items()} }")


if __name__ == "__main__":
    main()
