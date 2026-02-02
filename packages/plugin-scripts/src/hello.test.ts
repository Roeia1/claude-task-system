import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginScriptsDir = join(__dirname, '..', '..', '..', 'plugin', 'scripts');
const helloScriptPath = join(pluginScriptsDir, 'hello.js');

describe('hello placeholder script', () => {
  describe('source module', () => {
    it('exports a hello function', async () => {
      const { hello } = await import('./hello.ts');
      expect(typeof hello).toBe('function');
    });

    it('hello function returns expected message', async () => {
      const { hello } = await import('./hello.ts');
      expect(hello()).toBe('Hello from plugin-scripts!');
    });
  });

  describe('built output', () => {
    it('built script exists at plugin/scripts/hello.js', () => {
      // This test requires running `pnpm build` first
      expect(existsSync(helloScriptPath)).toBe(true);
    });

    it('built script is executable and outputs expected message', () => {
      // This test requires running `pnpm build` first
      const output = execSync(`node ${helloScriptPath}`, {
        encoding: 'utf-8',
      }).trim();
      expect(output).toBe('Hello from plugin-scripts!');
    });
  });
});
