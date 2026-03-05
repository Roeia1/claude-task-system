/**
 * Resolve worker configuration from .saga/config.json.
 *
 * Reads the optional `worker` section from .saga/config.json and returns
 * validated worker options. Returns an empty object when the file is missing,
 * has invalid JSON, or does not contain a worker field.
 */

import { readFileSync } from 'node:fs';
import { createSagaPaths } from '../../directory.ts';

interface WorkerConfig {
  maxCycles?: number;
  maxTime?: number;
  maxTasksPerSession?: number;
  maxTokensPerSession?: number;
  model?: string;
}

const INT_KEYS: ReadonlyArray<keyof WorkerConfig> = [
  'maxCycles',
  'maxTime',
  'maxTasksPerSession',
  'maxTokensPerSession',
];

/**
 * Extract a positive integer from a raw value, or undefined if invalid.
 */
function toPositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return undefined;
  }
  return value;
}

/**
 * Read .saga/config.json and return validated worker config options.
 * Returns an empty object when the file is missing, invalid, or has no worker section.
 */
function resolveWorkerConfig(projectDir: string): WorkerConfig {
  const { saga } = createSagaPaths(projectDir);
  const configPath = `${saga}/config.json`;

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!parsed.worker || typeof parsed.worker !== 'object') {
      return {};
    }

    const worker = parsed.worker as Record<string, unknown>;
    const result: WorkerConfig = {};

    for (const key of INT_KEYS) {
      const value = toPositiveInt(worker[key]);
      if (value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    if (typeof worker.model === 'string' && worker.model.length > 0) {
      result.model = worker.model;
    }

    return result;
  } catch {
    return {};
  }
}

export { resolveWorkerConfig };
export type { WorkerConfig };
