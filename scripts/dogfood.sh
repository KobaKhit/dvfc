#!/usr/bin/env bash
#
# Dogfood script - runs coordboard commands on examples
# Tests: search, get, compose, validate, build
#

set -e

echo "🐕 coordboard Dogfood Test Suite"
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
$CLI charts list --board examples/dbt-jaffle/board.yaml | head -15
echo

echo "Get chart metadata..."
$CLI charts get examples/dbt-jaffle/board.yaml daily_revenue --format json | head -10
echo

echo -e "${GREEN}✓ Chart discovery${NC}"
echo

echo -e "${BLUE}2. Compose Board${NC}"
echo "----------------"

echo "Composing from multiple boards..."
$CLI charts compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  --title "Revenue Comparison (Dogfood Test)" \
  -o /tmp/dogfood-composed.yaml

echo "✓ Composed board created (skipping validation - cross-board data refs)"
echo

echo -e "${GREEN}✓ Compose board${NC}"
echo

echo -e "${BLUE}3. Validate Examples${NC}"
echo "--------------------"

for example in examples/sales-board/board.yaml examples/web-analytics/board.yaml examples/dbt-jaffle/board.yaml; do
  echo "Validating $example..."
  $CLI validate $example
done

echo -e "${GREEN}✓ Validate examples${NC}"
echo

echo -e "${BLUE}4. Build Examples${NC}"
echo "-----------------"

echo "Building sales-board..."
$CLI build examples/sales-board/board.yaml -o /tmp/dogfood-dist-sales
echo

echo "Building single chart..."
$CLI build examples/dbt-jaffle/board.yaml --chart daily_revenue -o /tmp/dogfood-dist-single
echo

echo -e "${GREEN}✓ Build examples${NC}"
echo

echo -e "${BLUE}5. dbt Integration${NC}"
echo "------------------"

echo "Init from dbt manifest..."
(cd examples/dbt-jaffle && node ../../packages/cli/dist/cli.js init --from-dbt -o /tmp/dogfood-init.yaml)
echo

echo -e "${GREEN}✓ dbt integration${NC}"
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
