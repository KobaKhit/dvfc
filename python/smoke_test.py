"""Smoke-test: native validate + optional CLI svg."""

from pathlib import Path

from dvfc import ChartBuilder, ChartType, DataVizFactoryClient, compile_dbt_metric, validate

ROOT = Path(__file__).resolve().parents[1]
CHART = ROOT / "examples" / "charts" / "revenue_trend.chart.yaml"


def main() -> None:
    chart = (
        ChartBuilder("smoke", ChartType.LINE)
        .data_file(str(ROOT / "examples/sales-dash/dbt-stub/sales_daily.csv"))
        .x("date", type="temporal")
        .y("sales", type="quantitative", aggregate="sum")
        .build()
    )
    assert validate(chart).valid, "native validate failed"

    sql, source = compile_dbt_metric(
        "total_revenue",
        spec_dir=ROOT / "examples/charts",
        project_root=ROOT,
        skip_invoke=True,
    )
    assert source == "fixture" and len(sql) > 20
    print(f"OK native validate + metric fixture ({source})")

    client = DataVizFactoryClient()
    assert client.validate(CHART)
    try:
        out = Path("/tmp/dvfc-py-out.svg")
        path = client.build(CHART, out_dir=str(out), format="svg")
        assert path.exists() and path.stat().st_size > 100
        print(f"OK CLI svg → {path} ({path.stat().st_size} bytes)")
    except RuntimeError as e:
        print(f"SKIP CLI build (Node dvfc not available): {e}")


if __name__ == "__main__":
    main()
