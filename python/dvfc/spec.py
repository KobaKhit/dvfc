"""
Dashboard specification models using Pydantic
"""

from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class ChartType(str, Enum):
    """Built-in chart types (plugins may use arbitrary string ids)."""

    LINE = "line"
    BAR = "bar"
    SCATTER = "scatter"
    AREA = "area"
    HISTOGRAM = "histogram"
    BOXPLOT = "boxplot"
    DENSITY = "density"
    HEATMAP = "heatmap"
    PIE = "pie"
    DONUT = "donut"
    NUMBER = "number"
    TABLE = "table"
    TEXT = "text"


class DataSourceType(str, Enum):
    """Data source types"""

    DBT = "dbt"
    CSV = "csv"
    PARQUET = "parquet"
    URL = "url"
    SQL = "sql"


class EncodingType(str, Enum):
    """Field encoding types"""

    QUANTITATIVE = "quantitative"
    NOMINAL = "nominal"
    ORDINAL = "ordinal"
    TEMPORAL = "temporal"


class AggregateFunction(str, Enum):
    """Aggregation functions"""

    SUM = "sum"
    AVG = "avg"
    COUNT = "count"
    MIN = "min"
    MAX = "max"


class EncodingChannel(BaseModel):
    """Encoding channel (x, y, color, etc.)"""

    field: str
    type: Optional[EncodingType] = None
    aggregate: Optional[AggregateFunction] = None
    label: Optional[str] = None


class InteractionSpec(BaseModel):
    """Chart interaction specification"""

    brush: Optional[bool] = None
    brushAxis: Optional[Literal["x", "y", "xy"]] = None
    select: Optional[Union[bool, Literal["auto", "x", "y", "xy"]]] = None
    # Prefer `publishes`; `selection` is the legacy alias kept for compat.
    publishes: Optional[str] = None
    selection: Optional[str] = None
    filterBy: Optional[str] = None


class Encoding(BaseModel):
    """Chart encoding specification"""

    x: Optional[EncodingChannel] = None
    y: Optional[EncodingChannel] = None
    color: Optional[Union[str, EncodingChannel]] = None
    size: Optional[EncodingChannel] = None


class ChartSpec(BaseModel):
    """Chart specification"""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: ChartType
    dataSource: str = Field(alias="dataSource")
    title: Optional[str] = None
    encoding: Encoding
    interaction: Optional[InteractionSpec] = None
    width: Optional[int] = None
    height: Optional[int] = None


class DataSource(BaseModel):
    """Data source specification"""

    id: str
    type: DataSourceType
    model: Optional[str] = None  # for dbt
    path: Optional[str] = None  # for csv/parquet/url
    sql: Optional[str] = None  # for sql


class MetaSpec(BaseModel):
    """Dashboard metadata"""

    title: str
    description: Optional[str] = None
    version: Optional[str] = "0.1.0"


class LayoutSpec(BaseModel):
    """Layout configuration (matches LayoutConfig in TS)"""

    type: Optional[Literal["flex", "grid", "stack"]] = "flex"
    columns: Optional[int] = None
    gap: Optional[int] = 16


class ThemeSpec(BaseModel):
    """Theme configuration (matches ThemeConfig in TS)"""

    colors: Optional[List[str]] = None
    fontFamily: Optional[str] = None
    backgroundColor: Optional[str] = None
    chartBorders: Optional[bool] = None


class DashboardSpec(BaseModel):
    """Complete dashboard specification"""

    meta: MetaSpec
    data: List[DataSource]
    charts: List[ChartSpec]
    layout: Optional[LayoutSpec] = None
    theme: Optional[ThemeSpec] = None
