# Testing Guide

Comprehensive guide to the SAGA test suite in `packages/saga-utils/`.

## 1. Test Framework and Configuration

**Framework:** [Vitest](https://vitest.dev/) v4.x

**Configuration:** `packages/saga-utils/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

Minimal config — Vitest auto-discovers all `*.test.ts` files under `src/`.

## 2. How to Run Tests

```bash
cd packages/saga-utils

# Run all tests once
npm test              # → vitest run

# Watch mode (re-runs on file changes)
npm run test:watch    # → vitest

# Run a specific test file
npx vitest run src/storage.test.ts

# Run tests matching a pattern
npx vitest run -t "scope-validator"

# With verbose output
npx vitest run --reporter=verbose
```

**Current status:** 38 test files, 590 tests, all passing.

## 3. Test File Organization and Naming

### Naming Convention

Test files are co-located with their source files using the `.test.ts` suffix:

```
src/
├── storage.ts              → storage.test.ts
├── storage.integration.test.ts   (integration tests get .integration.test.ts)
├── conversion.ts           → conversion.test.ts
├── directory.ts            → directory.test.ts
├── schemas/
│   ├── task.ts             → task.test.ts
│   ├── story.ts            → story.test.ts
│   ├── epic.ts             → epic.test.ts
│   ├── session.ts          → session.test.ts
│   ├── claude-code-task.ts → claude-code-task.test.ts
│   └── worker-message.ts   → worker-message.test.ts
├── scripts/
│   ├── worker.ts           → worker.test.ts
│   ├── hydrate.ts          → hydrate.test.ts
│   ├── find.ts             → find.test.ts
│   ├── create-story.ts     → create-story.test.ts
│   ├── schemas.ts          → schemas.test.ts
│   ├── sessions-kill.ts    → sessions-kill.test.ts
│   ├── scope-validator.ts  → scope-validator.test.ts
│   ├── scope-validator-hook.ts → scope-validator-hook.test.ts
│   ├── journal-gate-hook.ts    → journal-gate-hook.test.ts
│   ├── sync-hook.ts            → sync-hook.test.ts
│   ├── auto-commit-hook.ts     → auto-commit-hook.test.ts
│   ├── task-pacing-hook.ts     → task-pacing-hook.test.ts
│   ├── token-limit-hook.ts     → token-limit-hook.test.ts
│   ├── shared/
│   │   └── env.ts          → env.test.ts
│   ├── find/
│   │   └── finder.ts       → finder.test.ts
│   ├── create-story/
│   │   └── service.ts      → service.test.ts
│   ├── hydrate/
│   │   ├── conversion.test.ts
│   │   ├── integration.test.ts
│   │   ├── namespace.test.ts
│   │   └── service.test.ts
│   └── worker/
│       ├── create-draft-pr.test.ts
│       ├── hydrate-tasks.test.ts
│       ├── mark-pr-ready.test.ts
│       ├── message-writer.test.ts
│       ├── resolve-mcp-servers.test.ts
│       ├── resolve-worker-config.test.ts
│       ├── run-headless-loop.test.ts
│       └── setup-worktree.test.ts
```

### Categories

| Category | Files | Description |
|----------|-------|-------------|
| Schema validation | 6 | Zod schema parse/reject tests |
| Core library | 4 | storage, directory, conversion |
| Hook tests | 6 | PreToolUse/PostToolUse Agent SDK hooks |
| CLI entry points | 5 | worker, hydrate, find, create-story, schemas |
| Service modules | 4 | finder, create-story service, hydrate service/conversion/namespace |
| Worker modules | 8 | setup-worktree, run-headless-loop, etc. |
| Shared utilities | 1 | env.ts |
| Integration tests | 2 | storage.integration, hydrate/integration |

## 4. Test Suites — What They Cover

### Schema Tests (`src/schemas/*.test.ts`)

Pure validation tests for Zod schemas. Pattern: parse valid data, reject invalid data, verify defaults/optionals.

- **task.test.ts** — TaskSchema, TaskStatusSchema, StoryIdSchema (valid/invalid statuses, required/optional fields, ID format validation)
- **story.test.ts** — StorySchema (required fields, optional fields like epic/guidance/doneWhen/avoid/branch/pr/worktree)
- **epic.test.ts** — EpicSchema (children array, status derivation)
- **session.test.ts** — SessionSchema
- **claude-code-task.test.ts** — ClaudeCodeTaskSchema (the Agent SDK task format)
- **worker-message.test.ts** — SagaWorkerMessage discriminated union (pipeline_start/step/end, cycle_start/end)

### Core Library Tests

- **storage.test.ts** — CRUD for stories, tasks, epics; listing; status derivation (deriveStoryStatus, deriveEpicStatus); story ID validation and uniqueness; edge cases (missing directories, malformed JSON)
- **storage.integration.test.ts** — End-to-end flows: create story with tasks, derive status through state transitions (pending → in_progress → completed), epic status derivation across multiple stories
- **directory.test.ts** — Path construction: SagaPaths, EpicPaths, StoryPaths, WorktreePaths, ArchivePaths, createTaskPath; trailing slash handling
- **conversion.test.ts** — toClaudeTask/fromClaudeTask bidirectional mapping: field mapping, metadata (guidance/doneWhen), blocks array, status extraction

### Hook Tests (`src/scripts/*-hook.test.ts`)

All hooks follow the factory pattern: `createXxxHook(config) → async (input, toolUseId, options) → result`. Tests validate both the `{ continue: true }` passthrough and the deny/additionalContext responses.

- **scope-validator-hook.test.ts** — PreToolUse: allows worktree paths, blocks outside paths, blocks archive access, blocks other stories' files, enforces `.saga` write immutability (blocks Write/Edit to story.json/task files, allows journal.md writes)
- **journal-gate-hook.test.ts** — PreToolUse: allows silently for non-completed status, returns journal reminder when status is 'completed'
- **sync-hook.test.ts** — PostToolUse: syncs TaskUpdate status changes to disk (reads/writes real temp files)
- **auto-commit-hook.test.ts** — PostToolUse: runs git add/commit/push on task completion (mocks child_process)
- **task-pacing-hook.test.ts** — PostToolUse: tracks completed task count, signals max tasks reached
- **token-limit-hook.test.ts** — PostToolUse: returns additionalContext when TokenTracker exceeds limit, reacts to tracker mutations

### CLI Tests (`src/scripts/*.test.ts`)

CLI tests use `execSync` to run the actual script with `npx tsx`, capturing stdout/stderr/exitCode. They set environment variables via the `env` option.

- **worker.test.ts** — Argument parsing: --help, missing args, --messages-file, rejected flags
- **hydrate.test.ts** — Argument parsing, successful hydration with temp directories, error JSON output
- **find.test.ts** — Story/epic finding CLI
- **create-story.test.ts** — stdin JSON, --input file flag, error handling (invalid JSON, missing fields)
- **schemas.test.ts** — Schema description output CLI
- **sessions-kill.test.ts** — Session termination CLI

### Service/Module Tests

- **find/finder.test.ts** — Fuzzy matching: exact ID, case-insensitive, underscore normalization, partial match, ambiguous matches
- **create-story/service.test.ts** — Real git operations in temp dirs (init, clone, worktree add, commit, push): creates worktree+branch, writes story/task JSON, commits, handles errors (existing branch/worktree, missing .saga)
- **hydrate/service.test.ts** — Task hydration logic
- **hydrate/conversion.test.ts** — SAGA-to-Claude task list conversion
- **hydrate/namespace.test.ts** — Task list ID namespacing
- **hydrate/integration.test.ts** — End-to-end hydration flow
- **worker/run-headless-loop.test.ts** — Prompt building, cycle management, task completion checking (mocks Agent SDK `query` and `node:fs`)
- **worker/setup-worktree.test.ts** — Real git worktree operations: create, idempotent skip, re-create from existing branch, broken worktree detection, multiple worktrees
- **worker/create-draft-pr.test.ts**, **mark-pr-ready.test.ts** — GitHub PR management
- **worker/hydrate-tasks.test.ts** — Task hydration in worker context
- **worker/message-writer.test.ts** — JSONL message writing
- **worker/resolve-worker-config.test.ts** — Config resolution from .saga/config.json
- **worker/resolve-mcp-servers.test.ts** — MCP server config resolution
- **shared/env.test.ts** — Environment variable getters: returns value when set, throws with descriptive message when missing

## 5. Mocking Patterns

### Pattern 1: Real Filesystem (Temp Directories)

Used by: storage tests, sync-hook, finder, create-story service, setup-worktree, hydrate CLI

```ts
let testDir: string;

beforeEach(() => {
  testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-test-')));
  mkdirSync(join(testDir, '.saga', 'stories'), { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});
```

Real git repos are created for tests that need git operations (create-story service, setup-worktree).

### Pattern 2: vi.mock for Module Mocking

Used by: auto-commit-hook (mocks child_process), run-headless-loop (mocks Agent SDK + fs)

```ts
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';
const mockExecFileSync = vi.mocked(execFileSync);

beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });
```

### Pattern 3: Process Execution (CLI Tests)

Used by: worker CLI, hydrate CLI, create-story CLI, find CLI, schemas CLI

```ts
function runScript(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx ${scriptPath} ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, SAGA_PROJECT_DIR: '/tmp/fake' },
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const e = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
    return {
      stdout: e.stdout?.toString() || '',
      stderr: e.stderr?.toString() || '',
      exitCode: e.status || 1,
    };
  }
}
```

### Pattern 4: Factory Helper Functions

Used by: all hook tests

```ts
function makeHookInput(toolInput: Record<string, unknown>): PreToolUseHookInput {
  return {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'TaskUpdate',
    tool_input: toolInput,
    tool_use_id: 'tu-1',
  };
}

const abortController = new AbortController();
const hookOptions = { signal: abortController.signal };
```

### Pattern 5: Environment Variable Manipulation

Used by: env.test.ts

```ts
const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

it('throws when not set', () => {
  process.env.SAGA_PROJECT_DIR = undefined;
  expect(() => getProjectDir()).toThrow('SAGA_PROJECT_DIR');
});
```

## 6. Fixture and Helper Utilities

No shared test fixture files or test utility modules exist. Each test file defines its own:

- **Setup helpers** — `setupStory()`, `setupEpics()`, `setupTempProject()`
- **Factory functions** — `makeStory()`, `makeTasks()`, `makeHookInput()`
- **Runner helpers** — `runWorker()`, `runScript()` for CLI tests
- **Constants** — Named constants for magic numbers (`MAX_CYCLES_THREE`, `GIT_COMMAND_COUNT`, `TASK_COUNT`)

### Convention: Named Numeric Constants

Tests avoid magic numbers by extracting them into named constants at the top of the file:

```ts
const GIT_COMMAND_COUNT = 3;
const MAX_TASKS_PER_SESSION = 3;
const MINUTES_25_MS = 1_500_000;
```

## 7. Test Coverage Gaps

Areas that currently lack tests:

1. **Dashboard package** (`packages/dashboard/`) — No test files exist for the Express server, routes, parser, watcher, WebSocket server, React client, or XState state machine
2. **Plugin skills** (`plugin/skills/`) — SKILL.md files are not programmatically tested
3. **Session-init hook** (`plugin/hooks/session-init.sh`) — Shell script, not covered by vitest
4. **hooks.json** — Hook configuration is not validated by tests
5. **Edge cases in storage** — Concurrent file access, large file handling, filesystem permission errors
6. **Error recovery** — Worker pipeline failure recovery paths (partial worktree creation, interrupted git operations)
7. **Dashboard CLI commands** — `dashboard.ts` and `sessions/index.ts` commands

## 8. Test Design Patterns

### Pure Validation Tests (Schemas)

Each schema test follows the accept/reject pattern:
- Parse valid objects with all required fields
- Parse valid objects with all optional fields
- Parse valid objects with partial optional fields
- Reject objects missing each required field individually
- Reject objects with invalid enum values

### Hook Tests (Agent SDK Integration)

Each hook test validates:
- Factory function creates a callable hook
- Passthrough case: returns `{ continue: true }` when conditions aren't met
- Active case: returns appropriate `hookSpecificOutput` (deny or additionalContext)
- Edge cases: missing fields, wrong tool name, boundary conditions

### Integration Tests

Create realistic multi-entity scenarios:
- Write story + tasks → read back → derive status
- Status transitions through lifecycle (pending → in_progress → completed)
- Epic status derivation from multiple stories' states
