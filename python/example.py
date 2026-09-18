#!/usr/bin/env python3
"""
Simple example of using Data Viz Factory (dvfc) Python SDK
"""

from dvfc import ChartType, DataVizFactoryClient, DashboardBuilder

# Create a dashboard using fluent API
dashboard = (
    DashboardBuilder("Sales Analytics", "Revenue and product performance dashboard")
    .add_dbt_source("sales", "sales_daily")
    .add_dbt_source("products", "products")
    .layout("flex", gap=24)
    .theme(
        colors=["steelblue", "darkorange", "mediumseagreen"],
        font_family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    )
)

# Add time series with brush
dashboard.chart("daily_revenue", ChartType.LINE, "sales").title(
    "Daily Revenue (brush to filter)"
).x("date", type="temporal", label="Date").y(
    "revenue", type="quantitative", aggregate="sum", label="Total Revenue ($)"
).brush(
    "x", "dateBrush"
).size(
    700, 250
).build()

# Add filtered bar chart
dashboard.chart("revenue_by_region", ChartType.BAR, "sales").title("Revenue by Region").x(
    "region", type="nominal", label="Region"
).y("revenue", type="quantitative", aggregate="sum", label="Revenue ($)").filter_by(
    "dateBrush"
).size(
    700, 300
).build()

# Add pie chart
dashboard.chart("products_pie", ChartType.PIE, "products").title("Product Mix").x(
    "category", type="nominal", label="Category"
).y("units_sold", type="quantitative", aggregate="sum", label="Units").filter_by(
    "dateBrush"
).size(
    400, 400
).build()

# Build the spec
spec = dashboard.build()

# Output YAML
client = DataVizFactoryClient()
print("Dashboard YAML:")
print("=" * 60)
print(client.to_yaml(spec))

# Validate
print("\nValidating spec...")
if client.validate(spec):
    print("✓ Spec is valid")
else:
    print("✗ Spec is invalid")

# Build to HTML (requires dvfc CLI in PATH or in parent repo)
try:
    html_path = client.build(spec, out_dir="dist-python")
    print(f"\n✓ Dashboard built: {html_path}")
    print(f"  Preview: npx serve dist-python")
except Exception as e:
    print(f"\n⚠ Build failed (dvfc CLI not found or error): {e}")
    print("  Install dvfc or run from repo with built CLI")
