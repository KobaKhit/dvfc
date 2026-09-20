"""
Load / save Chart and Dash YAML/JSON (and TOML when tomli/tomllib available).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Union

import yaml

from .ir import Chart, Dash


def _parse_content(content: str, fmt: str) -> Any:
    if fmt == "json":
        return json.loads(content)
    if fmt == "toml":
        if sys.version_info >= (3, 11):
            import tomllib
        else:
            try:
                import tomli as tomllib
            except ImportError as e:
                raise ImportError(
                    "TOML support requires Python 3.11+ or `pip install tomli`"
                ) from e
        return tomllib.loads(content)
    return yaml.safe_load(content)


def format_from_path(path: Union[str, Path]) -> str:
    p = Path(path)
    name = p.name.lower()
    if name.endswith(".toml"):
        return "toml"
    if name.endswith(".json"):
        return "json"
    return "yaml"


def detect_kind(path: Union[str, Path], data: Any) -> str:
    name = Path(path).name.lower()
    if ".chart." in name or name.endswith(".chart.yaml") or name.endswith(".chart.yml"):
        return "chart"
    if ".dash." in name or name.endswith(".dash.yaml") or name.endswith(".dash.yml"):
        return "dash"
    if isinstance(data, dict):
        if "charts" in data and "id" in data:
            return "dash"
        if "type" in data and "id" in data:
            return "chart"
    raise ValueError(f"Cannot detect chart/dash kind for {path}")


def load_spec(path: Union[str, Path]) -> Union[Chart, Dash]:
    p = Path(path)
    content = p.read_text(encoding="utf-8")
    data = _parse_content(content, format_from_path(p))
    kind = detect_kind(p, data)
    if kind == "chart":
        return Chart.model_validate(data)
    return Dash.model_validate(data)


def load_chart(path: Union[str, Path]) -> Chart:
    spec = load_spec(path)
    if not isinstance(spec, Chart):
        raise TypeError(f"Expected Chart, got {type(spec).__name__}")
    return spec


def load_dash(path: Union[str, Path]) -> Dash:
    spec = load_spec(path)
    if not isinstance(spec, Dash):
        raise TypeError(f"Expected Dash, got {type(spec).__name__}")
    return spec


def save_spec(spec: Union[Chart, Dash], path: Union[str, Path]) -> Path:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = spec.model_dump(by_alias=True, exclude_none=True, mode="json")
    fmt = format_from_path(p)
    if fmt == "json":
        p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    elif fmt == "toml":
        try:
            import tomli_w
        except ImportError as e:
            raise ImportError("Saving TOML requires `pip install tomli-w`") from e
        p.write_text(tomli_w.dumps(data), encoding="utf-8")
    else:
        p.write_text(
            yaml.safe_dump(data, sort_keys=False, default_flow_style=False),
            encoding="utf-8",
        )
    return p
