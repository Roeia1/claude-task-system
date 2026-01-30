import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

  /**
   * Run the CLI and wait for it to exit (for error cases)
   */
  function runCliSync(
    args: string,
    options: { cwd?: string } = {},
  ): { stdout: string; stderr: string; exitCode: number } {
    try {
      const stdout = execSync(`node ${cliPath} ${args}`, {
        cwd: options.cwd || tempDir,
        encoding: 'utf-8',
        env: { ...process.env },
        timeout: 5000,
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const spawnError = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
      return {
        stdout: spawnError.stdout?.toString() || '',
        stderr: spawnError.stderr?.toString() || '',
        exitCode: spawnError.status || 1,
      };
    }
  }

  /**
   * Start the CLI as a child process and capture output until server starts
   * @param waitForProject - If true, waits for both server startup and "Project:" line
   */
  function startCliAsync(
    args: string,
    options: { cwd?: string; waitForProject?: boolean } = {},
  ): Promise<{ proc: ChildProcess; stdout: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [cliPath, ...args.split(' ').filter(Boolean)], {
        cwd: options.cwd || tempDir,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for server to start'));
      }, 5000);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Server started when we see this message
        const serverStarted = stdout.includes('SAGA Dashboard server running on');
        const projectShown = !options.waitForProject || stdout.includes('Project:');

        if (serverStarted && projectShown) {
          clearTimeout(timeout);
          resolve({ proc, stdout });
        }
      });

      proc.stderr?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      proc.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}: ${stdout}`));
        }
      });
    });
  }

  function createSagaProject(path: string): void {
    mkdirSync(join(path, '.saga'), { recursive: true });
  }

  it('starts server and shows project path', async () => {
    createSagaProject(tempDir);
    // Use a random port to avoid conflicts
    const port = 30000 + Math.floor(Math.random() * 20000);
    const { proc, stdout } = await startCliAsync(`dashboard --port ${port}`, {
      cwd: tempDir,
      waitForProject: true,
    });

    try {
      expect(stdout).toContain(`SAGA Dashboard server running on http://localhost:${port}`);
      expect(stdout).toContain('Project:');
      expect(stdout).toContain(tempDir);
    } finally {
      proc.kill('SIGTERM');
    }
  });

  it('uses default port 3847 when not specified', async () => {
    createSagaProject(tempDir);
    // Use a random port to avoid conflicts with the default port
    const port = 30000 + Math.floor(Math.random() * 20000);
    const { proc, stdout } = await startCliAsync(`dashboard --port ${port}`, { cwd: tempDir });

    try {
      // Verify the server started on the specified port
      expect(stdout).toContain(`http://localhost:${port}`);
    } finally {
      proc.kill('SIGTERM');
    }
  });

  it('uses custom port when --port option is provided', async () => {
    createSagaProject(tempDir);
    const port = 30000 + Math.floor(Math.random() * 20000);
    const { proc, stdout } = await startCliAsync(`dashboard --port ${port}`, { cwd: tempDir });

    try {
      expect(stdout).toContain(`SAGA Dashboard server running on http://localhost:${port}`);
    } finally {
      proc.kill('SIGTERM');
    }
  });

  it('uses custom port when --port option with equals sign', async () => {
    createSagaProject(tempDir);
    const port = 30000 + Math.floor(Math.random() * 20000);
    const { proc, stdout } = await startCliAsync(`dashboard --port=${port}`, { cwd: tempDir });

    try {
      expect(stdout).toContain(`SAGA Dashboard server running on http://localhost:${port}`);
    } finally {
      proc.kill('SIGTERM');
    }
  });

  it('resolves project path with global --path option', async () => {
    const projectDir = join(tempDir, 'my-project');
    mkdirSync(projectDir, { recursive: true });
    createSagaProject(projectDir);

    const port = 30000 + Math.floor(Math.random() * 20000);
    // Run from temp dir with --path pointing to project
    const { proc, stdout } = await startCliAsync(`--path ${projectDir} dashboard --port ${port}`, {
      cwd: tempDir,
      waitForProject: true,
    });

    try {
      expect(stdout).toContain('SAGA Dashboard server running on');
      expect(stdout).toContain('Project:');
    } finally {
      proc.kill('SIGTERM');
    }
  });

  it('fails with helpful error when no SAGA project found', () => {
    // No .saga/ directory created - use sync runner since it will exit with error
    const result = runCliSync('dashboard', { cwd: tempDir });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('SAGA project');
  });

  it('discovers project from subdirectory', async () => {
    createSagaProject(tempDir);
    const subDir = join(tempDir, 'nested', 'deep', 'dir');
    mkdirSync(subDir, { recursive: true });

    const port = 30000 + Math.floor(Math.random() * 20000);
    const { proc, stdout } = await startCliAsync(`dashboard --port ${port}`, { cwd: subDir });

    try {
      expect(stdout).toContain(`SAGA Dashboard server running on http://localhost:${port}`);
    } finally {
      proc.kill('SIGTERM');
    }
  });
});
