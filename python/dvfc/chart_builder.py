"""
Fluent builders for Chart and Dash IR.
"""

from __future__ import annotations

from typing import List, Optional, Union

from .ir import (
    Chart,
    ChartMeasure,
    Dash,
    DashChartRef,
    DashCoordination,
    DashDataSource,
    DataRef,
    DataRefData,
    DataRefDbt,
    DataRefDbtMetric,
    DataRefSql,
)
from .spec import (
    AggregateFunction,
    ChartType,
    Encoding,
    EncodingChannel,
    EncodingType,
    InteractionSpec,
)


class ChartBuilder:
    def __init__(self, chart_id: str, chart_type: Union[ChartType, str]):
        self._id = chart_id
        # Keep known enums as their value; allow arbitrary plugin type strings.
        if isinstance(chart_type, ChartType):
            self._type = chart_type.value
        else:
            try:
                self._type = ChartType(chart_type).value
            except ValueError:
                self._type = chart_type
        self._title: Optional[str] = None
        self._description: Optional[str] = None
        self._data: Optional[DataRef] = None
        self._data_source: Optional[str] = None
        self._encoding = Encoding()
        self._content: Optional[str] = None
        self._measures: List[ChartMeasure] = []
        self._interaction: Optional[InteractionSpec] = None
        self._width: Optional[int] = None
        self._height: Optional[int] = None

    def title(self, title: str) -> "ChartBuilder":
        self._title = title
        return self

    def description(self, description: str) -> "ChartBuilder":
        self._description = description
        return self

    def data_file(self, path: str) -> "ChartBuilder":
        self._data = DataRefData(path=path)
        return self

    def data_sql(self, sql: str) -> "ChartBuilder":
        self._data = DataRefSql(sql=sql)
        return self

    def data_dbt(self, model: str) -> "ChartBuilder":
        self._data = DataRefDbt(model=model)
        return self

    def data_metric(
        self,
        metric: str,
        group_by: Optional[List[str]] = None,
        where: Optional[str] = None,
    ) -> "ChartBuilder":
        self._data = DataRefDbtMetric(metric=metric, group_by=group_by, where=where)
        return self

    def data_source(self, source_id: str) -> "ChartBuilder":
        self._data_source = source_id
        return self

    def x(
        self,
        field: str,
        type: Optional[str] = None,
        aggregate: Optional[str] = None,
        label: Optional[str] = None,
    ) -> "ChartBuilder":
        self._encoding.x = EncodingChannel(
            field=field,
            type=EncodingType(type) if type else None,
            aggregate=AggregateFunction(aggregate) if aggregate else None,
            label=label,
        )
        return self

    def y(
        self,
        field: str,
        type: Optional[str] = None,
        aggregate: Optional[str] = None,
        label: Optional[str] = None,
    ) -> "ChartBuilder":
        self._encoding.y = EncodingChannel(
            field=field,
            type=EncodingType(type) if type else None,
            aggregate=AggregateFunction(aggregate) if aggregate else None,
            label=label,
        )
        return self

    def color(self, field: str, type: Optional[str] = None) -> "ChartBuilder":
        self._encoding.color = EncodingChannel(
            field=field,
            type=EncodingType(type) if type else None,
        )
        return self

    def brush(self, axis: str = "x", publishes: str = "brush") -> "ChartBuilder":
        self._interaction = InteractionSpec(
            brush=True,
            brushAxis=axis,  # type: ignore[arg-type]
            publishes=publishes,
            selection=publishes,
        )
        return self

    def filter_by(self, selection: str) -> "ChartBuilder":
        if self._interaction is None:
            self._interaction = InteractionSpec(filterBy=selection)
        else:
            self._interaction.filterBy = selection
        return self

    def size(self, width: int, height: int) -> "ChartBuilder":
        self._width = width
        self._height = height
        return self

    def content(self, markdown: str) -> "ChartBuilder":
        self._content = markdown
        return self

    def build(self) -> Chart:
        return Chart(
            id=self._id,
            type=self._type,
            title=self._title,
            description=self._description,
            data=self._data,
            dataSource=self._data_source,
            encoding=self._encoding if (self._encoding.x or self._encoding.y) else None,
            content=self._content,
            measures=self._measures or None,
            interaction=self._interaction,
            width=self._width,
            height=self._height,
        )


class DashBuilder:
    def __init__(self, dash_id: str, title: Optional[str] = None):
        self._id = dash_id
        self._title = title or dash_id
        self._description: Optional[str] = None
        self._version = "0.1.0"
        self._auto = True
        self._data: List[DashDataSource] = []
        self._charts: List[Union[DashChartRef, Chart]] = []

    def description(self, description: str) -> "DashBuilder":
        self._description = description
        return self

    def auto_coordination(self, enabled: bool = True) -> "DashBuilder":
        self._auto = enabled
        return self

    def add_dbt(self, source_id: str, model: str) -> "DashBuilder":
        self._data.append(DashDataSource(id=source_id, type="dbt", model=model))
        return self

    def add_sql(self, source_id: str, sql: str) -> "DashBuilder":
        self._data.append(DashDataSource(id=source_id, type="sql", sql=sql))
        return self

    def add_chart(self, chart: Union[Chart, ChartBuilder]) -> "DashBuilder":
        self._charts.append(chart.build() if isinstance(chart, ChartBuilder) else chart)
        return self

    def add_ref(self, chart_id: str, id: Optional[str] = None, title: Optional[str] = None) -> "DashBuilder":
        self._charts.append(DashChartRef(chart=chart_id, id=id, title=title))
        return self

    def build(self) -> Dash:
        return Dash(
            id=self._id,
            title=self._title,
            description=self._description,
            version=self._version,
            coordination=DashCoordination(auto=self._auto),
            data=self._data or None,
            charts=self._charts,
        )
