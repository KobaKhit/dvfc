/**
 * Load dvfc.config.js / .mjs / .cjs / .json from a project root.
 * Config may declare extra chart type modules to load.
 */
import { access, readFile } from 'fs/promises';
import { join, resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import { loadChartTypeModules, registerChartType, } from './registry.js';
import { registerBuiltinChartTypes } from './builtins.js';
const CONFIG_NAMES = ['dvfc.config.js', 'dvfc.config.mjs', 'dvfc.config.cjs'];
async function fileExists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Find and load dvfc.config.* from projectRoot. Returns {} if none found.
 */
export async function loadDvfcConfig(projectRoot = process.cwd()) {
    const root = resolvePath(projectRoot);
    for (const name of CONFIG_NAMES) {
        const path = join(root, name);
        if (!(await fileExists(path)))
            continue;
        const href = pathToFileURL(path).href;
        const mod = await import(href);
        const cfg = (mod.default ?? mod);
        return cfg && typeof cfg === 'object' ? cfg : {};
    }
    const jsonPath = join(root, 'dvfc.config.json');
    if (await fileExists(jsonPath)) {
        const text = await readFile(jsonPath, 'utf-8');
        return JSON.parse(text);
    }
    return {};
}
/**
 * Register builtins then load chartTypes from dvfc.config (if present).
 */
export async function applyDvfcConfig(projectRoot = process.cwd()) {
    registerBuiltinChartTypes();
    const cfg = await loadDvfcConfig(projectRoot);
    if (!cfg.chartTypes?.length)
        return cfg;
    const filePaths = [];
    const packageNames = [];
    for (const p of cfg.chartTypes) {
        if (p.startsWith('.') || p.startsWith('/')) {
            filePaths.push(resolvePath(projectRoot, p));
        }
        else {
            packageNames.push(p);
        }
    }
    if (filePaths.length)
        await loadChartTypeModules(filePaths);
    for (const name of packageNames) {
        const mod = await import(name);
        const candidate = (mod.default ?? mod.chartType ?? mod);
        const list = Array.isArray(candidate) ? candidate : [candidate];
        for (const m of list) {
            if (!m?.id)
                throw new Error(`Chart type module '${name}' missing id`);
            registerChartType(m);
        }
    }
    return cfg;
}
