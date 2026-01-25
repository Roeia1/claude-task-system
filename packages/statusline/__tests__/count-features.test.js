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
  // Remove keys that are explicitly set to undefined
  Object.keys(fullEnv).forEach(key => {
    if (fullEnv[key] === undefined) {
      delete fullEnv[key];
    }
  });
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
 * Helper to create a mock features directory structure
 * Returns the path to the created temporary directory
 */
function createMockFeatures(config = {}) {
  const {
    features = [],           // Array of { id, name, status } objects
    noFeaturesDir = false,   // Don't create task-system/features/ at all
    emptyFeaturesDir = false, // Create task-system/features/ but leave it empty
    malformedFeatures = [],  // Feature IDs with malformed feature.md (missing Status line)
  } = config;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'features-test-'));

  if (!noFeaturesDir) {
    const featuresDir = path.join(tmpDir, 'task-system', 'features');
    fs.mkdirSync(featuresDir, { recursive: true });

    if (!emptyFeaturesDir) {
      // Create features with proper status
      for (const feature of features) {
        const featureDir = path.join(featuresDir, `${feature.id}-${feature.name}`);
        fs.mkdirSync(featureDir, { recursive: true });
        const featureMd = path.join(featureDir, 'feature.md');
        const content = `# Feature ${feature.id}: ${feature.name}\n\n**Status:** ${feature.status}\n\nSome description here.\n`;
        fs.writeFileSync(featureMd, content);
      }

      // Create malformed features (missing Status line)
      for (const featureId of malformedFeatures) {
        const featureDir = path.join(featuresDir, `${featureId}-malformed`);
        fs.mkdirSync(featureDir, { recursive: true });
        const featureMd = path.join(featureDir, 'feature.md');
        const content = `# Feature ${featureId}: Malformed\n\nNo status line here.\n`;
        fs.writeFileSync(featureMd, content);
      }
    }
  }

  return tmpDir;
}

/**
 * Helper to cleanup mock directory
 */
