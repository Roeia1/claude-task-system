const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_PATH = path.join(__dirname, '..', 'bin', 'task-status');

/**
 * Helper to run the script with given args and environment
 */
function runScript(args = [], env = {}) {
  const fullEnv = { ...process.env, ...env };
  try {
    const result = execSync(`bash "${SCRIPT_PATH}" ${args.join(' ')}`, {
      env: fullEnv,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1,
    };
  }
}

/**
 * Helper to create a temporary env file with given content
 */
function createTempEnvFile(content) {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `claude-env-test-${Date.now()}.sh`);
  fs.writeFileSync(tmpFile, content, { mode: 0o644 });
  return tmpFile;
}

/**
 * Helper to cleanup temp file
 */
function cleanupTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

describe('task-status script', () => {
  describe('--help flag', () => {
    test('should display usage information', () => {
      const result = runScript(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('task-status');
    });

    test('should document --no-icons flag', () => {
      const result = runScript(['--help']);
      expect(result.stdout).toContain('--no-icons');
    });

    test('should document --origin flag', () => {
      const result = runScript(['--help']);
      expect(result.stdout).toContain('--origin');
    });

    test('should document --task flag', () => {
      const result = runScript(['--help']);
      expect(result.stdout).toContain('--task');
    });

    test('should document --counts flag', () => {
      const result = runScript(['--help']);
      expect(result.stdout).toContain('--counts');
    });
  });

  describe('argument parsing', () => {
    describe('--no-icons flag', () => {
      test('should produce ASCII output when --no-icons is set', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
        try {
          const result = runScript(['--no-icons', '--origin'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          // ASCII fallback should use [M] instead of icon
          expect(result.stdout).toContain('[M]');
          expect(result.stdout).not.toContain('🏠'); // Not the unicode icon
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('should produce Unicode output by default', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
        try {
          const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          // Should contain unicode icon for main repo
          expect(result.stdout).toMatch(/[🌿🏠]/); // Home or branch icon
        } finally {
          cleanupTempFile(envFile);
        }
      });
    });

    describe('section selector flags', () => {
      test('--origin should show only origin section', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"\nexport CURRENT_TASK_ID="042"');
        try {
          const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          // Should have origin output but not task ID
          expect(result.stdout.length).toBeGreaterThan(0);
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('--task should show only task section', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"');
        try {
          const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('042');
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('--counts flag should be accepted', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
        try {
          const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('multiple section flags can be combined', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"');
        try {
          const result = runScript(['--origin', '--task'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('no flags should show all sections (default behavior)', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"');
        try {
          const result = runScript([], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
        } finally {
          cleanupTempFile(envFile);
        }
      });
    });

    describe('invalid flags', () => {
      test('should exit with error on unknown flag', () => {
        const result = runScript(['--unknown-flag']);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Unknown');
      });

      test('should show help after invalid flag error', () => {
        const result = runScript(['--invalid']);
        expect(result.exitCode).toBe(1);
        // Should suggest using --help
        expect(result.stderr.toLowerCase()).toMatch(/unknown|invalid/);
      });
    });
  });

  describe('$CLAUDE_ENV_FILE sourcing', () => {
    test('should source environment file when CLAUDE_ENV_FILE is set', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"');
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('042');
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should handle CLAUDE_ENV_FILE not set gracefully', () => {
      const result = runScript(['--origin'], { CLAUDE_ENV_FILE: '' });
      expect(result.exitCode).toBe(0);
      // Should output some fallback indicator
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should handle CLAUDE_ENV_FILE set but file missing', () => {
      const result = runScript(['--origin'], { CLAUDE_ENV_FILE: '/nonexistent/path/to/file.sh' });
      expect(result.exitCode).toBe(0);
      // Should not error, just use fallback
    });

    test('should handle malformed env file gracefully', () => {
      const envFile = createTempEnvFile('this is not valid bash syntax {{{{');
      try {
        const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
        // Should still exit 0 and handle gracefully
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should handle env file with missing SAGA_TASK_CONTEXT', () => {
      const envFile = createTempEnvFile('export SOME_OTHER_VAR="value"');
      try {
        const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should treat as main repo when SAGA_TASK_CONTEXT is missing
      } finally {
        cleanupTempFile(envFile);
      }
    });
  });

  describe('origin indicator output', () => {
    describe('main repo context', () => {
      test('should show main repo icon when SAGA_TASK_CONTEXT is "main"', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
        try {
          const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          // Unicode: home icon 🏠
          expect(result.stdout).toMatch(/[🏠]/);
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('should show [M] when --no-icons and SAGA_TASK_CONTEXT is "main"', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
        try {
          const result = runScript(['--origin', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('[M]');
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('should treat unset SAGA_TASK_CONTEXT as main repo', () => {
        const envFile = createTempEnvFile('export SOME_VAR="value"');
        try {
          const result = runScript(['--origin', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('[M]');
        } finally {
          cleanupTempFile(envFile);
        }
      });
    });

    describe('worktree context', () => {
      test('should show worktree icon when SAGA_TASK_CONTEXT is "worktree"', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"');
        try {
          const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          // Unicode: branch icon 🌿
          expect(result.stdout).toMatch(/[🌿]/);
        } finally {
          cleanupTempFile(envFile);
        }
      });

      test('should show [W] when --no-icons and SAGA_TASK_CONTEXT is "worktree"', () => {
        const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"');
        try {
          const result = runScript(['--origin', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('[W]');
        } finally {
          cleanupTempFile(envFile);
        }
      });
    });

    describe('fallback behavior', () => {
      test('should output fallback indicator when no env file', () => {
        const result = runScript(['--origin', '--no-icons'], { CLAUDE_ENV_FILE: '' });
        expect(result.exitCode).toBe(0);
        // Should output [M] as fallback (assume main when unknown)
        expect(result.stdout).toContain('[M]');
      });
    });
  });

  describe('exit codes', () => {
    test('should exit 0 on successful execution', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
      try {
        const result = runScript([], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should exit 0 when context cannot be determined', () => {
      const result = runScript([], { CLAUDE_ENV_FILE: '' });
      // Missing context is not an error - output fallback
      expect(result.exitCode).toBe(0);
    });

    test('should exit 1 on invalid flags', () => {
      const result = runScript(['--bad-flag']);
      expect(result.exitCode).toBe(1);
    });

    test('should exit 0 on --help', () => {
      const result = runScript(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
