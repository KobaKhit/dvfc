"""
Minimal pure-Python CLI: validate / compile-metric (no warehouse adapters).
Full HTML builds still use the Node `dvfc` CLI.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="dvfc-py",
        description="dvfc Python helpers (validate, metric compile)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_val = sub.add_parser("validate", help="Validate a *.chart.yaml or *.dash.yaml")
    p_val.add_argument("spec", type=Path)

    p_mf = sub.add_parser("compile-metric", help="Compile dbt_metric → SQL")
    p_mf.add_argument("metric")
    p_mf.add_argument("--group-by", default="metric_time")
    p_mf.add_argument("--where", default=None)
    p_mf.add_argument("--spec-dir", type=Path, default=Path.cwd())
    p_mf.add_argument("--cache", action="store_true")

    args = parser.parse_args(argv)

    if args.cmd == "validate":
        from .validate import validate

        result = validate(args.spec)
        if result.valid:
            print(f"✓ Valid: {args.spec}")
            return 0
        print(f"✗ Invalid: {args.spec}")
        for err in result.errors:
            print(f"  {err.path}: {err.message}")
        return 1

    if args.cmd == "compile-metric":
        from .metricflow import compile_dbt_metric

        sql, source = compile_dbt_metric(
            args.metric,
            group_by=[g.strip() for g in args.group_by.split(",") if g.strip()],
            where=args.where,
            spec_dir=args.spec_dir,
            cache=args.cache,
        )
        print(f"-- source: {source}")
        print(sql)
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
