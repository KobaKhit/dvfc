# Add a chart type plugin

dvfc chart types are **plugins** implementing `ChartTypeModule` in `@dvfc/core`. Built-ins (line, bar, area, …) use the same contract as third-party types.

## Contract

```typescript
interface ChartTypeModule {
  id: string;
  label?: string;
  description?: string;
  capabilities: {
    mosaic?: boolean;
    vegaLite?: boolean;
    interaction?: Array<'brush' | 'filter' | 'toggle'>;
  };
  optionsSchema?: Record<string, unknown>;
  validate?(chart: unknown): ValidationIssue[];
  renderMosaic?(ctx: ChartRenderContext): unknown;
  renderVegaLite?(ctx: ChartRenderContext): unknown;
}
```

- **id** — value of `type:` in `*.chart.yaml` and inline dash charts.
- **capabilities** — drives CLI/MCP listing (`dvfc charts types`) and export paths (Mosaic HTML vs Vega-Lite SVG/PNG).
- **validate** — optional encoding/options checks beyond JSON Schema.
- **renderMosaic** / **renderVegaLite** — emit renderer-specific specs (generator calls these as types migrate off the central switch).

See [ARCHITECTURE.md](./ARCHITECTURE.md) §7 for the full renderer story.

## Minimal plugin

Example fixture: `packages/core/test/fixtures/hello-chart-type.js`

```javascript
const helloChartType = {
  id: 'hello',
  label: 'Hello',
  capabilities: { mosaic: true, vegaLite: false, interaction: [] },
  validate(chart) {
    const msg = chart?.options?.message;
    if (msg != null && typeof msg !== 'string') {
      return [{ path: '/options/message', message: 'message must be a string' }];
    }
    return [];
  },
};

export default helloChartType;
```

## Register at runtime

```javascript
import { loadChartTypeModules } from '@dvfc/core';

await loadChartTypeModules([
  '/absolute/path/to/my-chart-type.js',
]);
```

`loadChartTypeModules` dynamic-imports each path and registers:

- `export default` module object, or
- `export default` array of modules, or
- named export `chartType`.

Duplicate `id` values overwrite the previous registration.

Built-ins are registered via `registerBuiltinChartTypes()` (CLI calls this before `charts types`).

## Author a chart spec

```yaml
id: greeting
type: hello
title: Plugin demo
data:
  type: sql
  query: SELECT 1 AS n
encoding:
  x: { field: n, type: quantitative }
options:
  message: "Hello from a plugin"
```

## Verify

```bash
pnpm exec dvfc charts types    # should list `hello`
pnpm exec dvfc validate greeting.chart.yaml
```

## MCP / agents

After loading plugins in your process, use the **`list_chart_types`** MCP tool (alias of `dvfc charts types`) so agents know which `type:` values are valid.

## Checklist for production types

1. Implement at least one renderer (`renderMosaic` and/or `renderVegaLite`).
2. Document required encoding fields in `description` or `optionsSchema`.
3. Add a golden test chart under `packages/core/test/fixtures/` or `examples/charts/`.
4. Set `capabilities.interaction` accurately for coordination docs.
