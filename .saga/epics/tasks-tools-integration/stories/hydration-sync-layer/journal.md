# Hydration Sync Layer - Execution Journal

## Session 1: 2026-02-06

### Task: t1 - Create hydration script entry point and CLI

**What was done:**
- Created `packages/plugin-scripts/src/hydrate.ts` - CLI entry point with argument parsing and JSON output
- Created `packages/plugin-scripts/src/hydrate/service.ts` - Core hydration service (read SAGA tasks, convert, write Claude Code format)
- Created `packages/plugin-scripts/src/hydrate/namespace.ts` - Task list ID generation and parsing (`saga__<storyId>__<sessionTimestamp>`)
- Created `packages/plugin-scripts/src/hydrate.test.ts` - CLI tests (7 tests, all passing)
- All lint checks pass clean

**Decisions:**
- Reused existing `toClaudeTask()` and `fromClaudeTask()` from `@saga-ai/types` instead of creating local type definitions - the types story has already landed
- Added `SAGA_CLAUDE_TASKS_BASE` env var to allow overriding the Claude tasks directory in tests (avoids writing to `~/.claude/tasks/`)
- Split `hydrate()` into small helper functions to satisfy biome complexity limits
- Created namespace.ts and service.ts alongside t1 since the CLI needs them to produce valid output

**Pre-existing issues noted:**
- 4 test files with 31 failures pre-exist from other stories (find.test.ts, worktree.test.ts, finder.test.ts, orchestrator.test.ts)
- Build fails due to pre-existing `StoryStatusSchema` import error in `find/index.ts`

**Next steps:**
- t2: Implement SAGA-to-Claude task conversion (mostly done via `@saga-ai/types`, needs `blocks` computation tests)
- t3: Implement hydration service tests (service.ts exists but needs dedicated unit tests)
- t4: Create sync hook script
- t5: Namespace tests (namespace.ts exists but needs dedicated unit tests)

## Session 2: 2026-02-06

### Task: t2 - Implement SAGA-to-Claude task conversion

**What was done:**
- Created `packages/plugin-scripts/src/hydrate/conversion.ts` - Conversion module with `convertTask()`, `convertTasks()`, and `extractStatus()` functions
- Created `packages/plugin-scripts/src/hydrate/conversion.test.ts` - 19 unit tests covering all conversion scenarios
- Refactored `service.ts` to import `convertTasks` from the new `conversion.ts` module instead of using inline logic
- All 26 hydrate tests pass (19 new + 7 existing CLI tests), lint clean

**Decisions:**
- Named the single-task function `convertTask(task, allTasks)` to clearly show it needs the full task list for `blocks` computation
- Named the sync-back function `extractStatus()` instead of re-exporting `fromClaudeTask` directly, to make the intent clearer in plugin-scripts context
- Kept `convertTasks(tasks)` as a batch wrapper that calls `convertTask` for each task with the full list
- The `blocks` computation logic (scanning all tasks for `blockedBy` references) was extracted from `service.ts` into `conversion.ts`

**Tests cover:**
- Normal field mapping (id, subject, description, status, blockedBy)
- Optional activeForm preservation
- guidance/doneWhen → metadata mapping (both, only guidance, only doneWhen, neither)
- blocks computation (empty, single blocker, multiple blockers, self-reference)
- blockedBy preservation from original task
- Batch conversion with correct blocks across task graph
- Empty input, single task, ordering preservation
- extractStatus for all three status values
- extractStatus ignoring metadata, owner, blocks, and other Claude Code-specific fields

**Next steps:**
- t3: Implement hydration service tests (service.ts exists but needs dedicated unit tests)
- t4: Create sync hook script
- t5: Namespace tests (namespace.ts exists but needs dedicated unit tests)

## Session 3: 2026-02-06

### Task: t3 - Implement hydration service tests (read, convert, write)

**What was done:**
- Created `packages/plugin-scripts/src/hydrate/service.test.ts` - 17 unit tests covering the `hydrate()` function
- Tests use temp directories for both project source (`.saga/stories/`) and output (`~/.claude/tasks/`) to avoid filesystem side effects
- All 36 hydrate tests pass (17 new + 19 conversion + 7 CLI), lint clean

**Tests cover:**
- Successful hydration: single task, multiple tasks, zero tasks
- File I/O verification: Claude Code format files written with correct structure (id, subject, status, blocks, metadata)
- Completed task preservation: all statuses (pending, in_progress, completed) are hydrated
- Story metadata extraction: all optional fields present, none present, partial fields
- Session namespacing: different timestamps create separate directories
- Idempotency: re-hydration with same timestamp overwrites cleanly
- Error handling: missing story directory, missing story.json, malformed JSON, schema validation failures (story and task)
- Non-JSON file filtering: .md files in story directory are ignored

**Decisions:**
- Extracted magic numbers to constants (TEST_TIMESTAMP, SESSION_TIMESTAMP_A/B, EXPECTED_MULTI_TASK_COUNT) to satisfy biome lint rules
- Used `realpathSync` on temp directories to handle macOS /tmp → /private/tmp symlinks

**Next steps:**
- t4: Create sync hook script
- t5: Namespace tests (namespace.ts exists but needs dedicated unit tests)
- t6: Error handling and edge cases
- t7: Integration tests

## Session 4: 2026-02-06

### Task: t4 - Create sync hook script for TaskUpdate interception

**What was done:**
- Created `packages/plugin-scripts/src/sync-hook.ts` - PostToolUse hook entry point that reads stdin JSON, extracts taskId/status, and writes status back to SAGA task file
- Created `packages/plugin-scripts/src/sync-hook.test.ts` - 13 unit tests covering all sync-hook scenarios
- Registered the hook in `plugin/hooks/hooks.json` as a PostToolUse hook matching `TaskUpdate`
- Compiled to `plugin/scripts/sync-hook.js` via esbuild (built individually due to pre-existing `find/index.ts` build failure)
- All 56 hydration+sync tests pass, lint clean

