/**
 * Dump published JSON Schema files for Python / external consumers.
 * Invoked from @dvfc/core build after tsc (plain ESM — no TS strip flag).
 *
 * `dashboard-spec.json` is kept for Python legacy DashboardSpec validation
 * (python/dvfc/validate.py). Chart/dash IR schemas are the primary authoring surface.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreDist = join(root, 'packages/core/dist');
const { DashboardSpecSchema } = require(join(coreDist, 'schema.js'));
const { ChartIRSchema, DashIRSchema } = require(join(coreDist, 'ir-schema.js'));

const outDir = join(root, 'packages/core/schema');
const pyDir = join(root, 'python/dvfc/schema');
await mkdir(outDir, { recursive: true });
await mkdir(pyDir, { recursive: true });

const files = {
  'dashboard-spec.json': DashboardSpecSchema,
  'chart.json': ChartIRSchema,
  'dash.json': DashIRSchema,
};

for (const [name, schema] of Object.entries(files)) {
  const body = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(join(outDir, name), body);
  await writeFile(join(pyDir, name), body);
  console.log(`wrote packages/core/schema/${name}`);
  console.log(`wrote python/dvfc/schema/${name}`);
}
