#!/usr/bin/env node

/**
 * Simple CLI to test the dbt resolver
 * Usage: node dbt-cli.js [model_name]
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DbtResolver {
  constructor(manifestPath, dataDir) {
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    this.manifest = JSON.parse(manifestContent);
    this.dataDir = dataDir;
  }

  ref(modelName) {
    const nodeKey = Object.keys(this.manifest.nodes).find(key => {
      const node = this.manifest.nodes[key];
      return node.resource_type === 'model' && node.name === modelName;
    });

    if (!nodeKey) {
      throw new Error(`Model '${modelName}' not found in manifest`);
    }

    const node = this.manifest.nodes[nodeKey];
    return resolve(this.dataDir, `${node.name}.csv`);
  }

  listModels() {
    return Object.values(this.manifest.nodes)
      .filter(node => node.resource_type === 'model')
      .map(node => node.name);
  }

  getModelInfo(modelName) {
    const nodeKey = Object.keys(this.manifest.nodes).find(key => {
      const node = this.manifest.nodes[key];
      return node.resource_type === 'model' && node.name === modelName;
    });

    return nodeKey ? this.manifest.nodes[nodeKey] : undefined;
  }
}

// CLI usage
const modelName = process.argv[2];

const resolver = new DbtResolver(
  resolve(__dirname, '../dbt-stub/manifest.json'),
  resolve(__dirname, '../dbt-stub')
);

if (!modelName) {
  console.log('Available dbt models:');
  const models = resolver.listModels();
  models.forEach(model => {
    console.log(`  - ${model}`);
  });
  console.log('\nUsage: node dbt-cli.js [model_name]');
  process.exit(0);
}

try {
  const filePath = resolver.ref(modelName);
  const info = resolver.getModelInfo(modelName);
  
  console.log(`\nModel: ${modelName}`);
  console.log(`File: ${filePath}`);
  console.log(`Schema: ${info?.schema}`);
  console.log(`Database: ${info?.database}`);
  console.log(`Relation: ${info?.relation_name}`);
  
  // Check if file exists
  try {
    readFileSync(filePath, 'utf-8');
    console.log('✅ File exists and is readable\n');
  } catch {
    console.log('❌ File not found\n');
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
