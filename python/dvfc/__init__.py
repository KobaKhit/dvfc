"""
Data Viz Factory (dvfc) Python SDK

Author Chart / Dash IR in Python. Validate and MetricFlow compile without Node.
HTML / full SVG-PNG pipeline uses the Node CLI when available.
"""

from .spec import (
    DashboardSpec,
    ChartSpec,
    DataSource,
    ChartType,
    EncodingChannel,
    InteractionSpec,
)
from .builder import DashboardBuilder
from .client import DataVizFactoryClient
from .ir import (
    Chart,
    Dash,
    DataRef,
    DataRefData,
    DataRefDbt,
    DataRefDbtMetric,
    DataRefSql,
    ChartMeasure,
    DashChartRef,
    DashDataSource,
)
from .chart_builder import ChartBuilder, DashBuilder
from .validate import ValidationResult, ValidationIssue, validate, validate_chart, validate_dash
from .io import load_spec, load_chart, load_dash, save_spec
from .metricflow import compile_dbt_metric

__version__ = "0.2.0"
__all__ = [
    "DashboardSpec",
    "ChartSpec",
    "DataSource",
    "ChartType",
    "EncodingChannel",
    "InteractionSpec",
    "DashboardBuilder",
    "DataVizFactoryClient",
    "Chart",
    "Dash",
    "DataRef",
    "DataRefData",
    "DataRefDbt",
    "DataRefDbtMetric",
    "DataRefSql",
    "ChartMeasure",
    "DashChartRef",
    "DashDataSource",
    "ChartBuilder",
    "DashBuilder",
    "ValidationResult",
    "ValidationIssue",
    "validate",
    "validate_chart",
    "validate_dash",
    "load_spec",
    "load_chart",
    "load_dash",
    "save_spec",
    "compile_dbt_metric",
    "__version__",
]
