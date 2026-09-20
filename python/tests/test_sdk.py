"""Python SDK unit tests (no Node required for most)."""

from pathlib import Path

import pytest

from dvfc import (
    ChartBuilder,
    ChartType,
    DashBuilder,
    compile_dbt_metric,
    load_chart,
    save_spec,
    validate,
)
from dvfc.metricflow import extract_sql_from_cli_output
from dvfc.render import chart_to_vega_lite


ROOT = Path(__file__).resolve().parents[2]


def test_chart_builder_and_native_validate():
    chart = (
        ChartBuilder("rev", ChartType.LINE)
        .title("Revenue")
        .data_file("sales_daily.csv")
        .x("date", type="temporal")
        .y("sales", type="quantitative", aggregate="sum")
        .brush("x", "time")
        .size(600, 250)
        .build()
    )
    result = validate(chart)
    assert result.valid, result.errors


def test_dash_builder():
    dash = (
        DashBuilder("sales", "Sales")
        .add_dbt("sales_daily", "sales_daily")
        .add_ref("revenue_trend")
        .build()
    )
    assert dash.id == "sales"
    assert validate(dash).valid


def test_load_example_chart():
    chart = load_chart(ROOT / "examples/charts/revenue_trend.chart.yaml")
    assert chart.id == "revenue_trend"
    assert validate(chart).valid


def test_save_roundtrip(tmp_path: Path):
    chart = ChartBuilder("c", "bar").data_sql("SELECT 1 AS x, 2 AS y").x("x").y("y").build()
    path = save_spec(chart, tmp_path / "c.chart.yaml")
    loaded = load_chart(path)
    assert loaded.id == "c"


def test_metric_fixture_compile():
    sql, source = compile_dbt_metric(
        "total_revenue",
        spec_dir=ROOT / "examples/charts",
        project_root=ROOT,
        skip_invoke=True,
    )
    assert source == "fixture"
    assert "sales" in sql.lower() or "revenue" in sql.lower()


def test_extract_sql():
    sql = extract_sql_from_cli_output("🔎 SQL:\nSELECT a FROM t\n")
    assert sql.upper().startswith("SELECT")


def test_chart_to_vega_lite():
    chart = ChartBuilder("c", "line").data_file("x.csv").x("a").y("b").build()
    vl = chart_to_vega_lite(chart, [{"a": 1, "b": 2}])
    assert vl["$schema"].startswith("https://vega.github.io")
    assert vl["data"]["values"][0]["a"] == 1


def test_invalid_chart():
    from dvfc.ir import Chart

    # missing data
    chart = Chart(id="x", type=ChartType.LINE)
    result = validate(chart)
    assert not result.valid
