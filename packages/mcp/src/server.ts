#!/usr/bin/env node

/**
 * MCP Server for Data Viz Factory
 * Thin wiring; tool definitions + handlers live in ./tools.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'node:module';
import { TOOL_DEFINITIONS, handleTool } from './tools.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version?: string };

const server = new Server(
  {
    name: 'dvfc-mcp',
    version: pkg.version || '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const text = await handleTool(name, (args ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text' as const, text }] };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`dvfc MCP server running (v${pkg.version || '0.1.0'})`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
