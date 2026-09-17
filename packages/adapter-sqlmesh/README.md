# @coordboard/adapter-sqlmesh

SQLMesh adapter for coordboard - resolve model references to data files.

## Installation

```bash
npm install @coordboard/adapter-sqlmesh
```

Or in monorepo:

```bash
pnpm add @coordboard/adapter-sqlmesh
```

## Usage

```typescript
import { createSqlMeshResolver } from '@coordboard/adapter-sqlmesh';

const resolver = createSqlMeshResolver({
  contextPath: 'sqlmesh/context.yaml',  // or .json
  dataDir: 'data',
  fileExtension: 'csv'  // or 'parquet'
});

// Resolve model to file path
const path = await resolver.resolve('my_model');
// => 'data/my_model.csv'

// Get model info
const info = await resolver.getModelInfo('my_model');
console.log(info);
// {
//   name: 'my_model',
//   kind: 'TABLE',
//   path: 'data/my_model.csv',
//   schema: 'default',
//   catalog: 'main'
// }

// List all models
const models = await resolver.listModels();
```

## API

### `createSqlMeshResolver(options)`

Create a new SQLMesh resolver.

**Options:**
- `contextPath` (string): Path to SQLMesh context.yaml or JSON metadata
- `dataDir` (string): Base directory for data files
- `fileExtension` (string, optional): File extension (default: 'csv')
- `pathResolver` (function, optional): Custom path resolver

**Returns:** `SqlMeshResolver`

### `SqlMeshResolver`

**Methods:**
- `loadContext()` - Load SQLMesh context from file
- `resolve(modelName)` - Resolve model to file path
- `getModelInfo(modelName)` - Get model metadata
- `listModels()` - List all models

## SQLMesh Context Format

This adapter expects a simplified SQLMesh context:

```yaml
models:
  my_schema.my_model:
    name: my_schema.my_model
    kind: TABLE
    dialect: duckdb
    description: "My model description"
    columns:
      id:
        name: id
        type: INTEGER
      value:
        name: value
        type: DOUBLE
    depends_on:
      - upstream_model

default_catalog: main
default_schema: my_schema
```

Or JSON:

```json
{
  "models": {
    "my_model": {
      "name": "my_model",
      "kind": "TABLE",
      ...
    }
  },
  "default_catalog": "main",
  "default_schema": "default"
}
```

## Integration with coordboard CLI

The coordboard CLI will auto-detect SQLMesh projects and use this adapter:

```bash
# Auto-detect from sqlmesh/ directory
coordboard build board.yaml --adapter sqlmesh

# Or specify context path
coordboard build board.yaml --sqlmesh-context sqlmesh/context.yaml
```

*(CLI integration coming soon)*

## Status

This is a **stub adapter** for v0.2 that demonstrates the ModelRef API pattern. It:
- ✅ Reads SQLMesh context metadata
- ✅ Resolves model names to file paths
- ✅ Supports CSV/Parquet data
- ⚠️ Does not yet query SQLMesh runtime
- ⚠️ Does not run SQLMesh plans
- ⚠️ Requires pre-exported model data

Future enhancements:
- Direct SQLMesh Python integration
- Query model outputs via SQLMesh API
- Read from SQLMesh state/plan files

## License

Apache-2.0
