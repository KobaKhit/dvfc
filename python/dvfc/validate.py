"""
Native Chart / Dash validation (no Node CLI required).

Structural checks use the JSON Schema files dumped from @dvfc/core
(``dvfc/schema/*.json``). Semantic checks remain in Python.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional, Union

from pydantic import ValidationError

from .ir import Chart, Dash, chart_to_dict, dash_to_dict
from .spec import DashboardSpec

try:
    import jsonschema
    from jsonschema import Draft7Validator
except ImportError:  # pragma: no cover
    jsonschema = None  # type: ignore
    Draft7Validator = None  # type: ignore


@dataclass
class ValidationIssue:
    path: str
    message: str


@dataclass
class ValidationResult:
    valid: bool
    errors: List[ValidationIssue] = field(default_factory=list)

    def raise_if_invalid(self) -> None:
        if not self.valid:
            msgs = "; ".join(f"{e.path}: {e.message}" for e in self.errors)
            raise ValueError(f"Invalid spec: {msgs}")


SpecLike = Union[Chart, Dash, DashboardSpec, dict, str, Path]

_SCHEMA_DIR = Path(__file__).resolve().parent / "schema"


@lru_cache(maxsize=8)
def _load_schema(name: str) -> dict[str, Any]:
    path = _SCHEMA_DIR / name
    if not path.is_file():
        raise FileNotFoundError(
            f"JSON Schema not found: {path}. Run `pnpm --filter @dvfc/core build` "
            "to dump schemas into python/dvfc/schema/."
        )
    loaded: Any = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise TypeError(f"Expected JSON object in {path}, got {type(loaded).__name__}")
    return loaded


def _json_schema_issues(instance: dict, schema_name: str) -> List[ValidationIssue]:
    if Draft7Validator is None:
        return []
    schema = _load_schema(schema_name)
    validator = Draft7Validator(schema)
    out: List[ValidationIssue] = []
    for err in sorted(validator.iter_errors(instance), key=lambda e: list(e.path)):
        loc = ".".join(str(x) for x in err.absolute_path) or "(root)"
        out.append(ValidationIssue(path=loc, message=err.message))
    return out


def _issues_from_pydantic(err: ValidationError) -> List[ValidationIssue]:
    out: List[ValidationIssue] = []
    for e in err.errors():
        loc = ".".join(str(x) for x in e.get("loc", ())) or "(root)"
        out.append(ValidationIssue(path=loc, message=e.get("msg", "invalid")))
    return out


def _validate_chart_semantics(chart: Chart) -> List[ValidationIssue]:
    errors: List[ValidationIssue] = []
    type_id = chart.type.value if hasattr(chart.type, "value") else str(chart.type)
    if type_id == "text":
        if not chart.content:
            errors.append(ValidationIssue(path="content", message="Text charts require content"))
        return errors

    if chart.data is None and not chart.dataSource:
        errors.append(
            ValidationIssue(
                path="data",
                message="Chart requires `data` or legacy `dataSource`",
            )
        )

    measures = chart.measures or []
    if len(measures) > 1:
        with_data = [m for m in measures if m.data is not None]
        field_only = [m for m in measures if m.data is None and m.field]
        if with_data and field_only and chart.data is None and not chart.dataSource:
            errors.append(
                ValidationIssue(
                    path="measures",
                    message="Grain mismatch: mixed measure bindings need chart-level data",
                )
            )
        kinds = {m.data.type for m in with_data if m.data is not None}
        if len(kinds) > 1:
            errors.append(
                ValidationIssue(
                    path="measures",
                    message=f"Grain mismatch: incompatible connector types {sorted(kinds)}",
                )
            )
    return errors


def validate_chart(chart: Union[Chart, dict]) -> ValidationResult:
    raw = chart_to_dict(chart) if isinstance(chart, Chart) else dict(chart)
    errors = _json_schema_issues(raw, "chart.json")
    if errors:
        return ValidationResult(valid=False, errors=errors)

    try:
        c = chart if isinstance(chart, Chart) else Chart.model_validate(chart)
    except ValidationError as e:
        return ValidationResult(valid=False, errors=_issues_from_pydantic(e))
    errors = _validate_chart_semantics(c)
    return ValidationResult(valid=len(errors) == 0, errors=errors)


def validate_dash(dash: Union[Dash, dict]) -> ValidationResult:
    raw = dash_to_dict(dash) if isinstance(dash, Dash) else dict(dash)
    errors = _json_schema_issues(raw, "dash.json")
    if errors:
        return ValidationResult(valid=False, errors=errors)

    try:
        d = dash if isinstance(dash, Dash) else Dash.model_validate(dash)
    except ValidationError as e:
        return ValidationResult(valid=False, errors=_issues_from_pydantic(e))
    semantic_errors: List[ValidationIssue] = []
    data_ids = {ds.id for ds in (d.data or [])}
    for i, entry in enumerate(d.charts):
        if isinstance(entry, Chart) or (isinstance(entry, dict) and "type" in entry):
            chart = entry if isinstance(entry, Chart) else Chart.model_validate(entry)
            cr = validate_chart(chart)
            for err in cr.errors:
                semantic_errors.append(
                    ValidationIssue(path=f"charts[{i}].{err.path}", message=err.message)
                )
            if chart.dataSource and data_ids and chart.dataSource not in data_ids:
                semantic_errors.append(
                    ValidationIssue(
                        path=f"charts[{i}].dataSource",
                        message=f"Unknown dataSource '{chart.dataSource}'",
                    )
                )
    return ValidationResult(valid=len(semantic_errors) == 0, errors=semantic_errors)


def validate(spec: SpecLike) -> ValidationResult:
    """
    Validate a Chart, Dash, path, or dict without the Node CLI.
    Paths ending in .chart.* → Chart; .dash.* → Dash; else try Dash then Chart.
    """
    if isinstance(spec, Chart):
        return validate_chart(spec)
    if isinstance(spec, Dash):
        return validate_dash(spec)
    if isinstance(spec, DashboardSpec):
        try:
            dumped = spec.model_dump(by_alias=True)
            schema_errs = _json_schema_issues(dumped, "dashboard-spec.json")
            if schema_errs:
                return ValidationResult(valid=False, errors=schema_errs)
            DashboardSpec.model_validate(dumped)
            return ValidationResult(valid=True)
        except ValidationError as e:
            return ValidationResult(valid=False, errors=_issues_from_pydantic(e))

    if isinstance(spec, (str, Path)):
        from .io import load_spec

        loaded = load_spec(spec)
        return validate(loaded)

    if isinstance(spec, dict):
        if "type" in spec and "charts" not in spec:
            return validate_chart(spec)
        if "charts" in spec and "id" in spec:
            return validate_dash(spec)
        return ValidationResult(
            valid=False,
            errors=[ValidationIssue(path="(root)", message="Unrecognized dict shape")],
        )

    return ValidationResult(
        valid=False,
        errors=[ValidationIssue(path="(root)", message=f"Unsupported type {type(spec)}")],
    )


def dump(spec: Union[Chart, Dash]) -> dict[str, Any]:
    if isinstance(spec, Chart):
        return chart_to_dict(spec)
    return dash_to_dict(spec)
