#!/usr/bin/env python3
"""Python analogue of examples/site-gallery/landing.dash.yaml."""

from dvfc import ChartBuilder, ChartType, DashBuilder

note = (
    ChartBuilder("field_note", ChartType.TEXT)
    .content(
        "**Brush the timeline** to filter every view.\n\n"
        "Click a donut slice or brush the scatter — linking is declared in the spec, not wired in JavaScript."
    )
    .build()
)

kpi = (
    ChartBuilder("world_count", ChartType.NUMBER)
    .title("Worlds in view")
    .data_source("worlds")
    .y("planet", aggregate="count")
    .filter_by("era")
    .build()
)

hab = (
    ChartBuilder("avg_habitability", ChartType.NUMBER)
    .title("Avg habitability")
    .data_source("worlds")
    .y("habitability_score", aggregate="avg")
    .filter_by("era")
    .build()
)

dist = (
    ChartBuilder("avg_distance", ChartType.NUMBER)
    .title("Avg distance (ly)")
    .data_source("worlds")
    .y("distance_ly", aggregate="avg")
    .filter_by("era")
    .build()
)

timeline = (
    ChartBuilder("discovery_timeline", ChartType.AREA)
    .title("Discoveries over time")
    .data_source("worlds")
    .x("discovery_year", type="ordinal")
    .y("planet", aggregate="count")
    .brush("x", "era")
    .filter_by("era")
    .size(640, 260)
    .build()
)

methods = (
    ChartBuilder("discovery_methods", ChartType.DONUT)
    .title("By discovery method")
    .data_source("worlds")
    .x("method", type="nominal")
    .y("planet", aggregate="count")
    .publishes("era")
    .filter_by("era")
    .size(360, 260)
    .build()
)

scatter = (
    ChartBuilder("habitability_scatter", ChartType.SCATTER)
    .title("Habitability vs temperature")
    .data_source("worlds")
    .x("equilibrium_k", type="quantitative")
    .y("habitability_score", type="quantitative")
    .color("method", type="nominal")
    .filter_by("era")
    .size(640, 280)
    .build()
)

missions = (
    ChartBuilder("missions_bar", ChartType.BAR)
    .title("Worlds by mission")
    .data_source("worlds")
    .x("mission", type="nominal")
    .y("planet", aggregate="count")
    .filter_by("era")
    .size(360, 280)
    .build()
)

dash = (
    DashBuilder("cosmic-landing", "Other Worlds")
    .description("Brush the timeline, click a slice, or brush the scatter — every view stays in sync.")
    .add_csv("worlds", "exoplanets.csv")
    .add_chart(note)
    .add_chart(kpi)
    .add_chart(hab)
    .add_chart(dist)
    .add_chart(timeline)
    .add_chart(methods)
    .add_chart(scatter)
    .add_chart(missions)
    .build()
)

if __name__ == "__main__":
    from dvfc import DataVizFactoryClient

    print(DataVizFactoryClient().to_yaml(dash))
