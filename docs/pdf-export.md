# PDF Export

dvfc supports exporting dashboards to PDF for reports and documentation.

## Export Paths

dvfc provides **three ways** to generate PDFs, in order of recommendation:

### 1. Browser Print (Recommended - No Dependencies)

**Best for:** Production use, no extra dependencies

```bash
# Build optimized HTML
dvfc build board.yaml -o dist

# Open in browser and print
open dist/index.html
# → File > Print > Save as PDF
```

**Advantages:**
- ✅ No dependencies (Playwright not needed)
- ✅ Native browser PDF engine (high quality)
- ✅ Print CSS optimizations included
- ✅ Works with any browser

### 2. Automated with Playwright (Optional)

**Best for:** CI/CD, batch generation, automation

```bash
# Install playwright (optional peer dependency)
npm install -D playwright
npx playwright install chromium

# Automated export
dvfc export-pdf board.yaml -o dashboard.pdf
```

**Advantages:**
- ✅ Fully automated (no manual steps)
- ✅ Headless rendering
- ✅ Good for CI/CD pipelines

**Disadvantages:**
- ⚠️ Large dependency (~200MB)
- ⚠️ Requires Playwright installation

### 3. Typst Integration (Non-Chromium Alternative)

**Best for:** Programmable documents, custom layouts

Typst is a modern typesetting system (alternative to LaTeX):

```bash
# Build dashboard HTML
dvfc build board.yaml -o dist

# Create Typst document
cat > report.typ << 'EOF'
#set page(margin: 1in)
#set text(font: "Arial", size: 11pt)

= Revenue Analysis Report

Generated: #datetime.today().display()

#image("screenshot.png", width: 100%)

== Key Metrics
// Embed data or static exports
EOF

# Take screenshot of dashboard for inclusion
# (requires playwright or manual screenshot)

# Compile with Typst
typst compile report.typ report.pdf
```

**Advantages:**
- ✅ No Chromium dependency
- ✅ Scriptable document layout
- ✅ Smaller footprint than Playwright
- ✅ High-quality typography

See: https://typst.app/

---

## CLI Command

```bash
dvfc export-pdf <spec> [options]

Arguments:
  spec                  Path to dashboard spec (YAML or JSON)

Options:
  -o, --out-file <file> Output PDF file (default: "dashboard.pdf")
  --no-browser          Skip Playwright, print instructions for manual export
  -h, --help           Display help
```

**Examples:**

```bash
# Automated (requires Playwright)
dvfc export-pdf board.yaml -o report.pdf

# Manual flow (no Playwright needed)
dvfc export-pdf board.yaml --no-browser
# → Prints instructions for browser print

# Just build HTML, print yourself
dvfc build board.yaml -o dist
open dist/index.html
```

## How It Works

1. **Build**: Creates optimized HTML/JS bundle
2. **Render**: Opens dashboard in headless Chromium (via Playwright)
3. **Export**: Generates PDF with print styles applied

### Print Styles

The generated HTML includes print-optimized CSS:

```css
@media print {
  /* Remove interactive UI */
  #status { display: none; }
  .info-box { display: none; }
  
  /* Optimize layout */
  body { margin: 0; padding: 20px; }
  .chart-container { page-break-inside: avoid; }
  
  /* Ensure colors print */
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

**Default PDF settings:**
- A4 paper size (210mm × 297mm)
- 20px margins
- Background graphics enabled
- Charts optimized for print
- Grid/flex layouts preserved

**Browser-specific settings:**

Chrome/Edge:
- File > Print
- Destination: Save as PDF
- ☑ Background graphics

Firefox:
- File > Print
- Destination: Save to PDF
- ☑ Print backgrounds

Safari:
- File > Export as PDF (better than Print)
- Or: File > Print > Save as PDF

## Peer Dependency: Playwright

Playwright is an **optional** peer dependency. dvfc works without it, but you won't get automated PDF generation.

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

The Python SDK also supports PDF export via the CLI:

```python
from dvfc import DataVizFactoryClient

client = DataVizFactoryClient()
spec = client.load("board.yaml")

# Build HTML
html_path = client.build(spec, out_dir="dist")

# Then use dvfc CLI for PDF
# dvfc export-pdf board.yaml -o report.pdf

# Or open dist/index.html in browser and print manually
print(f"Open {html_path} and use File > Print > Save as PDF")
```

**Note:** Python SDK calls the dvfc CLI under the hood, so Playwright is still optional.

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
dvfc export-svg board.yaml --chart daily_sales -o chart.svg
```

*(Not yet implemented)*

### Typst Integration (Future)

For programmable document generation, consider:
- Build dvfc dashboard HTML
- Embed in Typst document with `#link()` or screenshot
- Compile Typst to PDF

## Constraints

As specified in the architecture:
- **No Chromium in core** - Playwright is peer/optional only
- **No bundled PDF libs** - We use browser's native PDF engine
- **Print path only** - No custom PDF rendering

This keeps dvfc lightweight while still supporting PDF output when needed.
