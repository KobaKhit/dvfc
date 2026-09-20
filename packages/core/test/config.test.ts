/**
 * Tests for loadDvfcConfig / applyDvfcConfig
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDvfcConfig,
  applyDvfcConfig,
  clearChartTypes,
  hasChartType,
  _resetBuiltinRegistrationForTests,
} from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const helloFixture = join(__dirname, 'fixtures/hello-chart-type.js');

describe('loadDvfcConfig', () => {
  it('returns {} when no config present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-cfg-'));
    const cfg = await loadDvfcConfig(dir);
    assert.deepEqual(cfg, {});
  });

  it('loads dvfc.config.json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-cfg-'));
    await writeFile(
      join(dir, 'dvfc.config.json'),
      JSON.stringify({ chartTypes: ['./x.js'], note: 'json' })
    );
    const cfg = await loadDvfcConfig(dir);
    assert.equal(cfg.note, 'json');
    assert.deepEqual(cfg.chartTypes, ['./x.js']);
  });

  it('loads dvfc.config.js with default export', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-cfg-'));
    await writeFile(
      join(dir, 'dvfc.config.js'),
      `export default { chartTypes: [], label: 'js-config' };\n`
    );
    const cfg = await loadDvfcConfig(dir);
    assert.equal(cfg.label, 'js-config');
  });
});

describe('applyDvfcConfig', () => {
  it('registers builtins when config is empty', async () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-cfg-'));
    await applyDvfcConfig(dir);
    assert.ok(hasChartType('line'));
  });

  it('loads relative chartTypes from config', async () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-cfg-'));
    const typesDir = join(dir, 'types');
    await mkdir(typesDir);
    const src = await readFile(helloFixture, 'utf-8');
    await writeFile(join(typesDir, 'hello.js'), src);
    await writeFile(
      join(dir, 'dvfc.config.json'),
      JSON.stringify({ chartTypes: ['./types/hello.js'] })
    );
    await applyDvfcConfig(dir);
    assert.ok(hasChartType('hello'));
    assert.ok(hasChartType('line'));
  });
});
