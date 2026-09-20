"""
Chart / Dash IR models (Python authoring surface).
"""

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from .spec import ChartType, Encoding, InteractionSpec


class DataRefDbtMetric(BaseModel):
    type: Literal["dbt_metric"] = "dbt_metric"
    metric: str
    group_by: Optional[List[str]] = None
    where: Optional[str] = None


class DataRefDbt(BaseModel):
    type: Literal["dbt"] = "dbt"
    model: str


class DataRefSql(BaseModel):
    type: Literal["sql"] = "sql"
    sql: str


class DataRefData(BaseModel):
    type: Literal["data"] = "data"
    path: Optional[str] = None
    table: Optional[str] = None


DataRef = Union[DataRefDbtMetric, DataRefDbt, DataRefSql, DataRefData]


class ChartMeasure(BaseModel):
    id: str
    field: Optional[str] = None
    data: Optional[DataRef] = None
    label: Optional[str] = None


class Chart(BaseModel):
    """Atomic chart document (*.chart.yaml)."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: ChartType
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[DataRef] = None
    dataSource: Optional[str] = None
    encoding: Optional[Encoding] = None
    content: Optional[str] = None
    measures: Optional[List[ChartMeasure]] = None
    interaction: Optional[InteractionSpec] = None
    width: Optional[int] = None
    height: Optional[int] = None


class DashChartRef(BaseModel):
    chart: str
    id: Optional[str] = None
    title: Optional[str] = None


class DashDataSource(BaseModel):
    id: str
    type: Literal["dbt", "sql", "csv", "parquet", "url", "data"] = "dbt"
    model: Optional[str] = None
    sql: Optional[str] = None
    path: Optional[str] = None
    url: Optional[str] = None


class DashCoordination(BaseModel):
    auto: Optional[bool] = True


class Dash(BaseModel):
    """Dash composition document (*.dash.yaml)."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = "0.1.0"
    coordination: Optional[DashCoordination] = None
    data: Optional[List[DashDataSource]] = None
    charts: List[Union[DashChartRef, Chart]] = Field(default_factory=list)

def chart_to_dict(chart: Chart) -> Dict[str, Any]:
    return chart.model_dump(by_alias=True, exclude_none=True, mode="json")


def dash_to_dict(dash: Dash) -> Dict[str, Any]:
    return dash.model_dump(by_alias=True, exclude_none=True, mode="json")
