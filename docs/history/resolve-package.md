# @dvfc/resolve (archived)

This package was a thin re-export of connector / MetricFlow APIs. Those APIs live in `@dvfc/core`:

```ts
import { resolveDataRef, compileDbtMetricSql, normalizeFile } from '@dvfc/core';
```

The package was excluded from `pnpm-workspace.yaml` and then removed from the tree. Import `@dvfc/core` directly.
