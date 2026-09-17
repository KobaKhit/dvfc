# PDF Export

coordboard supports exporting dashboards to PDF for reports and documentation.

## Quick Start

### Automated PDF Generation (with Playwright)

```bash
# Install playwright (optional peer dependency)
npm install -D playwright
npx playwright install chromium

# Export to PDF
coordboard export-pdf board.yaml -o dashboard.pdf
```

### Manual Print-to-PDF

```bash
# Build HTML first
coordboard build board.yaml -o dist

# Then:
# 1. Open dist/index.html in your browser
# 2. Press Ctrl+P (Cmd+P on Mac)
# 3. Select "Save as PDF" as destination
# 4. Click Save
```

Or let the CLI guide you:

```bash
coordboard export-pdf board.yaml --no-browser
```

## CLI Options

```bash
coordboard export-pdf <spec> [options]

Arguments:
  spec                  Path to dashboard spec (YAML or JSON)

Options:
  -o, --out-file <file> Output PDF file (default: "dashboard.pdf")
  --no-browser          Skip automated generation, print instructions only
  -h, --help           Display help
```

## How It Works

1. **Build**: Creates optimized HTML/JS bundle
2. **Render**: Opens dashboard in headless Chromium (via Playwright)
3. **Export**: Generates PDF with print styles applied

### Print Styles

The exported PDF includes:
- A4 format by default
- 20px margins
- Print background graphics enabled
- Hidden interactive elements (if any)

## Peer Dependency: Playwright

Playwright is an **optional** peer dependency. coordboard works without it, but you won't get automated PDF generation.

**Why optional?**
- Playwright is large (~200MB with browser binaries)
- Not everyone needs PDF export
- Manual print-to-PDF from browser is always available

**To install:**

```bash
npm install -D playwright
npx playwright install chromium
```

Or via pnpm:

```bash
pnpm add -D playwright
pnpm exec playwright install chromium
```

## Python SDK Support

The Python SDK also supports PDF export:

```python
from coordboard import CoordboardClient

client = CoordboardClient()
spec = client.load("board.yaml")

# Build HTML first
html_path = client.build(spec, out_dir="dist")

# Then use coordboard CLI or manual browser print
```

## Troubleshooting

### "Playwright not found"

Install playwright: `npm install -D playwright`

### "Browser not found"

Run: `npx playwright install chromium`

### Large file size

- Use `--minify` on build for smaller HTML
- Charts render as SVG (already optimized)
- DuckDB WASM is ~6MB but loads data client-side

### Blank PDF

- Ensure dashboard renders correctly in browser first
- Try increasing `waitUntil` timeout (modify source if needed)
- Check browser console for errors

## Alternatives

### SVG Export (Coming Soon)

Individual charts can be exported as SVG for inclusion in other documents:

```bash
coordboard export-svg board.yaml --chart daily_sales -o chart.svg
```

*(Not yet implemented)*

### Typst Integration (Future)

For programmable document generation, consider:
- Build coordboard dashboard HTML
- Embed in Typst document with `#link()` or screenshot
- Compile Typst to PDF

## Constraints

As specified in the architecture:
- **No Chromium in core** - Playwright is peer/optional only
- **No bundled PDF libs** - We use browser's native PDF engine
- **Print path only** - No custom PDF rendering

This keeps coordboard lightweight while still supporting PDF output when needed.
