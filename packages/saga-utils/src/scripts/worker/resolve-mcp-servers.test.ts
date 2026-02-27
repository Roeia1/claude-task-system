/**
 * Tests for worker/resolve-mcp-servers.ts
 *
 * Tests the resolveMcpServers function which reads .saga/config.json
 * and returns mcpServers if present, or undefined to let settingSources handle it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from 'node:fs';
import { resolveMcpServers } from './resolve-mcp-servers.ts';

const mockReadFileSync = vi.mocked(readFileSync);

describe('resolveMcpServers', () => {
  const projectDir = '/project';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return mcpServers from .saga/config.json when present', () => {
    const mcpServers = {
      shadcn: { command: 'npx', args: ['-y', '@anthropic-ai/shadcn-mcp'] },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify({ mcpServers }));

    const result = resolveMcpServers(projectDir);

    expect(result).toEqual(mcpServers);
    expect(mockReadFileSync).toHaveBeenCalledWith(`${projectDir}/.saga/config.json`, 'utf-8');
  });

  it('should return undefined when .saga/config.json does not exist', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    const result = resolveMcpServers(projectDir);

    expect(result).toBeUndefined();
  });

  it('should return undefined when .saga/config.json has no mcpServers field', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ otherField: 'value' }));

    const result = resolveMcpServers(projectDir);

    expect(result).toBeUndefined();
  });

  it('should return undefined when .saga/config.json contains invalid JSON', () => {
    mockReadFileSync.mockReturnValue('not valid json {{{');

    const result = resolveMcpServers(projectDir);

    expect(result).toBeUndefined();
  });
});
