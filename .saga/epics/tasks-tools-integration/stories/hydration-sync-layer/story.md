---
id: hydration-sync-layer
title: Hydration and Sync Layer
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Create hydration script entry point and CLI
    status: pending
  - id: t2
    title: Implement SAGA-to-Claude task conversion
    status: pending
  - id: t3
    title: Implement hydration service (read, convert, write)
    status: pending
  - id: t4
    title: Create sync hook script for TaskUpdate interception
    status: pending
  - id: t5
    title: Handle per-session task list namespacing
    status: pending
  - id: t6
    title: Add error handling and edge cases
    status: pending
  - id: t7
    title: Write integration tests for full hydration-sync round trip
    status: pending
---

## Context

SAGA stores its task definitions as JSON files in `.saga/stories/<storyId>/` (the source of truth). However, Claude Code's native Tasks tools (`TaskList`, `TaskGet`, `TaskUpdate`) read from and write to `~/.claude/tasks/<taskListId>/`. For workers to execute stories using native Tasks tools, SAGA needs two bridges:

1. **Hydration**: Before a headless run, convert SAGA task files into Claude Code format and write them to `~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/`. This gives the headless run a complete task list to work from.

2. **Sync**: During execution, a tool hook intercepts `TaskUpdate` calls and writes status changes back to the SAGA source of truth in `.saga/stories/<storyId>/<taskId>.json`. Only `status` is synced back; other fields remain source-controlled.

Each worker session gets its own task list namespace (`saga__<storyId>__<sessionTimestamp>`) to avoid collisions between runs of the same story. Old session task lists are inert and require no cleanup.

All scripts in this story live in `packages/plugin-scripts/` following the existing pattern: TypeScript source in `src/`, compiled via esbuild to `plugin/scripts/`. The scripts depend on `@saga-ai/types` for path utilities and type definitions.

## Scope Boundaries

**In scope:**
- Hydration service: read SAGA task files from `.saga/stories/<storyId>/`, convert to Claude Code format, write to `~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/`
- Sync hook: a `PostToolUse` hook script registered for `TaskUpdate` that writes status changes back to `.saga/stories/<storyId>/<taskId>.json`
- Per-session task list namespacing using `saga__<storyId>__<sessionTimestamp>` pattern
- `toClaudeTask()` and `fromClaudeTask()` conversion functions
- Error handling for hydration failures (permissions, disk space, malformed JSON) and sync failures (write errors, missing files)
- Unit and integration tests for all components

**Out of scope:**
- The SAGA `Task`, `Story`, `ClaudeCodeTask` type definitions and Zod schemas (handled by "SAGA Types Migration to JSON Format" story)
- The `story.json` read/write utilities and `.saga/stories/` folder structure (handled by "Story and Epic JSON Storage" story)
- The worker script (`worker.js`) that calls the hydration service and spawns headless runs (handled by "Worker Script and Execution Pipeline" story)
- Syncing `TaskCreate` calls back to `.saga/stories/` (explicitly excluded per epic: runtime-created tasks are not synced)
- Cleanup of old `~/.claude/tasks/` directories

## Interface

### Inputs

- **SAGA task files**: `*.json` files in `.saga/stories/<storyId>/` (excluding `story.json`). Each file conforms to the `Task` interface from `@saga-ai/types` with fields: `id`, `subject`, `description`, `activeForm`, `status`, `blockedBy`, `guidance`, `doneWhen`.
- **Story metadata**: `story.json` in `.saga/stories/<storyId>/` for reading context (returned to caller for prompt injection).
- **Environment variables**: `SAGA_PROJECT_DIR` (project root), `SAGA_STORY_ID` (story being executed), `SAGA_STORY_TASK_LIST_ID` (Claude Code task list ID for this session).
- **Hook input (sync)**: JSON from stdin conforming to Claude Code's hook input format, containing `tool_name` and `tool_input` with task status updates.

### Outputs

- **Hydrated task files**: Claude Code format tasks written to `~/.claude/tasks/<taskListId>/` where `taskListId` follows the pattern `saga__<storyId>__<sessionTimestamp>`.
- **Hydration result**: Returns story metadata (title, description, guidance, doneWhen, avoid) and the task list ID for the caller (worker.js) to use when spawning headless runs.
- **Sync writes**: Updated `status` field written back to `.saga/stories/<storyId>/<taskId>.json` on each `TaskUpdate` interception.

