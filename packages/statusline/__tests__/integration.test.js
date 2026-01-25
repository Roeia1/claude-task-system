const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_PATH = path.join(__dirname, '..', 'bin', 'task-status');

// ANSI escape code patterns for testing
const ANSI = {
  // Background colors (256-color mode)
  BG_BLUE: /\x1b\[48;5;25m/,        // Main origin background
  BG_CYAN: /\x1b\[48;5;30m/,        // Worktree origin background
  BG_GRAY: /\x1b\[48;5;240m/,       // Task info background
  BG_DARK_GRAY: /\x1b\[48;5;235m/,  // Counts background

  // Foreground colors
  FG_WHITE: /\x1b\[38;5;15m/,
  FG_BLACK: /\x1b\[38;5;0m/,
  FG_LIGHT_GRAY: /\x1b\[38;5;250m/,

  // Control codes
  RESET: /\x1b\[0m/,

  // Powerline separator (U+E0B0)
  SEPARATOR: /\ue0b0/,

  // Generic pattern to detect any ANSI escape code
  ANY_ANSI: /\x1b\[[0-9;]+m/,
};

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
function createTempTaskSystem(structure) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-system-test-'));
  const taskSystemDir = path.join(tmpDir, 'task-system');

  // Create base directories
  fs.mkdirSync(taskSystemDir);
  fs.mkdirSync(path.join(taskSystemDir, 'tasks'));
  fs.mkdirSync(path.join(taskSystemDir, 'features'));

  // Apply custom structure if provided
  if (structure) {
    if (structure.tasks) {
      structure.tasks.forEach(task => {
        const taskDir = path.join(taskSystemDir, 'tasks', task.id);
        const taskFolder = path.join(taskDir, 'task-system', `task-${task.id}`);
        fs.mkdirSync(taskDir, { recursive: true });
        fs.mkdirSync(taskFolder, { recursive: true });

        if (task.hasJournal) {
          fs.writeFileSync(path.join(taskFolder, 'journal.md'), '# Journal\n');
        }

        if (task.taskMd) {
          fs.writeFileSync(path.join(taskFolder, 'task.md'), task.taskMd);
        }
      });
    }

    if (structure.features) {
      structure.features.forEach(feature => {
        const featureDir = path.join(taskSystemDir, 'features', feature.id);
        fs.mkdirSync(featureDir, { recursive: true });

        if (feature.featureMd) {
          fs.writeFileSync(path.join(featureDir, 'feature.md'), feature.featureMd);
        }
      });
    }
  }

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

/**
 * Count occurrences of a pattern in a string
 */
function countOccurrences(str, pattern) {
  const matches = str.match(new RegExp(pattern.source, 'g'));
  return matches ? matches.length : 0;
}

describe('Integration Tests: Powerline Formatting with ANSI Colors', () => {
  describe('Powerline separator rendering', () => {
    test('should include powerline separator (U+E0B0) between segments when multiple sections shown', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"');
      try {
        const result = runScript(['--origin', '--task'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(ANSI.SEPARATOR);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should not include separator when only one section is shown', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
      try {
        const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Origin-only output should not have separator (only one segment)
        expect(result.stdout).not.toMatch(ANSI.SEPARATOR);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should have correct number of separators for all sections (origin + task + counts = 2 separators)', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          { id: '001', hasJournal: true }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        // All three sections: origin -> task -> counts (2 separators expected)
        const result = runScript([], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        const separatorCount = countOccurrences(result.stdout, ANSI.SEPARATOR);
        // Expect exactly 2 separators (origin|task|counts has 2 transitions)
        expect(separatorCount).toBe(2);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('ANSI color code output', () => {
    test('should include ANSI color codes in default output', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
      try {
        const result = runScript([], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should contain at least one ANSI escape code
        expect(result.stdout).toMatch(ANSI.ANY_ANSI);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should use blue background for main origin indicator', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
      try {
        const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should contain BG_BLUE (48;5;25m) for main origin
        expect(result.stdout).toMatch(ANSI.BG_BLUE);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should use cyan background for worktree origin indicator', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="worktree"');
      try {
        const result = runScript(['--origin'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should contain BG_CYAN (48;5;30m) for worktree origin
        expect(result.stdout).toMatch(ANSI.BG_CYAN);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should use gray background for task info segment', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          {
            id: '042',
            hasJournal: true,
            taskMd: '# Task 042: Test Task\n\n**Type:** feature\n**Feature:** [001-test](../../features/001-test/feature.md)\n'
          }
        ],
        features: [
          {
            id: '001-test',
            featureMd: '# Feature: Test\n\n**Status:** In Progress\n'
          }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should contain BG_GRAY (48;5;240m) for task segment
        expect(result.stdout).toMatch(ANSI.BG_GRAY);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should use dark gray background for counts segment', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          { id: '001', hasJournal: true }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should contain BG_DARK_GRAY (48;5;235m) for counts segment
        expect(result.stdout).toMatch(ANSI.BG_DARK_GRAY);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should reset ANSI codes at end of output', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');
      try {
        const result = runScript([], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should end with RESET code
        expect(result.stdout).toMatch(ANSI.RESET);
      } finally {
        cleanupTempFile(envFile);
      }
    });
  });

  describe('Color transitions between segments', () => {
    test('should have proper color transition from origin to task segment', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          {
            id: '042',
            hasJournal: true,
            taskMd: '# Task 042: Test\n\n**Type:** feature\n**Feature:** [001-test](../../features/001-test/feature.md)\n'
          }
        ],
        features: [
          {
            id: '001-test',
            featureMd: '# Feature: Test\n\n**Status:** In Progress\n'
          }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--origin', '--task'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should transition from cyan (worktree origin) to gray (task)
        expect(result.stdout).toMatch(ANSI.BG_CYAN);
        expect(result.stdout).toMatch(ANSI.BG_GRAY);
        expect(result.stdout).toMatch(ANSI.SEPARATOR);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should have proper color transition from task to counts segment', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          {
            id: '042',
            hasJournal: true,
            taskMd: '# Task 042: Test\n\n**Type:** feature\n**Feature:** [001-test](../../features/001-test/feature.md)\n'
          },
          { id: '001', hasJournal: false }
        ],
        features: [
          {
            id: '001-test',
            featureMd: '# Feature: Test\n\n**Status:** In Progress\n'
          }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--task', '--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should transition from gray (task) to dark gray (counts)
        expect(result.stdout).toMatch(ANSI.BG_GRAY);
        expect(result.stdout).toMatch(ANSI.BG_DARK_GRAY);
        expect(result.stdout).toMatch(ANSI.SEPARATOR);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Flag combinations with colored output', () => {
    test('no flags should show all sections with powerline formatting', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          {
            id: '042',
            hasJournal: true,
            taskMd: '# Task 042: Test\n\n**Type:** feature\n**Feature:** [001-test](../../features/001-test/feature.md)\n'
          }
        ],
        features: [
          {
            id: '001-test',
            featureMd: '# Feature: Test\n\n**Status:** In Progress\n'
          }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript([], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should have all three background colors
        expect(result.stdout).toMatch(ANSI.BG_CYAN);  // origin
        expect(result.stdout).toMatch(ANSI.BG_GRAY);  // task
        expect(result.stdout).toMatch(ANSI.BG_DARK_GRAY);  // counts

        // Should have separators
        expect(result.stdout).toMatch(ANSI.SEPARATOR);

        // Should reset at end
        expect(result.stdout).toMatch(ANSI.RESET);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('--origin --task should show two segments with one separator', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          {
            id: '042',
            hasJournal: true,
            taskMd: '# Task 042: Test\n\n**Type:** feature\n**Feature:** [001-test](../../features/001-test/feature.md)\n'
          }
        ],
        features: [
          {
            id: '001-test',
            featureMd: '# Feature: Test\n\n**Status:** In Progress\n'
          }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--origin', '--task'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should have origin and task colors only
        expect(result.stdout).toMatch(ANSI.BG_CYAN);
        expect(result.stdout).toMatch(ANSI.BG_GRAY);

        // Should NOT have counts color
        expect(result.stdout).not.toMatch(ANSI.BG_DARK_GRAY);

        // Should have exactly one separator
        const separatorCount = countOccurrences(result.stdout, ANSI.SEPARATOR);
        expect(separatorCount).toBe(1);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('--origin --counts should show two segments with one separator', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          { id: '001', hasJournal: true }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--origin', '--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should have origin and counts colors
        expect(result.stdout).toMatch(ANSI.BG_BLUE);  // main origin
        expect(result.stdout).toMatch(ANSI.BG_DARK_GRAY);

        // Should NOT have task color
        expect(result.stdout).not.toMatch(ANSI.BG_GRAY);

        // Should have exactly one separator
        const separatorCount = countOccurrences(result.stdout, ANSI.SEPARATOR);
        expect(separatorCount).toBe(1);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('--task --counts should show two segments with one separator (in worktree)', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          {
            id: '042',
            hasJournal: true,
            taskMd: '# Task 042: Test\n\n**Type:** feature\n**Feature:** [001-test](../../features/001-test/feature.md)\n'
          }
        ],
        features: [
          {
            id: '001-test',
            featureMd: '# Feature: Test\n\n**Status:** In Progress\n'
          }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--task', '--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should have task and counts colors
        expect(result.stdout).toMatch(ANSI.BG_GRAY);
        expect(result.stdout).toMatch(ANSI.BG_DARK_GRAY);

        // Should NOT have origin colors
        expect(result.stdout).not.toMatch(ANSI.BG_BLUE);
        expect(result.stdout).not.toMatch(ANSI.BG_CYAN);

        // Should have exactly one separator
        const separatorCount = countOccurrences(result.stdout, ANSI.SEPARATOR);
        expect(separatorCount).toBe(1);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('--no-icons flag with powerline formatting', () => {
    test('should use ASCII icons but still include powerline separator and colors', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          { id: '001', hasJournal: true }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--no-icons', '--origin', '--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should use ASCII for icons
        expect(result.stdout).toContain('[M]');  // ASCII main origin

        // But should still have powerline separator
        expect(result.stdout).toMatch(ANSI.SEPARATOR);

        // And should still have ANSI colors
        expect(result.stdout).toMatch(ANSI.BG_BLUE);
        expect(result.stdout).toMatch(ANSI.BG_DARK_GRAY);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Integration with task info parsing (task 002)', () => {
    test('should render task info segment with gray background when task details are available', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          {
            id: '042',
            hasJournal: true,
            taskMd: '# Task 042: Implement User Auth\n\n**Type:** feature\n**Feature:** [001-auth](../../features/001-auth/feature.md)\n'
          }
        ],
        features: [
          {
            id: '001-auth',
            featureMd: '# Feature: User Authentication\n\n**Status:** In Progress\n'
          }
        ]
      });
      // When in worktree, SAGA_PROJECT_DIR should point to the worktree root, not main repo
      const worktreeDir = path.join(tmpDir, 'task-system', 'tasks', '042');
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="042"\nexport SAGA_PROJECT_DIR="${worktreeDir}"`
      );
      try {
        const result = runScript(['--task'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should have task segment with gray background
        expect(result.stdout).toMatch(ANSI.BG_GRAY);

        // Should contain task title (from task.md parsing)
        expect(result.stdout).toContain('Implement User Auth');

        // Should contain feature name
        expect(result.stdout).toContain('User Authentication');
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Integration with task counts (task 003) and feature counts (task 004)', () => {
    test('should render combined counts segment with dark gray background', () => {
      const tmpDir = createTempTaskSystem({
        tasks: [
          { id: '001', hasJournal: true },
          { id: '002', hasJournal: false }
        ],
        features: [
          {
            id: '001-test',
            featureMd: '# Feature: Test\n\n**Status:** In Progress\n'
          },
          {
            id: '002-other',
            featureMd: '# Feature: Other\n\n**Status:** Draft\n'
          }
        ]
      });
      const envFile = createTempEnvFile(
        `export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Should have dark gray background for counts
        expect(result.stdout).toMatch(ANSI.BG_DARK_GRAY);

        // Should contain task counts (from count_local_tasks)
        // 1 in_progress, 1 pending, 0 remote
        expect(result.stdout).toContain('1'); // in_progress count

        // Should contain feature counts (from count_features_by_status)
        // 1 active (In Progress), 1 draft
        expect(result.stdout).toContain('1'); // at least one count
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });
});
