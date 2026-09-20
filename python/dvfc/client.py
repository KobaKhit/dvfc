"""
DataVizFactoryClient, build via Node CLI; validate/load/metricflow native in Python.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List, Literal, Optional, Union

import yaml

from .ir import Chart, Dash, chart_to_dict, dash_to_dict
from .spec import DashboardSpec
from .validate import ValidationResult, validate as native_validate

Format = Literal["html", "svg", "png"]
SpecLike = Union[DashboardSpec, Chart, Dash, str, Path]


class DataVizFactoryClient:
    """
    Hybrid client:
    - validate / load / dump / metric compile: pure Python
    - build html|svg|png (Mosaic / full pipeline): Node `dvfc` CLI
    - optional in-process svg/png: ``dvfc.render`` + ``dvfc[render]``
    """

    def __init__(self, cli_path: Optional[str] = None, require_cli: bool = False):
        self._cli_path = cli_path
        self._require_cli = require_cli

    def _find_cli(self) -> str:
        if self._cli_path:
            return self._cli_path
        cli_path = shutil.which("dvfc")
        if cli_path:
            return cli_path

        package_dir = Path(__file__).parent.parent.parent
        node_cli = package_dir / "packages" / "cli" / "dist" / "cli.js"
        if node_cli.exists():
            return f"node {node_cli}"

        raise RuntimeError(
            "Could not find dvfc CLI. Install the Node package or set cli_path. "
            "Pure-Python validate/load/metricflow work without it."
        )

    @property
    def cli_path(self) -> str:
        return self._find_cli()

    def _run(self, args: List[str]) -> subprocess.CompletedProcess:
        cmd = self.cli_path.split() + args
        return subprocess.run(cmd, capture_output=True, text=True)

    def _materialize(self, spec: SpecLike) -> tuple[str, bool]:
        if isinstance(spec, (str, Path)):
            return str(spec), False
        if isinstance(spec, Chart):
            data = chart_to_dict(spec)
            suffix = ".chart.yaml"
        elif isinstance(spec, Dash):
            data = dash_to_dict(spec)
            suffix = ".dash.yaml"
        else:
            data = spec.model_dump(by_alias=True, exclude_none=True, mode="json")
            suffix = ".yaml"
        with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
            return f.name, True

    def validate(self, spec: SpecLike, *, native: bool = True) -> bool:
        """
        Validate spec. Default: pure Python (Chart/Dash).
        Set native=False to use Node CLI (includes dbt manifest checks).
        """
        if native and not isinstance(spec, DashboardSpec):
            result = native_validate(spec)
            return result.valid
        if native and isinstance(spec, DashboardSpec):
            result = native_validate(spec)
            return result.valid

        spec_path, cleanup = self._materialize(spec)
        try:
            result = self._run(["validate", str(spec_path)])
            return result.returncode == 0
        finally:
            if cleanup:
                os.unlink(spec_path)

    def validate_detailed(self, spec: SpecLike) -> ValidationResult:
        return native_validate(spec)

    def build(
        self,
        spec: SpecLike,
        out_dir: str = "dist",
        minify: bool = False,
        format: Format = "html",
        chart_id: Optional[str] = None,
    ) -> Path:
        spec_path, cleanup = self._materialize(spec)
        try:
            cmd = ["build", spec_path, "-o", out_dir, "--format", format]
            if minify:
                cmd.append("--minify")
            if chart_id:
                cmd.extend(["--chart", chart_id])

            result = self._run(cmd)
            if result.returncode != 0:
                raise RuntimeError(result.stderr or result.stdout)

            if format == "html":
                return Path(out_dir) / "index.html"
            return Path(out_dir)

        finally:
            if cleanup:
                os.unlink(spec_path)

    def to_yaml(self, spec: Union[DashboardSpec, Chart, Dash]) -> str:
        if isinstance(spec, Chart):
            data = chart_to_dict(spec)
        elif isinstance(spec, Dash):
            data = dash_to_dict(spec)
        else:
            data = spec.model_dump(by_alias=True, exclude_none=True, mode="json")
        return yaml.dump(data, default_flow_style=False, sort_keys=False)

    def to_json(self, spec: Union[DashboardSpec, Chart, Dash]) -> str:
        if isinstance(spec, (Chart, Dash)):
            return spec.model_dump_json(by_alias=True, exclude_none=True, indent=2)
        return spec.model_dump_json(by_alias=True, exclude_none=True, indent=2)

    def to_html(
        self,
        spec: Union[DashboardSpec, Chart, Dash],
        out_path: Optional[Union[str, Path]] = None,
        minify: bool = False,
    ) -> str:
        with tempfile.TemporaryDirectory() as tmpdir:
            html_path = self.build(spec, out_dir=tmpdir, minify=minify, format="html")
            html = html_path.read_text()
            if out_path:
                Path(out_path).write_text(html)
            return html