## Acceptance Criteria

- [ ] `hydrate(storyId, sessionTimestamp)` reads all task files from `.saga/stories/<storyId>/`, converts each to Claude Code format, and writes them to `~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/`
- [ ] `toClaudeTask(sagaTask)` produces a valid `ClaudeCodeTask` with `guidance` and `doneWhen` in `metadata`, computed `blocks` from other tasks' `blockedBy`, and all required Claude Code fields
- [ ] `fromClaudeTask(claudeTask)` extracts only `status` for sync back
- [ ] The sync hook intercepts `TaskUpdate` tool calls and writes the updated status to the correct `.saga/stories/<storyId>/<taskId>.json` file
- [ ] The sync hook ignores tasks not in the SAGA source of truth (runtime-created tasks)
- [ ] Each hydration call creates a unique session-namespaced directory under `~/.claude/tasks/`
- [ ] Hydration failure (missing directory, permission error, malformed task JSON) aborts with a clear error message before any headless run starts
- [ ] Sync failure logs a warning to stderr but does not crash the headless run
- [ ] All scripts compile via the existing esbuild pipeline to `plugin/scripts/`
- [ ] Unit tests achieve full coverage of conversion logic, hydration, and sync
- [ ] Integration test performs a full round trip: write SAGA tasks, hydrate, simulate TaskUpdate, verify sync

## Tasks

### t1: Create hydration script entry point and CLI

**Guidance:**
- Create `packages/plugin-scripts/src/hydrate.ts` as the entry point
- Follow the pattern established by `worktree.ts` and `implement.ts`: a CLI script with argument parsing and JSON output
- Accept `<storyId>` and optional `<sessionTimestamp>` as CLI arguments (default timestamp to `Date.now()`)
- Read `SAGA_PROJECT_DIR` from environment using `getProjectDir()` from `shared/env.ts`
- Output JSON result: `{ success: true, taskListId: "saga__<storyId>__<ts>", taskCount: N, storyMeta: {...} }` or `{ success: false, error: "..." }`
- The esbuild config at `packages/plugin-scripts/esbuild.config.mjs` auto-discovers `src/*.ts` entry points, so no build config changes needed

**References:**
- `packages/plugin-scripts/src/worktree.ts` - CLI pattern with argument parsing and JSON output
- `packages/plugin-scripts/src/shared/env.ts` - Environment variable helpers
- `packages/plugin-scripts/esbuild.config.mjs` - Build pipeline (auto-discovers entry points)

**Avoid:**
- Do not add interactive prompts; this script is called programmatically by the worker
- Do not import from `@saga-ai/types` for types that do not exist yet; use local type definitions and refactor when the types story lands

**Done when:**
- `packages/plugin-scripts/src/hydrate.ts` exists with CLI argument parsing
- Running `node plugin/scripts/hydrate.js <storyId>` outputs valid JSON
- Script exits with code 0 on success, non-zero on failure

### t2: Implement SAGA-to-Claude task conversion

**Guidance:**
- Create `packages/plugin-scripts/src/hydrate/conversion.ts` for the conversion functions
- `toClaudeTask(sagaTask, allTasks)`: converts a SAGA `Task` to `ClaudeCodeTask`. Must compute the `blocks` array by scanning all tasks to find which ones list this task in their `blockedBy`. Map `guidance` and `doneWhen` into the `metadata` field.
- `fromClaudeTask(claudeTask)`: extracts only the `status` field for sync back. Returns `{ status: claudeTask.status }`.
- Define local TypeScript interfaces for `Task` and `ClaudeCodeTask` matching the epic's specification. These will be replaced by `@saga-ai/types` imports when the types story lands.
- Write thorough unit tests in `packages/plugin-scripts/src/hydrate/conversion.test.ts`

**References:**
- Epic section "Conversion Layer" for exact `toClaudeTask` and `fromClaudeTask` signatures
- Epic section "SAGA Types" for `Task` and `ClaudeCodeTask` interfaces
- `packages/plugin-scripts/src/implement/types.ts` - Example of local type definitions

**Avoid:**
- Do not include `owner` in the conversion; SAGA tasks have no `owner` field
- Do not sync anything except `status` back from Claude Code tasks

