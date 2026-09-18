"""
Data Viz Factory (dvfc) Python SDK

Build cross-filtered boards for humans and agents from Python.
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

__version__ = "0.1.0"
__all__ = [
    "DashboardSpec",
    "ChartSpec",
    "DataSource",
    "ChartType",
    "EncodingChannel",
    "InteractionSpec",
    "DashboardBuilder",
    "DataVizFactoryClient",
]
