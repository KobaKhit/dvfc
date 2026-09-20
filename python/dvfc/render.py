"""
Optional in-process Vega-Lite → SVG/PNG via vl-convert (no Node).

Install: pip install 'dvfc[render]'
HTML/Mosaic builds still use the Node CLI.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .ir import Chart


def chart_to_vega_lite(
    chart: Chart,
    values: List[Dict[str, Any]],
) -> Dict[str, Any]:
    type_id = chart.type.value if hasattr(chart.type, "value") else str(chart.type)
    if type_id == "text":
        raise ValueError("Cannot export text charts to Vega-Lite")

    mark: Any
    if type_id == "line":
        mark = {"type": "line", "point": True}
    elif type_id == "area":
        mark = "area"
    elif type_id == "scatter":
        mark = "point"
    elif type_id == "bar":
        mark = "bar"
    elif type_id == "number":
        mark = {"type": "text", "fontSize": 28}
    else:
        mark = "point"

    encoding: Dict[str, Any] = {}
    enc = chart.encoding
    if enc and enc.x:
        encoding["x"] = {
            "field": enc.x.field,
            "type": (enc.x.type.value if enc.x.type else "nominal"),
            "title": enc.x.label,
            "aggregate": enc.x.aggregate.value if enc.x.aggregate else None,
        }
        encoding["x"] = {k: v for k, v in encoding["x"].items() if v is not None}
    if enc and enc.y:
        encoding["y"] = {
            "field": enc.y.field,
            "type": (enc.y.type.value if enc.y.type else "quantitative"),
            "title": enc.y.label,
            "aggregate": enc.y.aggregate.value if enc.y.aggregate else None,
        }
        encoding["y"] = {k: v for k, v in encoding["y"].items() if v is not None}

    if type_id == "number" and enc and enc.y:
        return {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "title": chart.title,
            "data": {"values": values},
            "mark": mark,
            "encoding": {
                "text": {
                    "field": enc.y.field,
                    "aggregate": enc.y.aggregate.value if enc.y.aggregate else "sum",
                    "type": "quantitative",
                }
            },
        }

    return {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": chart.title,
        "width": chart.width or 600,
        "height": chart.height or 300,
        "data": {"values": values},
        "mark": mark,
        "encoding": encoding,
    }


def _require_vl_convert():
    try:
        import vl_convert as vlc
    except ImportError as e:
        raise ImportError(
            "In-process SVG/PNG requires vl-convert. Install with: pip install 'dvfc[render]'"
        ) from e
    return vlc


def render_svg(chart: Chart, values: List[Dict[str, Any]]) -> str:
    vlc = _require_vl_convert()
    vl = chart_to_vega_lite(chart, values)
    return vlc.vegalite_to_svg(json.dumps(vl))


def render_png(chart: Chart, values: List[Dict[str, Any]], scale: float = 2.0) -> bytes:
    vlc = _require_vl_convert()
    vl = chart_to_vega_lite(chart, values)
    return vlc.vegalite_to_png(json.dumps(vl), scale=scale)


def render_chart_file(
    chart: Chart,
    values: List[Dict[str, Any]],
    out: Union[str, Path],
    format: str = "svg",
) -> Path:
    path = Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    if format == "svg":
        path.write_text(render_svg(chart, values), encoding="utf-8")
    elif format == "png":
        path.write_bytes(render_png(chart, values))
    else:
        raise ValueError("format must be svg or png")
    return path
