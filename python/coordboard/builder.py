"""
Dashboard builder - fluent API for creating dashboards
"""

from typing import Any, Dict, List, Optional

from .spec import (
    ChartSpec,
    ChartType,
    DashboardSpec,
    DataSource,
    DataSourceType,
    Encoding,
    EncodingChannel,
    InteractionSpec,
    LayoutSpec,
    MetaSpec,
    ThemeSpec,
)


class ChartBuilder:
    """Builder for chart specifications"""

    def __init__(self, chart_id: str, chart_type: ChartType, data_source: str):
        self._spec: Dict[str, Any] = {
            "id": chart_id,
            "type": chart_type,
            "dataSource": data_source,
            "encoding": {},
        }

    def title(self, title: str) -> "ChartBuilder":
        """Set chart title"""
        self._spec["title"] = title
        return self

    def x(
        self,
        field: str,
        type: Optional[str] = None,
        aggregate: Optional[str] = None,
        label: Optional[str] = None,
    ) -> "ChartBuilder":
        """Set x encoding"""
        channel: Dict[str, Any] = {"field": field}
        if type:
            channel["type"] = type
        if aggregate:
            channel["aggregate"] = aggregate
        if label:
            channel["label"] = label
        self._spec["encoding"]["x"] = channel
        return self

    def y(
        self,
        field: str,
        type: Optional[str] = None,
        aggregate: Optional[str] = None,
        label: Optional[str] = None,
    ) -> "ChartBuilder":
        """Set y encoding"""
        channel: Dict[str, Any] = {"field": field}
        if type:
            channel["type"] = type
        if aggregate:
            channel["aggregate"] = aggregate
        if label:
            channel["label"] = label
        self._spec["encoding"]["y"] = channel
        return self

    def color(self, color: str) -> "ChartBuilder":
        """Set color"""
        self._spec["encoding"]["color"] = color
        return self

    def size(self, width: int, height: int) -> "ChartBuilder":
        """Set chart dimensions"""
        self._spec["width"] = width
        self._spec["height"] = height
        return self

    def brush(self, axis: str, selection: str) -> "ChartBuilder":
        """Add brush interaction"""
        if "interaction" not in self._spec:
            self._spec["interaction"] = {}
        self._spec["interaction"]["brush"] = True
        self._spec["interaction"]["brushAxis"] = axis
        self._spec["interaction"]["selection"] = selection
        return self

    def filter_by(self, selection: str) -> "ChartBuilder":
        """Add filter interaction"""
        if "interaction" not in self._spec:
            self._spec["interaction"] = {}
        self._spec["interaction"]["filterBy"] = selection
        return self

    def build(self) -> ChartSpec:
        """Build the chart specification"""
        return ChartSpec(**self._spec)


class DashboardBuilder:
    """Builder for dashboard specifications"""

    def __init__(self, title: str, description: Optional[str] = None):
        self._meta = MetaSpec(title=title, description=description)
        self._data_sources: List[DataSource] = []
        self._charts: List[ChartSpec] = []
        self._layout: Optional[LayoutSpec] = None
        self._theme: Optional[ThemeSpec] = None

    def add_dbt_source(self, source_id: str, model: str) -> "DashboardBuilder":
        """Add a dbt data source"""
        self._data_sources.append(
            DataSource(id=source_id, type=DataSourceType.DBT, model=model)
        )
        return self

    def add_csv_source(self, source_id: str, path: str) -> "DashboardBuilder":
        """Add a CSV data source"""
        self._data_sources.append(
            DataSource(id=source_id, type=DataSourceType.CSV, path=path)
        )
        return self

    def add_chart(self, chart: ChartSpec) -> "DashboardBuilder":
        """Add a chart specification"""
        self._charts.append(chart)
        return self

    def chart(self, chart_id: str, chart_type: ChartType, data_source: str) -> ChartBuilder:
        """Create a new chart builder"""
        builder = ChartBuilder(chart_id, chart_type, data_source)
        # Store reference to add to dashboard when built
        original_build = builder.build

        def wrapped_build() -> ChartSpec:
            spec = original_build()
            self._charts.append(spec)
            return spec

        builder.build = wrapped_build  # type: ignore
        return builder

    def layout(self, type: str = "flex", gap: int = 16) -> "DashboardBuilder":
        """Set layout configuration"""
        self._layout = LayoutSpec(type=type, gap=gap)  # type: ignore
        return self

    def theme(self, colors: Optional[List[str]] = None, font_family: Optional[str] = None) -> "DashboardBuilder":
        """Set theme configuration"""
        self._theme = ThemeSpec(colors=colors, fontFamily=font_family)
        return self

    def build(self) -> DashboardSpec:
        """Build the dashboard specification"""
        return DashboardSpec(
            meta=self._meta,
            data=self._data_sources,
            charts=self._charts,
            layout=self._layout,
            theme=self._theme,
        )