**Decisions:**
- Exported `processSyncInput(raw)` for unit testing; `main()` handles stdin reading and calls it
- Used `createTaskPath()` from `@saga-ai/types` for consistent path construction
- Sync failures log to stderr and always exit 0 (non-blocking per spec)
- Runtime-created tasks (no matching file in `.saga/stories/`) are silently ignored with stderr log
- Used same `isDirectExecution` guard pattern as `scope-validator.ts` to allow importing in tests without executing main

**Tests cover:**
- Successful sync: pending→in_progress, in_progress→completed status transitions
- Field preservation: all other task fields unchanged after status sync
- Runtime-created tasks: no matching file silently ignored, no file created
- Malformed input: empty string, invalid JSON, missing tool_input, missing taskId, missing status
- Missing env vars: SAGA_STORY_ID not set, SAGA_PROJECT_DIR not set
- Malformed task file: non-JSON content in existing task file

**Next steps:**
- t5: Namespace tests (namespace.ts exists but needs dedicated unit tests)
- t6: Error handling and edge cases
- t7: Integration tests

## Session 5: 2026-02-06

### Task: t5 - Handle per-session task list namespacing

**What was done:**
- Created `packages/plugin-scripts/src/hydrate/namespace.test.ts` - 18 unit tests covering all namespace functions
- All 74 hydrate/sync tests pass (18 new + 56 existing), lint clean

**Tests cover:**
- `generateTaskListId()`: correct saga__ format, multiple hyphens, single-character story ID
- `parseTaskListId()`: valid IDs, multiple hyphens, non-SAGA IDs, empty string, partial prefix, non-numeric timestamp, old epic+story format, uppercase, underscores
- Round-trip consistency: simple, single-segment, and large timestamp scenarios
- `getTaskListDir()`: default ~/.claude/tasks/ path, custom base directory, non-SAGA IDs

**Decisions:**
- Extracted magic timestamps to named constants to satisfy biome noMagicNumbers lint rule
- Added biome-ignore comments for false-positive noSecrets warnings on describe block names

**Next steps:**
- t6: Error handling and edge cases
- t7: Integration tests

## Session 6: 2026-02-06

### Task: t6 - Add error handling and edge cases

**What was done:**
- Added 4 new tests to `packages/plugin-scripts/src/hydrate/service.test.ts` covering hydration error edge cases
- Added 7 new tests to `packages/plugin-scripts/src/sync-hook.test.ts` covering sync-hook error edge cases
- All 41 hydrate/sync tests pass (11 new + 30 existing for these two files), lint clean
- No implementation changes needed — the existing code already had comprehensive error handling; this task verified every error path with tests

**Tests added (service.test.ts):**
- Permission failure: task list directory creation fails with read-only parent → throws "Failed to create task list directory"
- Error message includes story directory path when directory is missing
- Error message includes file name when task JSON is malformed
- Error message includes path when story.json is missing

**Tests added (sync-hook.test.ts):**
- Write failure: read-only task file → returns not synced with "Failed to write task file"
- Descriptive reason message for missing SAGA_PROJECT_DIR
- Descriptive reason message for missing SAGA_STORY_ID
- File path included in "Task file not found" reason
- Parse error details included for malformed task file
- Descriptive reason for empty stdin input
- Descriptive reason for invalid JSON stdin

**Decisions:**
- No implementation changes were necessary — the hydration service and sync hook already had comprehensive error handling from t1-t4
- Extracted `READONLY_PERMISSIONS` and `READWRITE_PERMISSIONS` constants to satisfy biome noMagicNumbers rule
- Used `try/finally` pattern around chmod tests to ensure file permissions are restored even if assertions fail

**Next steps:**
- t7: Integration tests for full hydration-sync round trip

## Session 7: 2026-02-06

### Task: t7 - Write integration tests for full hydration-sync round trip

**What was done:**
- Created `packages/plugin-scripts/src/hydrate/integration.test.ts` - 10 integration tests covering the complete hydration-sync workflow
- All 412 hydrate/sync tests pass (10 new + 402 existing), lint clean

**Tests cover:**
- Full round trip: create SAGA tasks with dependency graph → hydrate to Claude Code format → verify blocks/blockedBy/metadata → sync TaskUpdate back → verify SAGA source updated with status preserved
- Multiple sequential status transitions: pending → in_progress → completed via sync hook
- Runtime-created tasks: sync for tasks not in SAGA source is silently ignored, no file created
- Per-session isolation: two hydrations with different timestamps create separate directories with independent task files
- Session independence: modifying a task in one session's directory does not affect the other
- Idempotency: re-hydration with same timestamp overwrites cleanly, reflecting source changes
- Synced status preservation: status changes synced in session 1 are picked up when re-hydrating for session 2
- Complex task graph: diamond dependency chain with correct blocks/blockedBy computation across 4 tasks
- Multi-session workflow: work through tasks in session 1 via sync, re-hydrate for session 2, verify full graph state
- File listing: hydrated directory contains exactly the expected task files (no extras)

**Decisions:**
- Used the same temp directory pattern as service.test.ts (realpathSync + mkdtempSync) for macOS compatibility
- Tested the sync hook via its exported `processSyncInput()` function (same as unit tests) rather than spawning a subprocess, since the integration boundary is the function call, not the stdin interface
- Used deterministic timestamps (TIMESTAMP_SESSION_1/2) to avoid test flakiness

**All tasks complete:**
This was the final task (t7). All 7 tasks for the hydration-sync-layer story are now done.
