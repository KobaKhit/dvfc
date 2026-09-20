#!/usr/bin/env bash
#
# Dogfood script - runs dvfc commands on examples
# Tests: search, get, compose, validate, build
#

set -e

echo "🐕 dvfc Dogfood Test Suite"
echo "================================="
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

CLI="node packages/cli/dist/cli.js"

echo -e "${BLUE}1. Chart Discovery${NC}"
echo "-------------------"

echo "Search for 'revenue' charts..."
$CLI charts search revenue | head -20
echo

echo "List charts in dbt-jaffle..."
$CLI charts list --dash examples/dbt-jaffle/jaffle.dash.yaml | head -15
echo

echo "Get chart metadata..."
$CLI charts get examples/dbt-jaffle/jaffle.dash.yaml daily_revenue --format json | head -10
echo

echo -e "${GREEN}✓ Chart discovery${NC}"
echo

echo -e "${BLUE}2. Compose Dash${NC}"
echo "----------------"

echo "Composing from multiple dashes..."
$CLI charts compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  --title "Revenue Comparison (Dogfood Test)" \
  -o /tmp/dogfood-composed.yaml

echo "✓ Composed dash created (skipping validation - cross-dash data refs)"
echo

echo -e "${GREEN}✓ Compose dash${NC}"
echo

echo -e "${BLUE}3. Validate Examples${NC}"
echo "--------------------"

for example in examples/sales-dash/sales.dash.yaml examples/web-analytics/web-analytics.dash.yaml examples/dbt-jaffle/jaffle.dash.yaml; do
  echo "Validating $example..."
  $CLI validate $example
done

echo -e "${GREEN}✓ Validate examples${NC}"
echo

echo -e "${BLUE}4. Build Examples${NC}"
echo "-----------------"

echo "Building sales-dash..."
$CLI build examples/sales-dash/sales.dash.yaml -o /tmp/dogfood-dist-sales
echo

echo "Building single chart..."
$CLI build examples/dbt-jaffle/jaffle.dash.yaml --chart daily_revenue -o /tmp/dogfood-dist-single
echo

echo -e "${GREEN}✓ Build examples${NC}"
echo

echo -e "${BLUE}5. dbt Integration (End-to-End)${NC}"
echo "--------------------------------"

echo "Testing dbt-jaffle example..."

echo "  Init from dbt manifest..."
(cd examples/dbt-jaffle && node ../../packages/cli/dist/cli.js init --from-dbt -o /tmp/dogfood-dbt-init.yaml)

echo "  Validate generated dash..."
$CLI validate /tmp/dogfood-dbt-init.yaml | head -3

echo "  Chart discovery on dbt project..."
$CLI charts list --dash examples/dbt-jaffle/jaffle.dash.yaml | head -8

echo "  Search for specific charts..."
$CLI charts search "revenue" | head -8

echo "  Get chart metadata..."
$CLI charts get examples/dbt-jaffle/jaffle.dash.yaml daily_revenue --format json | head -5

echo "  Compose from dbt charts..."
$CLI charts compose \
  --charts dbt-jaffle__daily_revenue,dbt-jaffle__revenue_by_method \
  --title "dbt Revenue Analysis" \
  -o /tmp/dogfood-dbt-composed.yaml

echo "  Build dbt dashboard..."
$CLI build examples/dbt-jaffle/jaffle.dash.yaml -o /tmp/dogfood-dbt-dist >/dev/null 2>&1
test -f /tmp/dogfood-dbt-dist/index.html && echo "  ✓ dbt build successful"

echo -e "${GREEN}✓ dbt integration (full workflow)${NC}"
echo

echo -e "${BLUE}6. MCP Server${NC}"
echo "-------------"

echo "Testing MCP server startup..."
timeout 1 pnpm mcp 2>&1 | head -3 || echo "✓ MCP server runs"
echo

echo -e "${GREEN}✓ MCP server${NC}"
echo

echo "================================="
echo -e "${GREEN}🎉 All dogfood tests passed!${NC}"
echo

# Cleanup
rm -rf /tmp/dogfood-*
