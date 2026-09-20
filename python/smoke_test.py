"""Smoke-test Python SDK against Node CLI (chart validate + svg build)."""

from pathlib import Path

from dvfc import DataVizFactoryClient

ROOT = Path(__file__).resolve().parents[1]
CHART = ROOT / "examples" / "charts" / "revenue_trend.chart.yaml"


def main() -> None:
    client = DataVizFactoryClient()
    assert client.validate(CHART), "validate failed"
    out = Path("/tmp/dvfc-py-out.svg")
    path = client.build(CHART, out_dir=str(out), format="svg")
    assert path.exists() and path.stat().st_size > 100, path
    print(f"OK validate + svg → {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
