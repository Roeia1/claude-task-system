const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_PATH = path.join(__dirname, '..', 'bin', 'task-status');

/**
 * Helper to run the script with given args and environment
 */
function runScript(args = [], env = {}, cwd = undefined) {
  const fullEnv = { ...process.env, ...env };
  const options = {
    env: fullEnv,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  };
  if (cwd) {
    options.cwd = cwd;
  }
  try {
    const result = execSync(`bash "${SCRIPT_PATH}" ${args.join(' ')}`, options);
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
  const tmpFile = path.join(tmpDir, `claude-env-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`);
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

/**
 * Helper to create a temporary task-system directory structure
 */
function createTempTaskSystem() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-system-test-'));
  const taskSystemDir = path.join(tmpDir, 'task-system');
  fs.mkdirSync(taskSystemDir);
  fs.mkdirSync(path.join(taskSystemDir, 'tasks'));
  fs.mkdirSync(path.join(taskSystemDir, 'features'));
  return tmpDir;
}

/**
 * Helper to cleanup temp directory
 */
function cleanupTempDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

describe('Edge Cases: Missing Directories and Files', () => {
  describe('Missing task-system directory', () => {
    test('should exit 0 and output minimal fallback when task-system does not exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-task-system-'));
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript([], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should output something (minimal fallback)
        expect(result.stdout.length).toBeGreaterThan(0);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle --counts gracefully when task-system is missing', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-task-system-'));
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should output zeros for counts
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle --task gracefully when task-system is missing', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-task-system-'));
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should either show minimal output or nothing
        // (graceful degradation)
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Empty task-system directory', () => {
    test('should handle empty tasks/ directory', () => {
      const tmpDir = createTempTaskSystem();
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        expect(result.exitCode).toBe(0);
        // Should show zero counts
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle empty features/ directory', () => {
      const tmpDir = createTempTaskSystem();
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        expect(result.exitCode).toBe(0);
        // Should show zero feature counts
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Missing CLAUDE_ENV_FILE', () => {
    test('should fall back to filesystem detection when CLAUDE_ENV_FILE is not set', () => {
      const result = runScript([], { CLAUDE_ENV_FILE: '' });

      // Should not crash
      expect(result.exitCode).toBe(0);

      // Should output some fallback
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should fall back when CLAUDE_ENV_FILE points to non-existent file', () => {
      const result = runScript([], { CLAUDE_ENV_FILE: '/nonexistent/file.sh' });

      // Should not crash
      expect(result.exitCode).toBe(0);

      // Should output fallback
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should handle CLAUDE_ENV_FILE set to empty string', () => {
      const result = runScript(['--origin'], { CLAUDE_ENV_FILE: '' });

      expect(result.exitCode).toBe(0);
      // Should assume main context
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });

  describe('Missing CLAUDE_SPAWN_DIR', () => {
    test('should handle missing CLAUDE_SPAWN_DIR gracefully', () => {
      const envFile = createTempEnvFile('export TASK_CONTEXT="main"');
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should show zero counts (can't scan without spawn dir)
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should handle CLAUDE_SPAWN_DIR set but pointing to non-existent directory', () => {
      const envFile = createTempEnvFile(
        'export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="/nonexistent/directory"'
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTempFile(envFile);
      }
    });
  });
});

describe('Edge Cases: Malformed Files', () => {
  describe('Malformed task.md', () => {
    test('should handle task.md with missing Type field', () => {
      const tmpDir = createTempTaskSystem();
      const taskDir = path.join(tmpDir, 'task-system', 'tasks', '042');
      const taskFolder = path.join(taskDir, 'task-system', 'task-042');
      fs.mkdirSync(taskFolder, { recursive: true });
      fs.writeFileSync(path.join(taskFolder, 'journal.md'), '# Journal\n');

      // task.md missing Type field
      const malformedTaskMd = '# Task 042: Test Task\n\n**Priority:** P1\n';
      fs.writeFileSync(path.join(taskFolder, 'task.md'), malformedTaskMd);

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should still show task (even with missing field)
        expect(result.stdout.length).toBeGreaterThan(0);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle empty task.md file', () => {
      const tmpDir = createTempTaskSystem();
      const taskDir = path.join(tmpDir, 'task-system', 'tasks', '042');
      const taskFolder = path.join(taskDir, 'task-system', 'task-042');
      fs.mkdirSync(taskFolder, { recursive: true });
      fs.writeFileSync(path.join(taskFolder, 'journal.md'), '# Journal\n');
      fs.writeFileSync(path.join(taskFolder, 'task.md'), '');

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle task.md with missing Feature reference', () => {
      const tmpDir = createTempTaskSystem();
      const taskDir = path.join(tmpDir, 'task-system', 'tasks', '042');
      const taskFolder = path.join(taskDir, 'task-system', 'task-042');
      fs.mkdirSync(taskFolder, { recursive: true });
      fs.writeFileSync(path.join(taskFolder, 'journal.md'), '# Journal\n');

      // task.md missing Feature field
      const taskMd = '# Task 042: Test Task\n\n**Type:** feature\n';
      fs.writeFileSync(path.join(taskFolder, 'task.md'), taskMd);

      // When in worktree, CLAUDE_SPAWN_DIR should point to worktree root
      const worktreeDir = taskDir;
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport CLAUDE_SPAWN_DIR="${worktreeDir}"`
      );
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should still show task info (without feature name)
        expect(result.stdout).toContain('Test Task');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Malformed feature.md', () => {
    test('should handle feature.md with missing Status field', () => {
      const tmpDir = createTempTaskSystem();
      const featureDir = path.join(tmpDir, 'task-system', 'features', '001-test');
      fs.mkdirSync(featureDir, { recursive: true });

      // feature.md missing Status field
      const malformedFeatureMd = '# Feature: Test Feature\n\n**Description:** Test\n';
      fs.writeFileSync(path.join(featureDir, 'feature.md'), malformedFeatureMd);

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should show zero for that feature (status not recognized)
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle empty feature.md file', () => {
      const tmpDir = createTempTaskSystem();
      const featureDir = path.join(tmpDir, 'task-system', 'features', '001-test');
      fs.mkdirSync(featureDir, { recursive: true });
      fs.writeFileSync(path.join(featureDir, 'feature.md'), '');

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle feature.md with unexpected Status value', () => {
      const tmpDir = createTempTaskSystem();
      const featureDir = path.join(tmpDir, 'task-system', 'features', '001-test');
      fs.mkdirSync(featureDir, { recursive: true });

      // Unexpected status (not "In Progress" or "Draft")
      const featureMd = '# Feature: Test\n\n**Status:** Completed\n';
      fs.writeFileSync(path.join(featureDir, 'feature.md'), featureMd);

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should not count "Completed" status
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Malformed task directory structure', () => {
    test('should skip task directory missing task-system/task-{ID} folder', () => {
      const tmpDir = createTempTaskSystem();
      const badTaskDir = path.join(tmpDir, 'task-system', 'tasks', '999');
      // Create directory but don't create proper task-system/task-999 subfolder
      fs.mkdirSync(badTaskDir, { recursive: true });

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should skip the malformed task (count should be 0)
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should skip non-directory files in tasks/ folder', () => {
      const tmpDir = createTempTaskSystem();
      const tasksDir = path.join(tmpDir, 'task-system', 'tasks');
      // Create a file instead of directory
      fs.writeFileSync(path.join(tasksDir, 'README.md'), '# Tasks\n');

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });
});

describe('Edge Cases: Git Repository Issues', () => {
  describe('No git repository', () => {
    test('should handle directory that is not a git repository', () => {
      const tmpDir = createTempTaskSystem();
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should show zero remote count (can't check git without repo)
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Git command failures', () => {
    test('should handle git command errors gracefully', () => {
      const tmpDir = createTempTaskSystem();

      // Initialize git repo but make it broken (no remote)
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should show zero remote count (no remote branches)
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });
});

describe('Edge Cases: Special Characters and Encoding', () => {
  describe('File names with special characters', () => {
    test('should handle task directory names that are not numeric', () => {
      const tmpDir = createTempTaskSystem();
      const weirdTaskDir = path.join(tmpDir, 'task-system', 'tasks', 'not-a-number');
      fs.mkdirSync(weirdTaskDir, { recursive: true });

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should skip non-numeric directory
        expect(result.stdout).toContain('0');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle feature directory with unusual naming', () => {
      const tmpDir = createTempTaskSystem();
      const weirdFeatureDir = path.join(tmpDir, 'task-system', 'features', 'feature-with-spaces');
      fs.mkdirSync(weirdFeatureDir, { recursive: true });
      fs.writeFileSync(path.join(weirdFeatureDir, 'feature.md'), '# Test\n\n**Status:** In Progress\n');

      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should count the feature
        expect(result.stdout).toContain('1');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Unicode in file content', () => {
    test('should handle unicode characters in task title', () => {
      const tmpDir = createTempTaskSystem();
      const taskDir = path.join(tmpDir, 'task-system', 'tasks', '042');
      const taskFolder = path.join(taskDir, 'task-system', 'task-042');
      fs.mkdirSync(taskFolder, { recursive: true });
      fs.writeFileSync(path.join(taskFolder, 'journal.md'), '# Journal\n');

      // Unicode in title
      const taskMd = '# Task 042: Implement 日本語 Support\n\n**Type:** feature\n**Feature:** [001-test](../../features/001-test/feature.md)\n';
      fs.writeFileSync(path.join(taskFolder, 'task.md'), taskMd);

      const featureDir = path.join(tmpDir, 'task-system', 'features', '001-test');
      fs.mkdirSync(featureDir, { recursive: true });
      fs.writeFileSync(path.join(featureDir, 'feature.md'), '# Feature: Test\n\n**Status:** In Progress\n');

      // When in worktree, CLAUDE_SPAWN_DIR should point to worktree root
      const worktreeDir = taskDir;
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport CLAUDE_SPAWN_DIR="${worktreeDir}"`
      );
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });

        // Should not crash
        expect(result.exitCode).toBe(0);

        // Should handle unicode properly
        expect(result.stdout).toContain('日本語');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });
});

describe('Edge Cases: Permission and Access Issues', () => {
  describe('Unreadable files', () => {
    test('should handle unreadable CLAUDE_ENV_FILE gracefully', () => {
      const envFile = createTempEnvFile('export TASK_CONTEXT="main"');
      try {
        // Make file unreadable (this may not work on all systems)
        try {
          fs.chmodSync(envFile, 0o000);
        } catch (e) {
          // Skip test if chmod not supported
          return;
        }

        const result = runScript([], { CLAUDE_ENV_FILE: envFile });

        // Should not crash - fall back to defaults
        expect(result.exitCode).toBe(0);
      } finally {
        try {
          fs.chmodSync(envFile, 0o644);
          cleanupTempFile(envFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });
});