function cleanupMockFeatures(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

describe('task-status --counts (feature counts)', () => {
  describe('count_features_by_status() - scanning feature.md files', () => {
    test('should count features with "In Progress" status as active', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'In Progress' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should show 2 active features
        expect(result.stdout).toMatch(/A:2/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should count features with "Draft" status as draft', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'feature-a', status: 'Draft' },
          { id: '002', name: 'feature-b', status: 'Draft' },
          { id: '003', name: 'feature-c', status: 'Draft' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should show 3 draft features
        expect(result.stdout).toMatch(/D:3/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should count features with "Planned" status as draft', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'feature-a', status: 'Planned' },
          { id: '002', name: 'feature-b', status: 'Planned' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // "Planned" should be counted as draft
        expect(result.stdout).toMatch(/D:2/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should correctly categorize mixed feature statuses', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'Draft' },
          { id: '003', name: 'analytics', status: 'Planned' },
          { id: '004', name: 'notifications', status: 'In Progress' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should show 2 active (In Progress), 2 draft (Draft + Planned)
        expect(result.stdout).toMatch(/A:2/);
        expect(result.stdout).toMatch(/D:2/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should handle status values with extra whitespace', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'feature-a', status: '  In Progress  ' },
          { id: '002', name: 'feature-b', status: 'Draft   ' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should normalize whitespace and count correctly
        expect(result.stdout).toMatch(/A:1/);
        expect(result.stdout).toMatch(/D:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should handle case variations in status values', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'feature-a', status: 'in progress' },
          { id: '002', name: 'feature-b', status: 'IN PROGRESS' },
          { id: '003', name: 'feature-c', status: 'draft' },
          { id: '004', name: 'feature-d', status: 'PLANNED' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should be case-insensitive: 2 active, 2 draft
        expect(result.stdout).toMatch(/A:2/);
        expect(result.stdout).toMatch(/D:2/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should skip features with malformed feature.md (missing Status line)', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'good', status: 'Draft' },
        ],
        malformedFeatures: ['002', '003'],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should only count the valid feature (001)
        expect(result.stdout).toMatch(/D:1/);
        expect(result.stdout).toMatch(/A:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should skip features with unknown status values', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'good', status: 'Draft' },
          { id: '002', name: 'unknown', status: 'Archived' },
          { id: '003', name: 'weird', status: 'OnHold' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should only count the recognized status (Draft)
        expect(result.stdout).toMatch(/D:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });
  });

  describe('edge cases - empty and missing directories', () => {
    test('should return 0/0 when task-system/features/ does not exist', () => {
      const mockDir = createMockFeatures({ noFeaturesDir: true });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should show 0 counts for features (task counts will also be 0)
        expect(result.stdout).toMatch(/A:0/);
        expect(result.stdout).toMatch(/D:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should return 0/0 when task-system/features/ is empty', () => {
      const mockDir = createMockFeatures({ emptyFeaturesDir: true });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/A:0/);
        expect(result.stdout).toMatch(/D:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should handle gracefully when SAGA_PROJECT_DIR is not set', () => {
      const envFile = createTempEnvFile('export SAGA_TASK_CONTEXT="main"');

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile, SAGA_PROJECT_DIR: undefined });
        expect(result.exitCode).toBe(0);
        // Should output zeros or graceful fallback
        expect(result.stdout).toMatch(/A:0/);
        expect(result.stdout).toMatch(/D:0/);
      } finally {
        cleanupTempFile(envFile);
      }
    });

    test('should handle feature directory with no feature.md files', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-feature-md-'));
      const featuresDir = path.join(tmpDir, 'task-system', 'features');

      // Create feature directories but no feature.md files
      fs.mkdirSync(path.join(featuresDir, '001-empty'), { recursive: true });
      fs.mkdirSync(path.join(featuresDir, '002-also-empty'), { recursive: true });

      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${tmpDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should handle missing feature.md gracefully
        expect(result.stdout).toMatch(/A:0/);
        expect(result.stdout).toMatch(/D:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(tmpDir);
      }
    });
  });

  describe('format_feature_counts() - output formatting', () => {
    test('should output Unicode icons by default (⭐ active, 📝 draft)', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'Draft' },
          { id: '003', name: 'analytics', status: 'Draft' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should use Unicode icons: ⭐ for active, 📝 for draft
        expect(result.stdout).toMatch(/⭐ 1/);   // 1 active
        expect(result.stdout).toMatch(/📝 2/);   // 2 draft
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should output ASCII fallback with --no-icons (A:, D:)', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'In Progress' },
          { id: '003', name: 'analytics', status: 'Draft' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should use ASCII: A: for active, D: for draft
        expect(result.stdout).toMatch(/A:2/);
        expect(result.stdout).toMatch(/D:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should format all zeros gracefully when no features exist', () => {
      const mockDir = createMockFeatures({ emptyFeaturesDir: true });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        // Unicode version
        let result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/⭐ 0/);
        expect(result.stdout).toMatch(/📝 0/);

        // ASCII version
        result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/A:0/);
        expect(result.stdout).toMatch(/D:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should handle large feature counts correctly', () => {
      const manyActive = Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1).padStart(3, '0'),
        name: `active-${i}`,
        status: 'In Progress',
      }));
      const manyDraft = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 100).padStart(3, '0'),
        name: `draft-${i}`,
        status: 'Draft',
      }));

      const mockDir = createMockFeatures({
        features: [...manyActive, ...manyDraft],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/A:12/);
        expect(result.stdout).toMatch(/D:8/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });
  });

  describe('integration with task counts', () => {
    test('feature counts should appear after task counts in output', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'Draft' },
        ],
      });

      // Add task-system/tasks directory for task counts
      const tasksDir = path.join(mockDir, 'task-system', 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });

      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Check that both task and feature counts are present
        expect(result.stdout).toMatch(/I:\d/);  // Task in-progress
        expect(result.stdout).toMatch(/P:\d/);  // Task pending
        expect(result.stdout).toMatch(/R:\d/);  // Task remote
        expect(result.stdout).toMatch(/A:1/);   // Feature active
        expect(result.stdout).toMatch(/D:1/);   // Feature draft

        // Feature counts should appear after task counts
        const stdout = result.stdout;
        const taskCountsPos = stdout.indexOf('I:');
        const featureCountsPos = stdout.indexOf('A:');
        expect(featureCountsPos).toBeGreaterThan(taskCountsPos);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('should work correctly when only features exist (no tasks)', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'Draft' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Task counts should be 0, feature counts should be present
        expect(result.stdout).toMatch(/I:0/);
        expect(result.stdout).toMatch(/P:0/);
        expect(result.stdout).toMatch(/R:0/);
        expect(result.stdout).toMatch(/A:1/);
        expect(result.stdout).toMatch(/D:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });
  });

  describe('acceptance criteria validation', () => {
    test('feature counts are displayed when running task-status --counts', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'Draft' },
          { id: '003', name: 'analytics', status: 'Planned' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Must display feature counts
        expect(result.stdout).toMatch(/A:\d/);
        expect(result.stdout).toMatch(/D:\d/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('counts accurately reflect the number of features in each status category', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'In Progress' },
          { id: '003', name: 'analytics', status: 'In Progress' },
          { id: '004', name: 'notifications', status: 'Draft' },
          { id: '005', name: 'reporting', status: 'Planned' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // 3 active (In Progress), 2 draft (Draft + Planned)
        expect(result.stdout).toMatch(/A:3/);
        expect(result.stdout).toMatch(/D:2/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('script handles missing or malformed feature.md files without crashing', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'good', status: 'Draft' },
        ],
        malformedFeatures: ['002', '003'],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should not crash, should count the valid feature
        expect(result.stdout).toMatch(/D:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('Unicode icons are used by default, ASCII fallbacks work with --no-icons', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
          { id: '002', name: 'payments', status: 'Draft' },
        ],
      });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        // Default (icons)
        let result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.stdout).toMatch(/⭐/);  // Active icon
        expect(result.stdout).toMatch(/📝/);  // Draft icon

        // With --no-icons (ASCII)
        result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.stdout).toMatch(/A:/);
        expect(result.stdout).toMatch(/D:/);
        expect(result.stdout).not.toMatch(/⭐|📝/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });

    test('feature counts appear after task counts in the output, properly separated', () => {
      const mockDir = createMockFeatures({
        features: [
          { id: '001', name: 'auth', status: 'In Progress' },
        ],
      });

      // Create task structure
      const tasksDir = path.join(mockDir, 'task-system', 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });

      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);

        // Task counts before feature counts
        const taskPattern = /I:\d+.*P:\d+.*R:\d+/;
        const featurePattern = /A:\d+.*D:\d+/;

        expect(result.stdout).toMatch(taskPattern);
        expect(result.stdout).toMatch(featurePattern);

        const taskMatch = result.stdout.match(taskPattern);
        const featureMatch = result.stdout.match(featurePattern);

        if (taskMatch && featureMatch) {
          expect(result.stdout.indexOf(featureMatch[0])).toBeGreaterThan(result.stdout.indexOf(taskMatch[0]));
        }
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });
  });

  describe('performance requirements', () => {
    test('should complete within 100ms performance budget with features', () => {
      const features = Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1).padStart(3, '0'),
        name: `feature-${i}`,
        status: i % 2 === 0 ? 'In Progress' : 'Draft',
      }));

      const mockDir = createMockFeatures({ features });
      const envFile = createTempEnvFile(`export SAGA_TASK_CONTEXT="main"\nexport SAGA_PROJECT_DIR="${mockDir}"`);

      try {
        const start = process.hrtime.bigint();
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;

        expect(result.exitCode).toBe(0);
        expect(durationMs).toBeLessThan(100);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockFeatures(mockDir);
      }
    });
  });
});
