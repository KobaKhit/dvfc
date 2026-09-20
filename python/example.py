#!/usr/bin/env python3
"""
Simple example of using Data Viz Factory (dvfc) Python SDK
"""

from dvfc import ChartBuilder, ChartType, DashBuilder, DataVizFactoryClient, validate

# Create a dash with coordinated charts
revenue = (
    ChartBuilder("daily_revenue", ChartType.LINE)
    .title("Daily Revenue (brush to filter)")
    .data_dbt("sales_daily")
    .x("date", type="temporal", label="Date")
    .y("revenue", type="quantitative", aggregate="sum", label="Total Revenue ($)")
    .brush("x", "dateBrush")
    .size(700, 250)
    .build()
)

by_region = (
    ChartBuilder("revenue_by_region", ChartType.BAR)
    .title("Revenue by Region")
    .data_dbt("sales_daily")
    .x("region", type="nominal", label="Region")
    .y("revenue", type="quantitative", aggregate="sum", label="Revenue ($)")
    .filter_by("dateBrush")
    .size(700, 300)
    .build()
)

products = (
    ChartBuilder("products_pie", ChartType.PIE)
    .title("Product Mix")
    .data_dbt("products")
    .x("category", type="nominal", label="Category")
    .y("units_sold", type="quantitative", aggregate="sum", label="Units")
    .filter_by("dateBrush")
    .size(400, 400)
    .build()
)

dash = (
    DashBuilder("sales-analytics", "Sales Analytics")
    .description("Revenue and product performance dashboard")
    .add_chart(revenue)
    .add_chart(by_region)
    .add_chart(products)
    .build()
)

client = DataVizFactoryClient()
print("Dash YAML:")
print("=" * 60)
print(client.to_yaml(dash))

print("\nValidating spec...")
result = validate(dash)
if result.valid:
    print("✓ Spec is valid")
else:
    print("✗ Spec is invalid:", result.errors)

# Build to HTML (requires dvfc CLI in PATH or in parent repo)
try:
    html_path = client.build(dash, out_dir="dist-python")
    print(f"\n✓ Dashboard built: {html_path}")
    print(f"  Preview: npx serve dist-python")
except Exception as e:
    print(f"\n⚠ Build failed (dvfc CLI not found or error): {e}")
    print("  Install dvfc or run from repo with built CLI")
