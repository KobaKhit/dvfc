# @dvfc/resolve

Resolve `DataRef` connectors (`dbt`, `dbt_metric`, `sql`, `data`) into relations and file assets for Mosaic / Vega renderers.

```ts
import { resolveDataRef, findDbtStubDir } from '@dvfc/resolve';

const rel = await resolveDataRef(
  { type: 'dbt', model: 'sales_daily' },
  'sales_daily',
  { specDir: process.cwd() }
);
```

## `dbt_metric`

dvfc does **not** define a metric language. Put MetricFlow-compiled SQL at:

- `semantic/<metric>.sql`, or
- `metrics/<metric>.sql`, or
- `dbt-stub/semantic/<metric>.sql`

relative to the chart/dash or project root.
