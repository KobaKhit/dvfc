#!/bin/bash
set -e

# Build script for GitHub Pages site
# Usage: ./scripts/build-site.sh

echo "🏗️  Building Data Viz Factory GitHub Pages site..."
echo ""

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf site/examples
mkdir -p site/examples

# Ensure packages are built
echo "📦 Building packages..."
pnpm build

# Build examples
BASE_PATH="/dvfc/"

echo ""
echo "📊 Building examples with base path: $BASE_PATH"
echo ""

# Sales Board
echo "Building sales-board..."
node packages/cli/dist/cli.js build examples/sales-board/board.yaml \
  -o site/examples/sales-board \
  --base "$BASE_PATH"

# Web Analytics
echo "Building web-analytics..."
node packages/cli/dist/cli.js build examples/web-analytics/board.yaml \
  -o site/examples/web-analytics \
  --base "$BASE_PATH"

# dbt Jaffle
echo "Building dbt-jaffle..."
node packages/cli/dist/cli.js build examples/dbt-jaffle/board.yaml \
  -o site/examples/dbt-jaffle \
  --base "$BASE_PATH"

# Revenue Analysis
echo "Building revenue-analysis..."
node packages/cli/dist/cli.js build examples/revenue-analysis/board.yaml \
  -o site/examples/revenue-analysis \
  --base "$BASE_PATH"

# Create .nojekyll
touch site/.nojekyll

echo ""
echo "✅ Site built successfully!"
echo ""
echo "📁 Output:"
ls -lh site/examples/*/index.html
echo ""
echo "🌐 Preview locally:"
echo "   npx serve site -l 3000"
echo "   Open: http://localhost:3000/dvfc/"
echo ""