**Done when:**
- `toClaudeTask()` correctly maps all fields including computed `blocks` and `metadata`
- `fromClaudeTask()` returns only `{ status }`
- Unit tests cover: normal conversion, empty blockedBy, multiple blockedBy, tasks with guidance/doneWhen, tasks without optional fields

### t3: Implement hydration service (read, convert, write)

**Guidance:**
- Create `packages/plugin-scripts/src/hydrate/service.ts` for the core hydration logic
- `hydrate(storyId, sessionTimestamp, projectDir)` should:
  1. Construct the story folder path: `<projectDir>/.saga/stories/<storyId>/`
  2. Read `story.json` to get story metadata
  3. List all `*.json` files in the folder except `story.json`
  4. Parse each as a SAGA Task
  5. Convert each to Claude Code format using `toClaudeTask()`
  6. Construct the task list directory: `~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/`
  7. Create the directory with `mkdirSync({ recursive: true })`
  8. Write each converted task as `<taskId>.json`
  9. Return `{ taskListId, taskCount, storyMeta }`
- Use `os.homedir()` to resolve `~/.claude/tasks/`
- Write unit tests with a temp directory standing in for both `.saga/stories/` and `~/.claude/tasks/`

**References:**
- Epic section "Hydration & Sync" for the step-by-step hydration flow
- Epic section "Storage" for story folder structure
- `packages/plugin-scripts/src/worktree.ts` - Pattern for filesystem operations with `existsSync`, `mkdirSync`, `readFileSync`, `writeFileSync`

**Avoid:**
- Do not write to `~/.claude/tasks/` in unit tests; use a configurable output directory parameter and pass a temp dir in tests
- Do not attempt atomic writes; the epic accepts that partial writes may occur and recovery happens via re-hydration
- Do not filter tasks by status during hydration; write all tasks (completed ones are preserved so the headless run sees them)

**Done when:**
- `hydrate()` reads task files, converts them, and writes to the target directory
- Story metadata (title, description, guidance, doneWhen, avoid) is returned
- Unit tests verify correct file I/O with temp directories
- Malformed task JSON files cause the hydration to abort with a descriptive error

### t4: Create sync hook script for TaskUpdate interception

**Guidance:**
- Create `packages/plugin-scripts/src/sync-hook.ts` as a new entry point (will be compiled to `plugin/scripts/sync-hook.js`)
- This script is invoked as a `PostToolUse` hook for `TaskUpdate` tool calls
- Hook input comes from stdin as JSON with structure: `{ "tool_name": "TaskUpdate", "tool_input": { "taskId": "...", "status": "..." }, ... }`
- Extract `taskId` and `status` from the tool input
- Read `SAGA_STORY_ID` and `SAGA_PROJECT_DIR` from environment
- Construct path: `<projectDir>/.saga/stories/<storyId>/<taskId>.json`
- If the file exists, read it, update only the `status` field, write it back
- If the file does not exist, this is a runtime-created task; silently ignore it (log to stderr for debugging)
- Register the hook in `plugin/hooks/hooks.json` under a new `PostToolUse` entry
- Write unit tests in `packages/plugin-scripts/src/sync-hook.test.ts`

**References:**
- `packages/plugin-scripts/src/scope-validator.ts` - Existing hook script pattern (reads stdin, uses environment variables, exits with code)
- `plugin/hooks/hooks.json` - Current hook registration format
- Epic section "Sync (via tool hooks)" for the sync behavior specification
- Claude Code hooks documentation for `PostToolUse` hook format

**Avoid:**
- Do not block or crash on sync failure; log warnings to stderr and exit 0
- Do not sync fields other than `status`
- Do not attempt to sync `TaskCreate` calls; only `TaskUpdate` is intercepted
- Do not modify `plugin/hooks/hooks.json` for `PreToolUse`; this is a `PostToolUse` hook

**Done when:**
- `sync-hook.ts` reads hook input from stdin and updates the correct task file
- Runtime-created tasks (no matching file) are silently ignored with a stderr log
- Write failures log a warning to stderr but exit 0 (non-blocking)
- Hook is registered in `plugin/hooks/hooks.json`
- Unit tests cover: successful sync, missing task file (runtime task), malformed input, write failure

### t5: Handle per-session task list namespacing

