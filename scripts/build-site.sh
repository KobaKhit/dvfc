#!/usr/bin/env bash
#
# Build GitHub Pages site at /dvfc/ base path
# Uses dvfc CLI for interactive examples; chart pages emit SVG thumbnails.
#

set -euo pipefail

export NODE_NO_WARNINGS=1

echo "Building GitHub Pages Site"
echo "=========================="
echo

BASE_URL="/dvfc"
SITE_DIR="site"
CLI="node packages/cli/dist/cli.js"
PREVIEWS="$SITE_DIR/assets/previews"

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR" "$PREVIEWS"

echo "Building interactive examples..."
echo

examples=(
  "sales-dash"
  "web-analytics"
  "dbt-jaffle"
  "revenue-analysis"
)

for example in "${examples[@]}"; do
  spec_file=""
  for f in examples/$example/*.dash.yaml; do
    if [ -f "$f" ]; then spec_file="$f"; break; fi
  done

  if [ -z "$spec_file" ]; then
    echo "  Skipping $example (no *.dash.yaml)"
    continue
  fi

  out_dir="$SITE_DIR/examples/$example"
  base_path="$BASE_URL/examples/$example/"

  rm -rf .dvfc-build

  echo "  Building $example → $out_dir"
  $CLI build "$spec_file" -o "$out_dir" --base "$base_path"

  if [ ! -d "$out_dir/data" ]; then
    echo "  ERROR: $out_dir/data not created"
    exit 1
  fi

  echo "  OK $example"
done

echo "  Building compact landing showcase → $SITE_DIR/examples/landing"
rm -rf .dvfc-build
$CLI build examples/site-gallery/landing.dash.yaml \
  -o "$SITE_DIR/examples/landing" \
  --base "$BASE_URL/examples/landing/" >/dev/null
echo "  OK landing"

echo "  Building dc.js landing → $SITE_DIR/examples/landing-dc"
rm -rf .dvfc-build
mkdir -p "$SITE_DIR/examples/landing-dc"
$CLI build examples/site-gallery/landing.dash.yaml \
  -o "$SITE_DIR/examples/landing-dc/index.html" \
  --format html-dc-static >/dev/null
rm -rf "$SITE_DIR/examples/landing-dc/.dvfc-dc-data"
echo "  OK landing-dc"

echo "  Building Vega-Lite landing → $SITE_DIR/examples/landing-vega"
rm -rf .dvfc-build
mkdir -p "$SITE_DIR/examples/landing-vega"
$CLI build examples/site-gallery/landing.dash.yaml \
  -o "$SITE_DIR/examples/landing-vega/index.html" \
  --format html-static >/dev/null
rm -rf "$SITE_DIR/examples/landing-vega/.dvfc-export-data"
echo "  OK landing-vega"

echo "  Building full showcase → $SITE_DIR/examples/showcase"
rm -rf .dvfc-build
$CLI build examples/site-gallery/showcase.dash.yaml \
  -o "$SITE_DIR/examples/showcase" \
  --base "$BASE_URL/examples/showcase/" >/dev/null
echo "  OK showcase"

echo "  Building dc.js static showcase → $SITE_DIR/examples/showcase-dc"
rm -rf .dvfc-build
mkdir -p "$SITE_DIR/examples/showcase-dc"
$CLI build examples/site-gallery/showcase.dash.yaml \
  -o "$SITE_DIR/examples/showcase-dc/index.html" \
  --format html-dc-static >/dev/null
# Staging CSV dir is only for the exporter; data is inlined in the HTML
rm -rf "$SITE_DIR/examples/showcase-dc/.dvfc-dc-data"
echo "  OK showcase-dc"

echo
echo "Exporting gallery SVG thumbnails..."
echo

gallery_export() {
  local name="$1" spec="$2" chart="$3"
  local out="$PREVIEWS/gallery-${name}.svg"
  echo "  Gallery $name ← --chart $chart"
  $CLI build "$spec" -f svg --chart "$chart" -o "$out" >/dev/null
}

gallery_export sales-dash examples/sales-dash/sales.dash.yaml sales_trend
gallery_export web-analytics examples/web-analytics/web-analytics.dash.yaml daily_views
gallery_export dbt-jaffle examples/dbt-jaffle/jaffle.dash.yaml daily_revenue
gallery_export revenue-analysis examples/revenue-analysis/revenue-analysis.dash.yaml revenue_trend
gallery_export showcase-dc examples/site-gallery/showcase.dash.yaml discovery_timeline

echo
echo "Creating site pages (including catalog SVG exports)..."
echo

cp site-src/index.html "$SITE_DIR/"
cp site-src/style.css "$SITE_DIR/"
if [ -d site-src/assets ]; then
  cp -r site-src/assets/. "$SITE_DIR/assets/" 2>/dev/null || true
fi

node --experimental-strip-types scripts/build-chart-pages.ts

touch "$SITE_DIR/.nojekyll"

echo
echo "Building documentation (MkDocs)..."
echo
chmod +x scripts/build-docs.sh
./scripts/build-docs.sh

echo
echo "Site built successfully!"
echo "   Output: $SITE_DIR/"
echo "   Base path: $BASE_URL"
echo "   Docs: $SITE_DIR/docs/"
echo "   Previews: $(ls "$PREVIEWS"/*.svg 2>/dev/null | wc -l) SVGs"
echo "   Chart pages: $(find "$SITE_DIR/charts" -mindepth 1 -maxdepth 1 -type d | wc -l)"
echo
echo "Verification:"
if grep -r "/dbt-stub/" "$SITE_DIR" --include='*.html' --include='*.js' -l 2>/dev/null | grep -v assets | grep -v '/docs/'; then
  echo "ERROR: Found /dbt-stub/ paths!"
  exit 1
fi
echo "OK No /dbt-stub/ paths in HTML/JS"
echo "OK Data directories:"
find "$SITE_DIR" -type d -name "data" | while read -r dir; do
  csv_count=$(find "$dir" -name "*.csv" | wc -l)
  echo "  $dir ($csv_count CSV files)"
done
echo
