#!/usr/bin/env python3
"""Python analogue of examples/site-gallery/landing.dash.yaml."""

from dvfc import ChartBuilder, ChartType, DashBuilder

note = (
    ChartBuilder("field_note", ChartType.TEXT)
    .content(
        "**Brush the timeline** to filter every view.\n\n"
        "Crossfiltering is declared in the spec — not wired in JavaScript."
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

timeline = (
    ChartBuilder("discovery_timeline", ChartType.AREA)
    .title("Discoveries over time")
    .data_source("worlds")
    .x("discovery_year", type="ordinal", label="Year")
    .y("planet", aggregate="count", label="Worlds")
    .brush("x", "era")
    .filter_by("era")
    .size(640, 260)
    .build()
)

methods = (
    ChartBuilder("discovery_methods", ChartType.DONUT)
    .title("Discovery methods")
    .data_source("worlds")
    .x("method", type="nominal")
    .y("planet", aggregate="count")
    .publishes("era")
    .filter_by("era")
    .size(360, 260)
    .build()
)

dash = (
    DashBuilder("cosmic-landing", "Other Worlds")
    .description("Brush the discovery timeline to filter linked views.")
    .add_csv("worlds", "exoplanets.csv")
    .add_chart(note)
    .add_chart(kpi)
    .add_chart(hab)
    .add_chart(timeline)
    .add_chart(methods)
    .build()
)

if __name__ == "__main__":
    from dvfc import DataVizFactoryClient

    print(DataVizFactoryClient().to_yaml(dash))
