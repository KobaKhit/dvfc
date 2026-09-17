"""
coordboard Python SDK

Build analytics dashboards with Mosaic + dbt from Python.
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
from .client import CoordboardClient

__version__ = "0.1.0"
__all__ = [
    "DashboardSpec",
    "ChartSpec",
    "DataSource",
    "ChartType",
    "EncodingChannel",
    "InteractionSpec",
    "DashboardBuilder",
    "CoordboardClient",
]
