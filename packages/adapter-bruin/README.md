# @dvfc/adapter-bruin

Bruin adapter for dvfc - resolve asset references to data files.

## Installation

```bash
npm install @dvfc/adapter-bruin
```

Or in monorepo:

```bash
pnpm add @dvfc/adapter-bruin
```

## Usage

```typescript
import { createBruinResolver } from '@dvfc/adapter-bruin';

const resolver = createBruinResolver({
  pipelinePath: 'pipeline.yml',
  dataDir: 'data',
  fileExtension: 'csv'  // or 'parquet'
});

// Resolve asset to file path
const path = await resolver.resolve('my_asset');
// => 'data/my_asset.csv'

// Get asset info
const info = await resolver.getAssetInfo('my_asset');
console.log(info);
// {
//   name: 'my_asset',
//   type: 'table',
//   path: 'data/my_asset.csv',
//   materialization: 'table'
// }

// List all assets
const assets = await resolver.listAssets();
```

## API

### `createBruinResolver(options)`

Create a new Bruin resolver.

**Options:**
- `pipelinePath` (string): Path to Bruin pipeline.yml or JSON metadata
- `dataDir` (string): Base directory for data files
- `fileExtension` (string, optional): File extension (default: 'csv')
- `pathResolver` (function, optional): Custom path resolver

**Returns:** `BruinResolver`

### `BruinResolver`

**Methods:**
- `loadPipeline()` - Load Bruin pipeline from file
- `resolve(assetName)` - Resolve asset to file path
- `getAssetInfo(assetName)` - Get asset metadata
- `listAssets()` - List all assets

## Bruin Pipeline Format

This adapter expects a Bruin pipeline definition:

```yaml
name: my_pipeline
schedule: "0 0 * * *"

default_connections:
  google_cloud_platform: gcp-conn
  snowflake: snowflake-conn

assets:
  my_schema.my_asset:
    name: my_schema.my_asset
    type: table
    description: "My asset description"
    columns:
      - name: id
        type: INTEGER
        description: "Primary key"
      - name: value
        type: DOUBLE
    materialization:
      type: table
      strategy: merge
    depends:
      - upstream_asset
```

Or JSON:

```json
{
  "name": "my_pipeline",
  "assets": {
    "my_asset": {
      "name": "my_asset",
      "type": "table",
      ...
    }
  }
}
```

## Integration with dvfc CLI

The dvfc CLI will auto-detect Bruin projects and use this adapter:

```bash
# Auto-detect from pipeline.yml
dvfc build board.yaml --adapter bruin

# Or specify pipeline path
dvfc build board.yaml --bruin-pipeline pipeline.yml
```

*(CLI integration coming soon)*

## Status

This is a **stub adapter** for v0.2 that demonstrates the ModelRef API pattern. It:
- ✅ Reads Bruin pipeline metadata
- ✅ Resolves asset names to file paths
- ✅ Supports CSV/Parquet data
- ⚠️ Does not yet query Bruin runtime
- ⚠️ Does not run Bruin pipelines
- ⚠️ Requires pre-exported asset data

Future enhancements:
- Direct Bruin CLI integration
- Query asset outputs via Bruin API
- Read from Bruin lineage files
- Support quality checks

## License

Apache-2.0
