/**
 * CLI format validation + svg smoke (spawns built entry point)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(pkgRoot, '../..');
const cli = join(pkgRoot, 'dist/cli.js');
const chart = join(repoRoot, 'examples/charts/revenue_trend.chart.yaml');

function runCli(args: string[]): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });
  return {
    status: result.status,
    stderr: result.stderr || '',
    stdout: result.stdout || '',
  };
}

test('build rejects unknown format with exit 1', () => {
  const { status, stderr } = runCli([
    'build',
    chart,
    '-f',
    'htlm',
    '-o',
    '/tmp/dvfc-cli-bad-format',
  ]);
  assert.equal(status, 1);
  assert.match(stderr, /Unknown format 'htlm'/);
});

test('build -f svg writes a non-empty SVG file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-cli-svg-'));
  const out = join(dir, 'chart.svg');
  try {
    const { status, stderr } = runCli(['build', chart, '-f', 'svg', '-o', out]);
    assert.equal(status, 0, stderr);
    const svg = await readFile(out, 'utf-8');
    assert.ok(svg.length > 100);
    assert.match(svg, /<svg[\s>]/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
