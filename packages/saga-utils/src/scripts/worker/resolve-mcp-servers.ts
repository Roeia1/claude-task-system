/**
 * Resolve MCP servers for the SAGA worker.
 *
 * Checks .saga/config.json for explicit MCP server overrides.
 * If present, returns them so they can be passed to the Agent SDK.
 * Otherwise returns undefined, letting settingSources load MCPs from
 * .mcp.json and other filesystem settings.
 */

import { readFileSync } from 'node:fs';
import { createSagaPaths } from '../../directory.ts';

/**
 * Read .saga/config.json and return mcpServers if defined.
 * Returns undefined when the file is missing, has invalid JSON,
 * or does not contain an mcpServers field.
 */
function resolveMcpServers(projectDir: string): Record<string, unknown> | undefined {
  const { saga } = createSagaPaths(projectDir);
  const configPath = `${saga}/config.json`;

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
      return parsed.mcpServers as Record<string, unknown>;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export { resolveMcpServers };