**Guidance:**
- Create `packages/plugin-scripts/src/hydrate/namespace.ts` for task list ID generation and validation
- `generateTaskListId(storyId, sessionTimestamp)` returns `saga__<storyId>__<sessionTimestamp>`
- `parseTaskListId(taskListId)` extracts `{ storyId, sessionTimestamp }` or returns null for non-SAGA task lists
- `getTaskListDir(taskListId)` returns the full path: `<homedir>/.claude/tasks/<taskListId>/`
- The sync hook uses `SAGA_STORY_TASK_LIST_ID` environment variable to know which task list is active for the current session
- Write unit tests in `packages/plugin-scripts/src/hydrate/namespace.test.ts`

**References:**
- Epic section "Per-Session Task List (No Cleanup)" for the namespacing rationale
- Epic section "Worker Variables" for `SAGA_STORY_TASK_LIST_ID` definition
- `packages/plugin-scripts/src/implement/session-manager.ts` lines 200-201 - Example of timestamp-based naming pattern (`saga__${epicSlug}__${storySlug}__${timestamp}`)

**Avoid:**
- Do not implement cleanup of old task list directories; the epic explicitly excludes this
- Do not use the old `saga__<epicSlug>__<storySlug>__<timestamp>` format; the new format is `saga__<storyId>__<sessionTimestamp>` (story ID replaces epic+story slugs)

**Done when:**
- `generateTaskListId()` and `parseTaskListId()` are round-trip consistent
- `getTaskListDir()` returns the correct absolute path using `os.homedir()`
- Non-SAGA task list IDs return null from `parseTaskListId()`
- Unit tests cover generation, parsing, round-trip, and invalid inputs

### t6: Add error handling and edge cases

**Guidance:**
- In the hydration service:
  - If `.saga/stories/<storyId>/` does not exist, abort with clear error
  - If `story.json` is missing, abort with clear error
  - If any task file has malformed JSON, abort with error identifying the file
  - If creating `~/.claude/tasks/` directory fails (permissions), abort with clear error
- In the sync hook:
  - If `SAGA_STORY_ID` is not set, log warning to stderr and exit 0
  - If `SAGA_PROJECT_DIR` is not set, log warning to stderr and exit 0
  - If reading the task file fails, log warning and exit 0
  - If writing the task file fails, log warning and exit 0
  - If stdin is empty or malformed, exit 0 silently
- Add tests for each error path

**References:**
- Epic section "Error Handling" for the error handling philosophy
- `packages/plugin-scripts/src/scope-validator.ts` lines 196-229 - Pattern for handling missing environment variables gracefully
- `packages/plugin-scripts/src/worktree.ts` lines 66-78 - Pattern for git command error handling

**Avoid:**
- Do not throw unhandled exceptions in the sync hook; it must never crash the headless run
- Do not retry on failure; the epic states that re-hydration on next run handles recovery

**Done when:**
- Every error path in hydration produces a descriptive error message and non-zero exit code
- Every error path in the sync hook logs to stderr and exits 0
- Tests cover all error scenarios listed above

### t7: Write integration tests for full hydration-sync round trip

**Guidance:**
- Create `packages/plugin-scripts/src/hydrate/integration.test.ts`
- Test the full round trip:
  1. Create a temp directory structure mimicking `.saga/stories/<storyId>/` with `story.json` and task files
  2. Call `hydrate()` with a temp output directory (not actual `~/.claude/tasks/`)
  3. Verify hydrated task files exist and have correct Claude Code format
  4. Simulate a `TaskUpdate` by feeding the sync hook script stdin with a status change
  5. Verify the original SAGA task file in the temp directory was updated
- Test per-session isolation: hydrate twice with different timestamps, verify separate directories
- Test idempotency: hydrate the same story twice, verify second hydration overwrites cleanly

**References:**
- `packages/plugin-scripts/src/worktree.test.ts` - Pattern for integration tests using temp directories and real filesystem operations
- `packages/plugin-scripts/vitest.config.ts` - Test configuration

**Avoid:**
- Do not write to actual `~/.claude/tasks/` in tests; always use temp directories
- Do not rely on timing; use deterministic timestamps in tests

**Done when:**
- Integration test performs a complete hydrate-update-sync round trip
- Per-session isolation is verified (two hydrations create separate directories)
- All tests pass with `pnpm test` from `packages/plugin-scripts/`
