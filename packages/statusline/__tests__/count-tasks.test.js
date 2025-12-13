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
 * Helper to create a mock task-system directory structure
 * Returns the path to the created temporary directory
 */
function createMockTaskSystem(config = {}) {
  const {
    tasksWithJournal = [],    // Task IDs that have journal.md (in-progress)
    tasksWithoutJournal = [], // Task IDs without journal.md (pending)
    noTasksDir = false,       // Don't create task-system/tasks/ at all
    emptyTasksDir = false,    // Create task-system/tasks/ but leave it empty
    malformedTasks = [],      // Task IDs with malformed structure (missing task-system folder inside)
  } = config;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-system-test-'));

  if (!noTasksDir) {
    const tasksDir = path.join(tmpDir, 'task-system', 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });

    if (!emptyTasksDir) {
      // Create in-progress tasks (with journal.md)
      for (const taskId of tasksWithJournal) {
        const taskWorktree = path.join(tasksDir, taskId);
        const taskFolder = path.join(taskWorktree, 'task-system', `task-${taskId}`);
        fs.mkdirSync(taskFolder, { recursive: true });
        fs.writeFileSync(path.join(taskFolder, 'task.md'), `# Task ${taskId}\n`);
        fs.writeFileSync(path.join(taskFolder, 'journal.md'), `# Journal for ${taskId}\n`);
      }

      // Create pending tasks (without journal.md)
      for (const taskId of tasksWithoutJournal) {
        const taskWorktree = path.join(tasksDir, taskId);
        const taskFolder = path.join(taskWorktree, 'task-system', `task-${taskId}`);
        fs.mkdirSync(taskFolder, { recursive: true });
        fs.writeFileSync(path.join(taskFolder, 'task.md'), `# Task ${taskId}\n`);
      }

      // Create malformed tasks (worktree exists but no inner task-system folder)
      for (const taskId of malformedTasks) {
        const taskWorktree = path.join(tasksDir, taskId);
        fs.mkdirSync(taskWorktree, { recursive: true });
        // Just create an empty directory, no task-system subfolder
      }
    }
  }

  return tmpDir;
}

/**
 * Helper to cleanup mock directory
 */
function cleanupMockTaskSystem(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Helper to create a mock git repo with remote branches
 */
function createMockGitRepo(remoteBranches = []) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));

  // Initialize git repo with main branch
  execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });

  // Create initial commit
  fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
  execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir, stdio: 'pipe' });

  // Create a bare remote with main as default branch
  const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remote-'));
  execSync('git init --bare -b main', { cwd: remoteDir, stdio: 'pipe' });
  execSync(`git remote add origin "${remoteDir}"`, { cwd: tmpDir, stdio: 'pipe' });
  execSync('git push -u origin main', { cwd: tmpDir, stdio: 'pipe' });

  // Create remote branches
  for (const branch of remoteBranches) {
    execSync(`git checkout -b ${branch}`, { cwd: tmpDir, stdio: 'pipe' });
    // Use a safe filename by replacing / with -
    const safeFilename = branch.replace(/\//g, '-');
    fs.writeFileSync(path.join(tmpDir, `${safeFilename}.txt`), branch);
    execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
    execSync(`git commit -m "Add ${branch}"`, { cwd: tmpDir, stdio: 'pipe' });
    execSync(`git push origin ${branch}`, { cwd: tmpDir, stdio: 'pipe' });
    execSync('git checkout main', { cwd: tmpDir, stdio: 'pipe' });
    execSync(`git branch -D ${branch}`, { cwd: tmpDir, stdio: 'pipe' });
  }

  // Fetch to populate remote-tracking refs
  execSync('git fetch origin', { cwd: tmpDir, stdio: 'pipe' });

  return { localDir: tmpDir, remoteDir };
}

/**
 * Helper to cleanup git repos
 */
