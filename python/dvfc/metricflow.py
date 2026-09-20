"""
Compile dbt_metric → SQL.

Order:
1. Fixture files (semantic/<metric>.sql, metrics/<metric>.sql)
2. In-process MetricFlow Python API (optional extra `dvfc[metricflow]`)
3. CLI: `mf query --explain` or `dbt sl query --compile`
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import List, Literal, Optional, Sequence, Tuple

Source = Literal["fixture", "metricflow-python", "metricflow-cli"]


def find_fixture_sql(
    metric: str,
    *,
    spec_dir: Path,
    project_root: Optional[Path] = None,
) -> Optional[str]:
    root = project_root or spec_dir
    candidates = [
        spec_dir / "semantic" / f"{metric}.sql",
        spec_dir / "metrics" / f"{metric}.sql",
        root / "semantic" / f"{metric}.sql",
        spec_dir / "dbt-stub" / "semantic" / f"{metric}.sql",
    ]
    for p in candidates:
        if p.is_file():
            return p.read_text(encoding="utf-8")
    return None


def find_dbt_project(start: Path) -> Optional[Path]:
    cur = start.resolve()
    for _ in range(12):
        if (cur / "dbt_project.yml").is_file():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return None


def extract_sql_from_cli_output(stdout: str) -> str:
    cleaned_lines = []
    for line in stdout.splitlines():
        t = line.strip()
        if not t:
            cleaned_lines.append(line)
            continue
        if t[0] in "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏":
            continue
        if t.lower().startswith("initiating query"):
            continue
        if t.startswith("🔎"):
            continue
        if t.lower().startswith("sql:"):
            continue
        cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines)
    fence = re.search(r"```(?:sql)?\s*([\s\S]*?)```", cleaned, re.I)
    if fence and fence.group(1).strip():
        return fence.group(1).strip()
    m = re.search(r"\bselect\b", cleaned, re.I)
    if m:
        sql = cleaned[m.start() :].strip()
        sql = re.sub(r"\n(?:Query|Returned|Success|Error).*$", "", sql, flags=re.I | re.S).strip()
        if len(sql) > 10:
            return sql
    raise RuntimeError("Could not parse SQL from MetricFlow CLI output")


def _compile_via_python_api(
    metric: str,
    group_by: Sequence[str],
    where: Optional[str],
    project_dir: Path,
) -> Optional[str]:
    """
    Best-effort in-process MetricFlow. Returns None if API unavailable.
    """
    try:
        # dbt-metricflow / metricflow layouts vary by version — try common entry points
        try:
            from metricflow.engine.metricflow_engine import (  # type: ignore
                MetricFlowEngine,
                MetricFlowQueryRequest,
            )
        except ImportError:
            from metricflow import MetricFlowEngine, MetricFlowQueryRequest  # type: ignore
    except ImportError:
        return None

    try:
        # Many installs need a configured dbt project / semantic manifest already parsed
        engine = MetricFlowEngine.create_from_dbt_project_root(str(project_dir))  # type: ignore[attr-defined]
    except Exception:
        try:
            from metricflow.engine.metricflow_engine import MetricFlowEngine as MFE  # type: ignore

            engine = MFE()  # type: ignore
        except Exception:
            return None

    try:
        request = MetricFlowQueryRequest.create_with_names(  # type: ignore[attr-defined]
            metric_names=[metric],
            group_by_names=list(group_by) or ["metric_time"],
            where_constraints=[where] if where else None,
        )
        result = engine.explain(request)  # type: ignore[attr-defined]
        sql = getattr(result, "sql", None) or getattr(result, "rendered_sql", None)
        if sql:
            return str(sql)
        # Some versions return explain plan object
        plan = getattr(result, "sql_statement", None)
        if plan:
            return str(plan)
    except Exception:
        return None
    return None


def _compile_via_cli(
    metric: str,
    group_by: Sequence[str],
    where: Optional[str],
    project_dir: Path,
) -> str:
    mode = (os.environ.get("DVFC_METRICFLOW_MODE") or "auto").lower()
    bin_override = os.environ.get("DVFC_METRICFLOW_BIN")

    if mode in ("dbt-sl", "dbt_sl", "sl") or (bin_override and "dbt" in bin_override):
        binary = bin_override or "dbt"
        args = [
            "sl",
            "query",
            "--metrics",
            metric,
            "--group-by",
            ",".join(group_by) or "metric_time",
            "--compile",
        ]
    else:
        binary = bin_override or shutil.which("mf") or "mf"
        args = [
            "query",
            "--metrics",
            metric,
            "--group-by",
            ",".join(group_by) or "metric_time",
            "--explain",
            "--quiet",
        ]
    if where:
        args.extend(["--where", where])

    def run(cmd_args: List[str]) -> str:
        proc = subprocess.run(
            [binary, *cmd_args],
            cwd=str(project_dir),
            capture_output=True,
            text=True,
            timeout=120,
        )
        out = (proc.stdout or "") + "\n" + (proc.stderr or "")
        if proc.returncode != 0 and not re.search(r"\bselect\b", out, re.I):
            raise RuntimeError(out.strip() or f"{binary} exited {proc.returncode}")
        return extract_sql_from_cli_output(out)

    try:
        return run(args)
    except Exception:
        if "--quiet" in args:
            return run([a for a in args if a != "--quiet"])
        raise


def compile_dbt_metric(
    metric: str,
    *,
    group_by: Optional[Sequence[str]] = None,
    where: Optional[str] = None,
    spec_dir: Optional[Path] = None,
    project_root: Optional[Path] = None,
    dbt_project: Optional[Path] = None,
    skip_invoke: bool = False,
    cache: bool = False,
) -> Tuple[str, Source]:
    """
    Resolve metric → SQL. Returns (sql, source).
    """
    spec = (spec_dir or Path.cwd()).resolve()
    root = (project_root or spec).resolve()
    gb = list(group_by) if group_by else ["metric_time"]

    fixture = find_fixture_sql(metric, spec_dir=spec, project_root=root)
    if fixture:
        return fixture, "fixture"

    if skip_invoke or os.environ.get("DVFC_METRICFLOW_SKIP") == "1":
        raise RuntimeError(
            f"dbt_metric '{metric}' has no fixture and invoke is skipped"
        )

    project = (
        dbt_project
        or (Path(os.environ["DVFC_DBT_PROJECT"]) if os.environ.get("DVFC_DBT_PROJECT") else None)
        or find_dbt_project(spec)
        or find_dbt_project(root)
        or root
    )

    sql = _compile_via_python_api(metric, gb, where, project)
    source: Source
    if sql:
        source = "metricflow-python"
    else:
        sql = _compile_via_cli(metric, gb, where, project)
        source = "metricflow-cli"

    if cache or os.environ.get("DVFC_METRICFLOW_CACHE") == "1":
        out = spec / "semantic" / f"{metric}.sql"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(f"-- Compiled for metric {metric} via {source}\n{sql}\n", encoding="utf-8")

    return sql, source
