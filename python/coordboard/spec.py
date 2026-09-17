"""
Dashboard specification models using Pydantic
"""

from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class ChartType(str, Enum):
    """Supported chart types"""

    LINE = "line"
    BAR = "bar"
    SCATTER = "scatter"
    AREA = "area"
    HEATMAP = "heatmap"
    PIE = "pie"
    DONUT = "donut"
    NUMBER = "number"
    TABLE = "table"


class DataSourceType(str, Enum):
    """Data source types"""

    DBT = "dbt"
    CSV = "csv"
    PARQUET = "parquet"


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
    brushAxis: Optional[Literal["x", "y"]] = None
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

    id: str
    type: ChartType
    dataSource: str = Field(alias="dataSource")
    title: Optional[str] = None
    encoding: Encoding
    interaction: Optional[InteractionSpec] = None
    width: Optional[int] = None
    height: Optional[int] = None

    class Config:
        populate_by_name = True


class DataSource(BaseModel):
    """Data source specification"""

    id: str
    type: DataSourceType
    model: Optional[str] = None  # for dbt
    path: Optional[str] = None  # for csv/parquet


class MetaSpec(BaseModel):
    """Dashboard metadata"""

    title: str
    description: Optional[str] = None
    version: Optional[str] = "0.1.0"


class LayoutSpec(BaseModel):
    """Layout configuration"""

    type: Optional[Literal["flex", "grid"]] = "flex"
    gap: Optional[int] = 16


class ThemeSpec(BaseModel):
    """Theme configuration"""

    colors: Optional[List[str]] = None
    fontFamily: Optional[str] = None


class DashboardSpec(BaseModel):
    """Complete dashboard specification"""

    meta: MetaSpec
    data: List[DataSource]
    charts: List[ChartSpec]
    layout: Optional[LayoutSpec] = None
    theme: Optional[ThemeSpec] = None