function cleanupGitRepos(...dirs) {
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

describe('task-status --counts', () => {
  describe('count_local_tasks() - scanning local worktrees', () => {
    test('should count tasks with journal.md as in-progress', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001', '002'],
        tasksWithoutJournal: [],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should show 2 in-progress, 0 pending
        expect(result.stdout).toMatch(/I:2/);
        expect(result.stdout).toMatch(/P:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should count tasks without journal.md as pending', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: [],
        tasksWithoutJournal: ['003', '004', '005'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should show 0 in-progress, 3 pending
        expect(result.stdout).toMatch(/I:0/);
        expect(result.stdout).toMatch(/P:3/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should correctly categorize mixed in-progress and pending tasks', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001', '003'],
        tasksWithoutJournal: ['002'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should show 2 in-progress, 1 pending
        expect(result.stdout).toMatch(/I:2/);
        expect(result.stdout).toMatch(/P:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should skip malformed task directories (missing task-system folder)', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: [],
        malformedTasks: ['bad1', 'bad2'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should only count the valid task (001), not the malformed ones
        expect(result.stdout).toMatch(/I:1/);
        expect(result.stdout).toMatch(/P:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });
  });

  describe('edge cases - empty and missing directories', () => {
    test('should return 0/0/0 when task-system/tasks/ does not exist', () => {
      const mockDir = createMockTaskSystem({ noTasksDir: true });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/I:0/);
        expect(result.stdout).toMatch(/P:0/);
        expect(result.stdout).toMatch(/R:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should return 0/0/0 when task-system/tasks/ is empty', () => {
      const mockDir = createMockTaskSystem({ emptyTasksDir: true });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/I:0/);
        expect(result.stdout).toMatch(/P:0/);
        expect(result.stdout).toMatch(/R:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should handle gracefully when CLAUDE_SPAWN_DIR is not set', () => {
      const envFile = createTempEnvFile('export TASK_CONTEXT="main"');

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile, CLAUDE_SPAWN_DIR: undefined });
        expect(result.exitCode).toBe(0);
        // Should output zeros or graceful fallback
        expect(result.stdout).toMatch(/I:0.*P:0.*R:0/);
      } finally {
        cleanupTempFile(envFile);
      }
    });
  });

  describe('count_remote_tasks() - querying git remote branches', () => {
    test('should count remote task branches that have no local worktree', () => {
      // Create mock git repo with remote task branches
      const { localDir, remoteDir } = createMockGitRepo([
        'task-010-feature',
        'task-011-bugfix',
        'task-012-refactor',
      ]);

      // Create task-system structure in local repo (empty tasks dir)
      const tasksDir = path.join(localDir, 'task-system', 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });

      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${localDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile }, localDir);
        expect(result.exitCode).toBe(0);
        // Should show 3 remote tasks (no local worktrees)
        expect(result.stdout).toMatch(/R:3/);
      } finally {
        cleanupTempFile(envFile);
        cleanupGitRepos(localDir, remoteDir);
      }
    });

    test('should exclude remote branches that have local worktrees', () => {
      const { localDir, remoteDir } = createMockGitRepo([
        'task-001-feature',  // Will have local worktree
        'task-002-bugfix',   // No local worktree
        'task-003-refactor', // No local worktree
      ]);

      // Create task-system structure with one local worktree
      const tasksDir = path.join(localDir, 'task-system', 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });

      // Create local worktree for task 001 (in-progress)
      const task001 = path.join(tasksDir, '001', 'task-system', 'task-001');
      fs.mkdirSync(task001, { recursive: true });
      fs.writeFileSync(path.join(task001, 'task.md'), '# Task 001');
      fs.writeFileSync(path.join(task001, 'journal.md'), '# Journal');

      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${localDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile }, localDir);
        expect(result.exitCode).toBe(0);
        // Should show: 1 in-progress, 0 pending, 2 remote (excluding 001 which has local worktree)
        expect(result.stdout).toMatch(/I:1/);
        expect(result.stdout).toMatch(/P:0/);
        expect(result.stdout).toMatch(/R:2/);
      } finally {
        cleanupTempFile(envFile);
        cleanupGitRepos(localDir, remoteDir);
      }
    });

    test('should ignore non-task branches', () => {
      const { localDir, remoteDir } = createMockGitRepo([
        'task-001-feature',
        'feature/some-feature',  // Not a task branch
        'bugfix/something',      // Not a task branch
        'random-branch',         // Not a task branch
      ]);

      const tasksDir = path.join(localDir, 'task-system', 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });

      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${localDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile }, localDir);
        expect(result.exitCode).toBe(0);
        // Should only count task-001-feature as remote
        expect(result.stdout).toMatch(/R:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupGitRepos(localDir, remoteDir);
      }
    });

    test('should handle git remote not configured gracefully', () => {
      // Create git repo without remote
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-remote-'));
      execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
      execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git commit -m "Initial"', { cwd: tmpDir, stdio: 'pipe' });

      const tasksDir = path.join(tmpDir, 'task-system', 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });

      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile }, tmpDir);
        expect(result.exitCode).toBe(0);
        // Should show R:0 when no remote
        expect(result.stdout).toMatch(/R:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupGitRepos(tmpDir);
      }
    });

    test('should handle running outside a git repo gracefully', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: ['002'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile }, mockDir);
        expect(result.exitCode).toBe(0);
        // Should show local counts but R:0 for remote
        expect(result.stdout).toMatch(/I:1/);
        expect(result.stdout).toMatch(/P:1/);
        expect(result.stdout).toMatch(/R:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });
  });

  describe('format_task_counts() - output formatting', () => {
    test('should output Unicode icons by default (● in-progress, ◐ pending, ○ remote)', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001', '002'],
        tasksWithoutJournal: ['003'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should use Unicode icons: ● for in-progress, ◐ for pending, ○ for remote
        expect(result.stdout).toMatch(/● 2/);   // 2 in-progress
        expect(result.stdout).toMatch(/◐ 1/);   // 1 pending
        expect(result.stdout).toMatch(/○ 0/);   // 0 remote (no git repo)
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should output ASCII fallback with --no-icons (I:, P:, R:)', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: ['002', '003'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should use ASCII: I: for in-progress, P: for pending, R: for remote
        expect(result.stdout).toMatch(/I:1/);
        expect(result.stdout).toMatch(/P:2/);
        expect(result.stdout).toMatch(/R:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should format all zeros gracefully when no tasks exist', () => {
      const mockDir = createMockTaskSystem({ emptyTasksDir: true });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        // Unicode version
        let result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/● 0/);
        expect(result.stdout).toMatch(/◐ 0/);
        expect(result.stdout).toMatch(/○ 0/);

        // ASCII version
        result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/I:0/);
        expect(result.stdout).toMatch(/P:0/);
        expect(result.stdout).toMatch(/R:0/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('should handle large task counts correctly', () => {
      const manyInProgress = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0'));
      const manyPending = Array.from({ length: 10 }, (_, i) => String(i + 100).padStart(3, '0'));

      const mockDir = createMockTaskSystem({
        tasksWithJournal: manyInProgress,
        tasksWithoutJournal: manyPending,
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/I:15/);
        expect(result.stdout).toMatch(/P:10/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });
  });

  describe('--counts flag integration with other flags', () => {
    test('--counts alone should output only task counts section', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: ['002'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="worktree"\nexport CURRENT_TASK_ID="001"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should have counts
        expect(result.stdout).toMatch(/I:\d/);
        expect(result.stdout).toMatch(/P:\d/);
        expect(result.stdout).toMatch(/R:\d/);
        // Should NOT have origin indicator or task ID (those are separate flags)
        expect(result.stdout).not.toMatch(/\[W\]/);
        expect(result.stdout).not.toMatch(/\[M\]/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('--origin --counts should output both origin and counts', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: [],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--origin', '--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should have both origin and counts
        expect(result.stdout).toMatch(/\[M\]/);
        expect(result.stdout).toMatch(/I:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('no flags should include counts section (all sections)', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: ['002'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should have all sections including counts
        expect(result.stdout).toMatch(/\[M\]/);
        expect(result.stdout).toMatch(/I:1/);
        expect(result.stdout).toMatch(/P:1/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });
  });

  describe('performance requirements', () => {
    test('should complete within 100ms performance budget', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001', '002', '003'],
        tasksWithoutJournal: ['004', '005'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const start = process.hrtime.bigint();
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;

        expect(result.exitCode).toBe(0);
        expect(durationMs).toBeLessThan(100);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });
  });

  describe('acceptance criteria validation', () => {
    test('running task-status --counts outputs task counts in format in-progress/pending/remote', () => {
      const { localDir, remoteDir } = createMockGitRepo([
        'task-010-feature',
        'task-011-bugfix',
      ]);

      // Create local tasks
      const tasksDir = path.join(localDir, 'task-system', 'tasks');
      fs.mkdirSync(tasksDir, { recursive: true });

      // 2 in-progress (with journal)
      for (const id of ['001', '002']) {
        const taskDir = path.join(tasksDir, id, 'task-system', `task-${id}`);
        fs.mkdirSync(taskDir, { recursive: true });
        fs.writeFileSync(path.join(taskDir, 'task.md'), `# Task ${id}`);
        fs.writeFileSync(path.join(taskDir, 'journal.md'), '# Journal');
      }

      // 1 pending (no journal)
      const pendingDir = path.join(tasksDir, '003', 'task-system', 'task-003');
      fs.mkdirSync(pendingDir, { recursive: true });
      fs.writeFileSync(path.join(pendingDir, 'task.md'), '# Task 003');

      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${localDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile }, localDir);
        expect(result.exitCode).toBe(0);
        // Acceptance: "in-progress/pending/remote" format
        // Expected: 2 in-progress, 1 pending, 2 remote
        expect(result.stdout).toMatch(/I:2/);
        expect(result.stdout).toMatch(/P:1/);
        expect(result.stdout).toMatch(/R:2/);
      } finally {
        cleanupTempFile(envFile);
        cleanupGitRepos(localDir, remoteDir);
      }
    });

    test('in-progress count matches worktrees with journal.md', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001', '002', '003'],
        tasksWithoutJournal: ['004'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/I:3/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('pending count matches worktrees without journal.md', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: ['002', '003', '004', '005'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/P:4/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('remote count matches task branches on origin not present locally', () => {
      const { localDir, remoteDir } = createMockGitRepo([
        'task-001-feature',  // Has local worktree
        'task-002-bugfix',   // Remote only
        'task-003-refactor', // Remote only
        'task-004-perf',     // Remote only
      ]);

      // Create local worktree for 001 only
      const tasksDir = path.join(localDir, 'task-system', 'tasks');
      const task001 = path.join(tasksDir, '001', 'task-system', 'task-001');
      fs.mkdirSync(task001, { recursive: true });
      fs.writeFileSync(path.join(task001, 'task.md'), '# Task 001');
      fs.writeFileSync(path.join(task001, 'journal.md'), '# Journal');

      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${localDir}"`);

      try {
        const result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile }, localDir);
        expect(result.exitCode).toBe(0);
        // 3 remote (002, 003, 004 - excluding 001 which has local worktree)
        expect(result.stdout).toMatch(/R:3/);
      } finally {
        cleanupTempFile(envFile);
        cleanupGitRepos(localDir, remoteDir);
      }
    });

    test('output uses icons by default, ASCII with --no-icons', () => {
      const mockDir = createMockTaskSystem({
        tasksWithJournal: ['001'],
        tasksWithoutJournal: ['002'],
      });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        // Default (icons)
        let result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.stdout).toMatch(/●/);  // In-progress icon
        expect(result.stdout).toMatch(/◐/);  // Pending icon
        expect(result.stdout).toMatch(/○/);  // Remote icon

        // With --no-icons (ASCII)
        result = runScript(['--counts', '--no-icons'], { CLAUDE_ENV_FILE: envFile });
        expect(result.stdout).toMatch(/I:/);
        expect(result.stdout).toMatch(/P:/);
        expect(result.stdout).toMatch(/R:/);
        expect(result.stdout).not.toMatch(/●|◐|○/);
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });

    test('no crashes or errors when task-system directory is missing', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-task-system-'));
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${tmpDir}"`);

      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        // Should not crash, output graceful zeros
        expect(result.stdout).toBeTruthy();
      } finally {
        cleanupTempFile(envFile);
        cleanupGitRepos(tmpDir);
      }
    });

    test('no crashes or errors when task-system directory is empty', () => {
      const mockDir = createMockTaskSystem({ emptyTasksDir: true });
      const envFile = createTempEnvFile(`export TASK_CONTEXT="main"\nexport CLAUDE_SPAWN_DIR="${mockDir}"`);

      try {
        const result = runScript(['--counts'], { CLAUDE_ENV_FILE: envFile });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();
      } finally {
        cleanupTempFile(envFile);
        cleanupMockTaskSystem(mockDir);
      }
    });
  });
});
