import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('saga dashboard command', () => {
  let tempDir: string;
  const cliPath = join(__dirname, '..', '..', 'dist', 'cli.cjs');

  beforeEach(() => {
    // Create a temp directory for test isolation
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-dashboard-test-')));
  });

  afterEach(() => {
    // Cleanup temp directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  function runCli(args: string, options: { cwd?: string } = {}): { stdout: string; stderr: string; exitCode: number } {
    try {
      const stdout = execSync(`node ${cliPath} ${args}`, {
        cwd: options.cwd || tempDir,
        encoding: 'utf-8',
        env: { ...process.env },
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || '',
        exitCode: error.status || 1,
      };
    }
  }

  function createSagaProject(path: string): void {
    mkdirSync(join(path, '.saga'), { recursive: true });
  }

  it('prints placeholder message when called without options', () => {
    createSagaProject(tempDir);
    const result = runCli('dashboard', { cwd: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Starting dashboard server on port 3847');
    expect(result.stdout).toContain('Dashboard will be available at http://localhost:3847');
    expect(result.stdout).toContain('Dashboard server implementation pending');
  });

  it('uses custom port when --port option is provided', () => {
    createSagaProject(tempDir);
    const result = runCli('dashboard --port 4000', { cwd: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Starting dashboard server on port 4000');
    expect(result.stdout).toContain('Dashboard will be available at http://localhost:4000');
  });

  it('uses custom port when --port option with equals sign', () => {
    createSagaProject(tempDir);
    const result = runCli('dashboard --port=5000', { cwd: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Starting dashboard server on port 5000');
    expect(result.stdout).toContain('Dashboard will be available at http://localhost:5000');
  });

  it('resolves project path with global --path option', () => {
    const projectDir = join(tempDir, 'my-project');
    mkdirSync(projectDir, { recursive: true });
    createSagaProject(projectDir);

    // Run from temp dir with --path pointing to project
    const result = runCli(`--path ${projectDir} dashboard`, { cwd: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Starting dashboard server');
  });

  it('exits with 0 for placeholder success', () => {
    createSagaProject(tempDir);
    const result = runCli('dashboard', { cwd: tempDir });

    expect(result.exitCode).toBe(0);
  });

  it('fails with helpful error when no SAGA project found', () => {
    // No .saga/ directory created
    const result = runCli('dashboard', { cwd: tempDir });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('SAGA project');
  });

  it('discovers project from subdirectory', () => {
    createSagaProject(tempDir);
    const subDir = join(tempDir, 'nested', 'deep', 'dir');
    mkdirSync(subDir, { recursive: true });

    const result = runCli('dashboard', { cwd: subDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Starting dashboard server on port 3847');
  });

  it('shows project path in output', () => {
    createSagaProject(tempDir);
    const result = runCli('dashboard', { cwd: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Project:');
    expect(result.stdout).toContain(tempDir);
  });
});
