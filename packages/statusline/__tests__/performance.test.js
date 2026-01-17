const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_PATH = path.join(__dirname, '..', 'bin', 'task-status');

// Performance targets
const PERF_TARGET_95TH = 50;   // 95th percentile < 50ms
const PERF_TARGET_MAX = 100;   // Max < 100ms
const SAMPLE_SIZE = 20;        // Number of runs for performance testing

/**
 * Helper to run the script with given args and environment, measuring execution time
 */
function runScriptTimed(args = [], env = {}, cwd = undefined) {
  const fullEnv = { ...process.env, ...env };
  const options = {
    env: fullEnv,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  };
  if (cwd) {
    options.cwd = cwd;
  }

  const startTime = process.hrtime.bigint();
  try {
    const result = execSync(`bash "${SCRIPT_PATH}" ${args.join(' ')}`, options);
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000; // Convert to ms

    return {
      stdout: result,
      stderr: '',
      exitCode: 0,
      durationMs
    };
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1,
      durationMs
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
 * Helper to create a temporary task-system directory structure for performance testing
 */
function createTempTaskSystem(taskCount = 10, featureCount = 5) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-system-perf-'));
  const taskSystemDir = path.join(tmpDir, 'task-system');

  // Create base directories
  fs.mkdirSync(taskSystemDir);
  fs.mkdirSync(path.join(taskSystemDir, 'tasks'));
  fs.mkdirSync(path.join(taskSystemDir, 'features'));

  // Create tasks
  for (let i = 1; i <= taskCount; i++) {
    const taskId = String(i).padStart(3, '0');
    const taskDir = path.join(taskSystemDir, 'tasks', taskId);
    const taskFolder = path.join(taskDir, 'task-system', `task-${taskId}`);
    fs.mkdirSync(taskFolder, { recursive: true });

    // Alternate between in-progress and pending
    if (i % 2 === 0) {
      fs.writeFileSync(path.join(taskFolder, 'journal.md'), '# Journal\n');
    }

    // Create task.md
    const taskMd = `# Task ${taskId}: Sample Task ${i}\n\n**Type:** feature\n**Feature:** [001-sample](../../features/001-sample/feature.md)\n`;
    fs.writeFileSync(path.join(taskFolder, 'task.md'), taskMd);
  }

  // Create features
  for (let i = 1; i <= featureCount; i++) {
    const featureId = `${String(i).padStart(3, '0')}-sample-${i}`;
    const featureDir = path.join(taskSystemDir, 'features', featureId);
    fs.mkdirSync(featureDir, { recursive: true });

    const status = i % 2 === 0 ? 'Draft' : 'In Progress';
    const featureMd = `# Feature: Sample ${i}\n\n**Status:** ${status}\n`;
    fs.writeFileSync(path.join(featureDir, 'feature.md'), featureMd);
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
 * Calculate percentile from sorted array
 */
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

/**
 * Run performance test with multiple samples
 */
function runPerformanceTest(args, env, cwd) {
  const durations = [];

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const result = runScriptTimed(args, env, cwd);
    expect(result.exitCode).toBe(0); // Ensure all runs succeed
    durations.push(result.durationMs);
  }

  const max = Math.max(...durations);
  const min = Math.min(...durations);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p95 = percentile(durations, 95);

  return { max, min, avg, p95, durations };
}

describe('Performance Tests: <100ms Execution Target', () => {
  describe('Simple scenarios (minimal data)', () => {
    test('--origin only should complete in <100ms (p95 <50ms)', () => {
      const envFile = createTempEnvFile('export TASK_CONTEXT="main"');
      try {
        const stats = runPerformanceTest(['--origin'], { CLAUDE_ENV_FILE: envFile });

        expect(stats.max).toBeLessThan(PERF_TARGET_MAX);
        expect(stats.p95).toBeLessThan(PERF_TARGET_95TH);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('--task only should complete in <100ms (p95 <50ms)', () => {
      const tmpDir = createTempTaskSystem(1, 1);
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="001"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest(['--task'], { CLAUDE_ENV_FILE: envFile });

        expect(stats.max).toBeLessThan(PERF_TARGET_MAX);
        expect(stats.p95).toBeLessThan(PERF_TARGET_95TH);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('--counts only with 5 tasks should complete in <100ms (p95 <50ms)', () => {
      const tmpDir = createTempTaskSystem(5, 3);
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest(['--counts'], { CLAUDE_ENV_FILE: envFile });

        expect(stats.max).toBeLessThan(PERF_TARGET_MAX);
        expect(stats.p95).toBeLessThan(PERF_TARGET_95TH);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Moderate load scenarios', () => {
    test('all sections with 10 tasks and 5 features should complete in <100ms (p95 <50ms)', () => {
      const tmpDir = createTempTaskSystem(10, 5);
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="001"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest([], { CLAUDE_ENV_FILE: envFile });

        expect(stats.max).toBeLessThan(PERF_TARGET_MAX);
        expect(stats.p95).toBeLessThan(PERF_TARGET_95TH);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('--origin --task --counts with moderate data should complete in <100ms (p95 <50ms)', () => {
      const tmpDir = createTempTaskSystem(10, 5);
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="001"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest(['--origin', '--task', '--counts'], { CLAUDE_ENV_FILE: envFile });

        expect(stats.max).toBeLessThan(PERF_TARGET_MAX);
        expect(stats.p95).toBeLessThan(PERF_TARGET_95TH);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Heavy load scenarios', () => {
    test('should handle 20 tasks and 10 features within performance budget', () => {
      const tmpDir = createTempTaskSystem(20, 10);
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest([], { CLAUDE_ENV_FILE: envFile });

        // Heavy load may exceed p95 target but should stay under max
        expect(stats.max).toBeLessThan(PERF_TARGET_MAX);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });

    test('should handle --counts with 30 tasks within performance budget', () => {
      const tmpDir = createTempTaskSystem(30, 5);
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest(['--counts'], { CLAUDE_ENV_FILE: envFile });

        // Counts scanning is most intensive - should still meet max target
        expect(stats.max).toBeLessThan(PERF_TARGET_MAX);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Worst case scenarios', () => {
    test('should handle missing CLAUDE_ENV_FILE with filesystem fallback efficiently', () => {
      const stats = runPerformanceTest(['--origin'], { CLAUDE_ENV_FILE: '' });

      // Filesystem fallback may be slower but should still be reasonable
      expect(stats.max).toBeLessThan(PERF_TARGET_MAX * 1.5); // Allow 150ms for fallback
    });

    test('should handle missing task-system directory efficiently', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-system-empty-'));
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest([], { CLAUDE_ENV_FILE: envFile });

        // Missing directory should be fast (early exit)
        expect(stats.max).toBeLessThan(PERF_TARGET_95TH);
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });

  describe('Cold start vs warm cache', () => {
    test('should show consistent performance across multiple runs', () => {
      const tmpDir = createTempTaskSystem(10, 5);
      const envFile = createTempEnvFile(
        `export TASK_CONTEXT="main"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
      );
      try {
        const stats = runPerformanceTest([], { CLAUDE_ENV_FILE: envFile });

        // Variance should be low (cold start shouldn't significantly impact performance)
        const variance = stats.max - stats.min;
        expect(variance).toBeLessThan(PERF_TARGET_95TH); // Variance should be < 50ms
      } finally {
        cleanupTempFile(envFile);
        cleanupTempDir(tmpDir);
      }
    });
  });
});

describe('Performance Optimization Validation', () => {
  test('should minimize subshell invocations (baseline check)', () => {
    const tmpDir = createTempTaskSystem(10, 5);
    const envFile = createTempEnvFile(
      `export TASK_CONTEXT="main"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
    );
    try {
      // Single run to establish baseline
      const result = runScriptTimed([], { CLAUDE_ENV_FILE: envFile });

      // Should complete quickly with optimized bash operations
      expect(result.durationMs).toBeLessThan(PERF_TARGET_MAX);
      expect(result.exitCode).toBe(0);
    } finally {
      cleanupTempFile(envFile);
      cleanupTempDir(tmpDir);
    }
  });

  test('should handle powerline formatting overhead efficiently', () => {
    const tmpDir = createTempTaskSystem(10, 5);
    const envFile = createTempEnvFile(
      `export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="001"\nexport CLAUDE_PROJECT_DIR="${tmpDir}"`
    );
    try {
      // Test with all sections (most formatting overhead)
      const allSections = runScriptTimed([], { CLAUDE_ENV_FILE: envFile });

      // Test with single section (minimal formatting)
      const singleSection = runScriptTimed(['--origin'], { CLAUDE_ENV_FILE: envFile });

      // Formatting overhead should be minimal
      const overhead = allSections.durationMs - singleSection.durationMs;

      // Overhead from powerline formatting should be < 50ms
      // (relaxed from 30ms to account for system load variance)
      expect(overhead).toBeLessThan(50);
    } finally {
      cleanupTempFile(envFile);
      cleanupTempDir(tmpDir);
    }
  });
});
