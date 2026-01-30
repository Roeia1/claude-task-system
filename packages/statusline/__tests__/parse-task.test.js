const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

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
 * Helper to create a temporary directory with task structure
 */
function createTempTaskDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-test-'));
  return tmpDir;
}

/**
 * Helper to create task.md file in temporary directory
 */
function createTaskMd(tmpDir, taskId, content) {
  const taskDir = path.join(tmpDir, 'task-system', `task-${taskId}`);
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(taskDir, 'task.md'), content);
  return taskDir;
}

/**
 * Helper to create env file with context
 */
function createEnvFile(tmpDir, taskId) {
  const envFile = path.join(tmpDir, 'claude-env.sh');
  fs.writeFileSync(
    envFile,
    `export SAGA_TASK_CONTEXT="worktree"
export CURRENT_TASK_ID="${taskId}"
export SAGA_PROJECT_DIR="${tmpDir}"
`,
    { mode: 0o644 },
  );
  return envFile;
}

/**
 * Helper to cleanup temp directory
 */
function cleanupTempDir(tmpDir) {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('task-status --task flag: task parsing', () => {
  describe('parse_task_title()', () => {
    test('should extract title from standard "# Task NNN: Title" header', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '042',
          `# Task 042: Implement user authentication

## Overview
Some overview text
`,
        );
        const envFile = createEnvFile(tmpDir, '042');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Implement user authentication');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle title containing colons', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '043',
          `# Task 043: Fix: edge case in parser

## Overview
`,
        );
        const envFile = createEnvFile(tmpDir, '043');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Fix: edge case in parser');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle missing task header gracefully', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '044',
          `## Overview
Some text without header
`,
        );
        const envFile = createEnvFile(tmpDir, '044');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should output some fallback, not error
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle very long title (truncate to reasonable length)', () => {
      const tmpDir = createTempTaskDir();
      try {
        const longTitle = 'A'.repeat(100);
        createTaskMd(
          tmpDir,
          '045',
          `# Task 045: ${longTitle}

## Overview
`,
        );
        const envFile = createEnvFile(tmpDir, '045');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should truncate to ~40 chars or handle gracefully
        expect(result.stdout.length).toBeLessThan(150);
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle malformed header (no colon)', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '046',
          `# Task 046 Missing colon

## Overview
`,
        );
        const envFile = createEnvFile(tmpDir, '046');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should not crash, may output fallback
      } finally {
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('parse_task_type()', () => {
    test('should extract type from "**Type:**" field', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '050',
          `# Task 050: Some task

**Type:** feature
`,
        );
        const envFile = createEnvFile(tmpDir, '050');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should show feature icon (sparkles ✨ or [F])
        expect(result.stdout).toMatch(/✨|\[F\]/);
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should recognize bugfix type', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '051',
          `# Task 051: Fix bug

**Type:** bugfix
`,
        );
        const envFile = createEnvFile(tmpDir, '051');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Bug icon 🐛 or [B]
        expect(result.stdout).toMatch(/🐛|\[B\]/);
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should recognize refactor type', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '052',
          `# Task 052: Refactor code

**Type:** refactor
`,
        );
        const envFile = createEnvFile(tmpDir, '052');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Recycle icon ♻️ or [R]
        expect(result.stdout).toMatch(/♻️|\[R\]/);
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should recognize performance type', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '053',
          `# Task 053: Optimize queries

**Type:** performance
`,
        );
        const envFile = createEnvFile(tmpDir, '053');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Lightning icon ⚡ or [P]
        expect(result.stdout).toMatch(/⚡|\[P\]/);
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should recognize deployment type', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '054',
          `# Task 054: Deploy to prod

**Type:** deployment
`,
        );
        const envFile = createEnvFile(tmpDir, '054');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Rocket icon 🚀 or [D]
        expect(result.stdout).toMatch(/🚀|\[D\]/);
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle unknown type with fallback', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '055',
          `# Task 055: Unknown type

## Task Type

someunknowntype - Description
`,
        );
        const envFile = createEnvFile(tmpDir, '055');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should use generic icon or [?]
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle missing Task Type section', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '056',
          `# Task 056: No type section

## Overview
Content without task type
`,
        );
        const envFile = createEnvFile(tmpDir, '056');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should not crash
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle type field normally', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '057',
          `# Task 057: Normal type

**Type:** feature
`,
        );
        const envFile = createEnvFile(tmpDir, '057');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/✨|\[F\]/);
      } finally {
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('parse_feature_ref()', () => {
    test('should extract feature name from **Feature:** field', () => {
      const tmpDir = createTempTaskDir();
      try {
        // Create feature.md file
        const featureDir = path.join(tmpDir, 'task-system', 'features', '001-user-authentication');
        fs.mkdirSync(featureDir, { recursive: true });
        fs.writeFileSync(
          path.join(featureDir, 'feature.md'),
          `# Feature: User Authentication\n\n**Status:** In Progress\n`,
        );

        createTaskMd(
          tmpDir,
          '060',
          `# Task 060: Implement feature

**Type:** feature
**Feature:** [001-user-authentication](../../features/001-user-authentication/feature.md)
`,
        );
        const envFile = createEnvFile(tmpDir, '060');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('User Authentication');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle missing Feature Context section gracefully', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '061',
          `# Task 061: Standalone task

## Overview
No feature context here
`,
        );
        const envFile = createEnvFile(tmpDir, '061');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should omit feature portion, not error
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle feature reference with special characters', () => {
      const tmpDir = createTempTaskDir();
      try {
        // Create feature.md file
        const featureDir = path.join(tmpDir, 'task-system', 'features', '002-api-v2-redesign');
        fs.mkdirSync(featureDir, { recursive: true });
        fs.writeFileSync(
          path.join(featureDir, 'feature.md'),
          `# Feature: API v2 Redesign\n\n**Status:** Draft\n`,
        );

        createTaskMd(
          tmpDir,
          '062',
          `# Task 062: Feature with dashes

**Type:** feature
**Feature:** [002-api-v2-redesign](../../features/002-api-v2-redesign/feature.md)
`,
        );
        const envFile = createEnvFile(tmpDir, '062');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('API v2 Redesign');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('get_type_icon()', () => {
    test('should show Unicode icons by default', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '070',
          `# Task 070: Feature task

**Type:** feature
`,
        );
        const envFile = createEnvFile(tmpDir, '070');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should contain Unicode feature icon (sparkles)
        expect(result.stdout).toContain('✨');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should show ASCII fallbacks with --no-icons', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '071',
          `# Task 071: Feature task

**Type:** feature
`,
        );
        const envFile = createEnvFile(tmpDir, '071');
        const result = runScript(['--task', '--no-icons'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should contain ASCII [F] instead of Unicode
        expect(result.stdout).toContain('[F]');
        expect(result.stdout).not.toContain('✨');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should map bugfix to correct ASCII fallback', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '072',
          `# Task 072: Bug fix

**Type:** bugfix
`,
        );
        const envFile = createEnvFile(tmpDir, '072');
        const result = runScript(['--task', '--no-icons'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('[B]');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should map refactor to correct ASCII fallback', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '073',
          `# Task 073: Code refactor

**Type:** refactor
`,
        );
        const envFile = createEnvFile(tmpDir, '073');
        const result = runScript(['--task', '--no-icons'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('[R]');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should map performance to correct ASCII fallback', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '074',
          `# Task 074: Performance work

**Type:** performance
`,
        );
        const envFile = createEnvFile(tmpDir, '074');
        const result = runScript(['--task', '--no-icons'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('[P]');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should map deployment to correct ASCII fallback', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '075',
          `# Task 075: Deployment

**Type:** deployment
`,
        );
        const envFile = createEnvFile(tmpDir, '075');
        const result = runScript(['--task', '--no-icons'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('[D]');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('missing/malformed file handling', () => {
    test('should output fallback when task.md file is missing', () => {
      const tmpDir = createTempTaskDir();
      try {
        // Create task directory but no task.md file
        fs.mkdirSync(path.join(tmpDir, 'task-system', 'task-080'), { recursive: true });
        const envFile = createEnvFile(tmpDir, '080');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should show fallback "Task 080" when task.md is missing
        expect(result.stdout).toContain('080');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should output fallback when task directory is missing', () => {
      const tmpDir = createTempTaskDir();
      try {
        // Create task-system but no task directory
        fs.mkdirSync(path.join(tmpDir, 'task-system'), { recursive: true });
        const envFile = createEnvFile(tmpDir, '081');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should show "Task 081" as fallback
        expect(result.stdout).toContain('081');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should output "--" when CURRENT_TASK_ID is not set', () => {
      const tmpDir = createTempTaskDir();
      try {
        const envFile = path.join(tmpDir, 'env.sh');
        fs.writeFileSync(
          envFile,
          `export SAGA_TASK_CONTEXT="worktree"
export SAGA_PROJECT_DIR="${tmpDir}"
`,
          { mode: 0o644 },
        );
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should handle missing task ID gracefully
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle empty task.md file', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(tmpDir, '082', '');
        const envFile = createEnvFile(tmpDir, '082');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should not crash, produce fallback
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle task.md with only partial sections', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '083',
          `# Task 083: Partial task

This file has no proper sections, just a title and random text.
`,
        );
        const envFile = createEnvFile(tmpDir, '083');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should extract title at minimum
        expect(result.stdout).toContain('Partial task');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('--task flag integration', () => {
    test('should combine task info with origin when both flags used', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '090',
          `# Task 090: Combined output test

## Task Type

feature - Test feature

## Feature Context

**Feature**: [001-test-feature](../../features/001-test-feature/feature.md)
`,
        );
        const envFile = createEnvFile(tmpDir, '090');
        const result = runScript(['--origin', '--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Should have worktree icon and task info
        expect(result.stdout).toMatch(/[🌿]|\[W\]/u); // worktree icon
        expect(result.stdout).toContain('Combined output test');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should include task info in all-sections output (no flags)', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '091',
          `# Task 091: All sections test

## Task Type

bugfix - Bug fix test
`,
        );
        const envFile = createEnvFile(tmpDir, '091');
        const result = runScript([], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('All sections test');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });

    test('should not show task info when only --origin flag is used', () => {
      const tmpDir = createTempTaskDir();
      try {
        createTaskMd(
          tmpDir,
          '092',
          `# Task 092: Should not appear

## Task Type

feature - Test
`,
        );
        const envFile = createEnvFile(tmpDir, '092');
        const result = runScript(['--origin'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Task title should NOT appear when only --origin is used
        expect(result.stdout).not.toContain('Should not appear');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('complete task.md format (real-world)', () => {
    test('should parse complete task.md file correctly', () => {
      const tmpDir = createTempTaskDir();
      try {
        // Create feature.md file
        const featureDir = path.join(tmpDir, 'task-system', 'features', '001-statusline-task-info');
        fs.mkdirSync(featureDir, { recursive: true });
        fs.writeFileSync(
          path.join(featureDir, 'feature.md'),
          `# Feature: Statusline Task Info\n\n**Status:** In Progress\n`,
        );

        createTaskMd(
          tmpDir,
          '100',
          `# Task 100: Implement task information parsing

**Type:** feature
**Feature:** [001-statusline-task-info](../../features/001-statusline-task-info/feature.md)

## Overview

Implement the task information parsing component of the statusline script.

## Priority

P1 - Core functionality required for task awareness

## Dependencies

- [001](../001/task-system/task-001/task.md) (Create npm package structure)

## Objectives

- [ ] Parse task.md files to extract task title
- [ ] Extract task type from metadata section

## Sub-tasks

1. [ ] Add parse_task_md() function
2. [ ] Implement task title extraction

## Acceptance Criteria

- Running \`task-status --task\` outputs task title
`,
        );
        const envFile = createEnvFile(tmpDir, '100');
        const result = runScript(['--task'], {
          CLAUDE_ENV_FILE: envFile,
          SAGA_PROJECT_DIR: tmpDir,
        });
        expect(result.exitCode).toBe(0);
        // Title is truncated to 30 chars (+ "...")
        expect(result.stdout).toContain('Implement task information');
        expect(result.stdout).toMatch(/✨|\[F\]/); // feature icon
        expect(result.stdout).toContain('Statusline Task Info');
      } finally {
        cleanupTempDir(tmpDir);
      }
    });
  });
});
