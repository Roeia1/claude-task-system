/**
 * Tests for worker/resolve-worker-config.ts
 *
 * Tests the resolveWorkerConfig function which reads the worker section
 * from .saga/config.json and returns validated worker options.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from 'node:fs';
import { resolveWorkerConfig } from './resolve-worker-config.ts';

const mockReadFileSync = vi.mocked(readFileSync);

describe('resolveWorkerConfig', () => {
  const projectDir = '/project';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return all valid worker options from config', () => {
    const config = {
      worker: {
        maxCycles: 5,
        maxTime: 30,
        maxTasksPerSession: 10,
        maxTokensPerSession: 30_000,
        model: 'sonnet',
      },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({
      maxCycles: 5,
      maxTime: 30,
      maxTasksPerSession: 10,
      maxTokensPerSession: 30_000,
      model: 'sonnet',
    });
    expect(mockReadFileSync).toHaveBeenCalledWith(`${projectDir}/.saga/config.json`, 'utf-8');
  });

  it('should return empty object when .saga/config.json does not exist', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({});
  });

  it('should return empty object when config has no worker section', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ mcpServers: {} }));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({});
  });

  it('should return empty object when worker section is not an object', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ worker: 'invalid' }));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({});
  });

  it('should return empty object when config contains invalid JSON', () => {
    mockReadFileSync.mockReturnValue('not valid json {{{');

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({});
  });

  it('should skip non-integer numeric values', () => {
    const config = {
      worker: {
        maxCycles: 5.5,
        maxTime: 30,
      },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({ maxTime: 30 });
  });

  it('should skip zero and negative values', () => {
    const config = {
      worker: {
        maxCycles: 0,
        maxTime: -10,
        maxTasksPerSession: 5,
      },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({ maxTasksPerSession: 5 });
  });

  it('should skip non-numeric values for integer fields', () => {
    const config = {
      worker: {
        maxCycles: 'five',
        maxTokensPerSession: true,
        maxTasksPerSession: 3,
      },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({ maxTasksPerSession: 3 });
  });

  it('should skip empty string model', () => {
    const config = {
      worker: {
        model: '',
      },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({});
  });

  it('should skip non-string model', () => {
    const config = {
      worker: {
        model: 123,
      },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({});
  });

  it('should return partial config when only some fields are valid', () => {
    const config = {
      worker: {
        maxCycles: 3,
        model: 'opus',
        unknownField: 'ignored',
      },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    const result = resolveWorkerConfig(projectDir);

    expect(result).toEqual({ maxCycles: 3, model: 'opus' });
  });
});
