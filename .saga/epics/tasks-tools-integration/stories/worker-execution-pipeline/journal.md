# Worker Execution Pipeline - Journal

## Session 1: 2026-02-06

### Task: t1 - Create worker.ts entry point with CLI argument parsing

**What was done:**
- Created `packages/plugin-scripts/src/worker.test.ts` with 15 tests covering:
  - Help output (`--help`, `-h`)
  - Missing argument validation
  - Positional argument acceptance and rejection of extras
  - `--max-cycles` option validation (missing value, non-numeric, zero, negative)
  - `--max-time` option validation (missing value, non-numeric)
  - `--model` option validation (missing value)
  - Combined options (all together, options before positional arg)
- Created `packages/plugin-scripts/src/worker.ts` with:
  - Full CLI argument parsing following the pattern from `implement.ts`
  - Exported `WorkerOptions` interface and `parseArgs` function
  - Stub pipeline steps (setupWorktree, createDraftPR, hydrateTasks, runHeadlessLoop, markPRReady)
  - Usage help with documentation of all steps, options, and environment variables
  - `process.stdout.write` for output (per task guidance, not `console.log`)

**Decisions:**
- Followed the exact iterator-based argument parsing pattern from `implement.ts` for consistency
- Made `parseArgs` exported so it can be unit-tested independently in future if needed
- Pipeline steps are async stubs that log their step number, ready for implementation in t2-t6
- Used exit code convention: 0 success, 1 error, 2 timeout/max-cycles (same as story spec)

**Test results:**
- 15/15 new tests pass
- No regressions (same 31 pre-existing failures in finder.test.ts, orchestrator.test.ts, storage.test.ts, hydrate.test.ts from previous stories)

**Next steps:**
- t2: Implement worktree and branch setup (idempotent)
- t3: Implement draft PR creation (idempotent)

## Session 2: 2026-02-06

### Task: t2 - Implement worktree and branch setup (idempotent)

**What was done:**
- Created `packages/plugin-scripts/src/worker/setup-worktree.ts` with:
  - `setupWorktree(storyId, projectDir)` function implementing idempotent worktree/branch creation
  - Branch naming: `story/<storyId>` (new flat convention, not old `story-<slug>-epic-<slug>`)
  - Worktree location: `.saga/worktrees/<storyId>/` (flat, not nested under epic)
  - Idempotent: if worktree directory exists, returns `alreadyExisted: true` and skips
  - Branch recovery: if branch exists but worktree was removed, re-creates worktree from existing branch
  - Fetches latest main branch before creating new branch
  - Creates parent directories recursively if needed
  - Uses `execFileSync` for git commands (consistent with existing `worktree.ts`)
  - Uses `@saga-ai/types` `createWorktreePaths` for path construction
- Created `packages/plugin-scripts/src/worker/setup-worktree.test.ts` with 7 tests:
  - Creates worktree and branch for a story
  - Idempotent: skip when worktree already exists
  - Re-creates worktree from existing branch when worktree is missing
  - Uses `story/<storyId>` branch naming
  - Places worktree at `.saga/worktrees/<storyId>/`
  - Creates parent directories if needed
  - Handles multiple worktrees for different stories
- Updated `packages/plugin-scripts/src/worker.ts`:
  - Imports `setupWorktree` from `./worker/setup-worktree.ts`
  - Imports `getProjectDir` from `./shared/env.ts`
  - Replaced stub `setupWorktree` with real implementation call in `main()`

**Decisions:**
- Created `worker/` subdirectory for worker sub-modules (following `implement/` pattern)
- Extracted `setupWorktree` to a separate module to avoid test issues with top-level `main()` execution in `worker.ts`
- Tests use real git operations (not mocked) following the established pattern in `worktree.test.ts`
- Fresh implementation per task guidance (not importing from old `worktree.ts`)
- Returns `SetupWorktreeResult` with `worktreePath`, `branch`, and `alreadyExisted` fields

**Test results:**
- 7/7 new tests pass
- 15/15 existing worker CLI tests still pass (22 total for worker)
- No regressions (same 31 pre-existing failures in finder.test.ts, orchestrator.test.ts, storage.test.ts, hydrate.test.ts)

**Next steps:**
- t3: Implement draft PR creation (idempotent)
- t4: Implement hydration step

## Session 3: 2026-02-06

### Task: t3 - Implement draft PR creation (idempotent)

**What was done:**
- Created `packages/plugin-scripts/src/worker/create-draft-pr.ts` with:
  - `createDraftPr(storyId, worktreePath)` function implementing idempotent draft PR creation
  - Checks for existing PR via `gh pr list --head story/<storyId> --json number,url --limit 1`
  - If PR exists, returns `alreadyExisted: true` with the existing PR URL
  - Pushes branch to origin before creating PR (`git push -u origin story/<storyId>`)
  - Creates draft PR via `gh pr create --draft --title "Story: <storyId>" --body "..."`
  - Returns `CreateDraftPrResult` with `prUrl` and `alreadyExisted` fields
  - Handles malformed JSON from `gh pr list` gracefully (treats as no existing PR)
  - Throws descriptive error if `gh pr create` fails
- Created `packages/plugin-scripts/src/worker/create-draft-pr.test.ts` with 8 tests:
  - Creates draft PR when none exists
  - Skips PR creation when PR already exists (idempotent)
  - Uses PR title format "Story: <storyId>"
  - Pushes branch before creating PR
  - Runs commands with worktree as cwd
  - Handles malformed JSON from gh pr list gracefully
  - Throws when gh pr create fails
  - Includes --body with story ID in PR creation
- Updated `packages/plugin-scripts/src/worker.ts`:
  - Imports `createDraftPr` from `./worker/create-draft-pr.ts`
  - Replaced stub with real implementation call, passing `worktreeResult.worktreePath`
  - Logs whether PR was created or already existed

**Decisions:**
- Used mocked `execFileSync` (not real git/gh) since PR creation involves external services
- Separated `findExistingPr` and `pushBranch` as private helper functions for clarity
- Kept the function synchronous (using `execFileSync`) consistent with setup-worktree pattern
- PR body includes story ID for traceability

**Test results:**
- 8/8 new tests pass
- 442/442 previously passing tests still pass (no regressions)
- Same 31 pre-existing failures in finder.test.ts, orchestrator.test.ts, storage.test.ts, hydrate.test.ts

**Next steps:**
- t4: Implement hydration step
- t5: Implement headless run loop with prompt injection

## Session 4: 2026-02-06

### Task: t4 - Implement hydration step

**What was done:**
- Created `packages/plugin-scripts/src/worker/hydrate-tasks.ts` with:
  - `hydrateTasks(storyId, projectDir, claudeTasksBase?)` function that delegates to the existing hydration service
  - Generates a session timestamp via `Date.now()` for per-session task list namespacing
  - Calls `hydrate()` from `./hydrate/service.ts` (the existing Hydration & Sync Layer implementation)
  - Logs step 4 progress with task count and taskListId
  - Returns the full `HydrationResult` (taskListId, taskCount, storyMeta) for use in subsequent pipeline steps
- Created `packages/plugin-scripts/src/worker/hydrate-tasks.test.ts` with 10 tests:
  - Returns taskListId with `saga__<storyId>__<timestamp>` format
  - Returns storyMeta with title and description
  - Returns storyMeta with optional fields (guidance, doneWhen, avoid) when present
  - Omits optional storyMeta fields when not present
  - Returns correct task count
  - Writes Claude Code format task files to the task list directory
  - Computes `blocks` from reverse dependency analysis
  - Preserves task status during hydration
  - Throws when story directory does not exist
  - Puts guidance and doneWhen into task metadata
- Updated `packages/plugin-scripts/src/worker.ts`:
  - Imports `hydrateTasks` from `./worker/hydrate-tasks.ts`
  - Removed the stub `hydrateTasks` function
  - Calls real `hydrateTasks(storyId, projectDir)` in step 3 & 4 of `main()`
  - Destructures `taskListId` from `hydrationResult` for use in headless loop

**Decisions:**
- Reused the existing `hydrate()` service from the Hydration & Sync Layer story rather than reimplementing inline (per task guidance: "If the hydration service is available, use it")
- Kept the wrapper thin — just generates timestamp, calls service, logs, returns result
- Tests use real temp directories (not mocked fs) following the pattern established in `hydrate/service.test.ts`
- `Date.now()` is mocked in tests for deterministic task list IDs

**Test results:**
- 10/10 new tests pass
- 452/452 previously passing tests still pass (no regressions)
- Same 31 pre-existing failures in finder.test.ts, orchestrator.test.ts, storage.test.ts, hydrate.test.ts

**Next steps:**
- t5: Implement headless run loop with prompt injection
- t6: Implement PR readiness marking and exit handling

## Session 5: 2026-02-06

### Task: t5 - Implement headless run loop with prompt injection

**What was done:**
- Created `packages/plugin-scripts/src/worker/run-headless-loop.ts` with:
  - `buildPrompt(meta)` function that builds a headless run prompt from story metadata, only including non-empty fields (title, description, guidance, doneWhen, avoid), with Tasks tool instruction footer
  - `checkAllTasksCompleted(storyDir)` function that reads SAGA task JSON files (excluding story.json) and returns true only if all have `status: 'completed'`
  - `spawnHeadlessRun()` internal function that spawns `claude -p "<prompt>" --model <model> --verbose --dangerously-skip-permissions` with environment variables: `CLAUDE_CODE_ENABLE_TASKS=true`, `CLAUDE_CODE_TASK_LIST_ID`, `SAGA_STORY_ID`, `SAGA_STORY_TASK_LIST_ID`
  - `runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, options)` main function implementing the cycle loop with:
    - Max cycles limit (default 10)
    - Max time limit (default 60 minutes)
    - Model selection (default opus)
    - Task completion checking after each cycle
    - Stdout/stderr streaming from child processes
    - Graceful spawn error handling (counts cycle, skips task check)
    - Returns `{ allCompleted, cycles, elapsedMinutes }`
- Created `packages/plugin-scripts/src/worker/run-headless-loop.test.ts` with 24 tests:
  - `buildPrompt`: includes all non-empty fields, omits undefined fields, includes Tasks tool footer, handles mixed presence of optional fields
  - `checkAllTasksCompleted`: returns true when all completed, false when some not completed, false when pending, excludes story.json
  - `runHeadlessLoop`: verifies environment variables (CLAUDE_CODE_ENABLE_TASKS, CLAUDE_CODE_TASK_LIST_ID, SAGA_STORY_ID, SAGA_STORY_TASK_LIST_ID), model flag, default model, worktree as cwd, allCompleted detection, multi-cycle looping, maxCycles limit, default maxCycles of 10, maxTime limit, elapsedMinutes, prompt injection from metadata, --dangerously-skip-permissions flag, spawn error handling, stdout streaming, stdio configuration
- Updated `packages/plugin-scripts/src/worker.ts`:
  - Imports `runHeadlessLoop` from `./worker/run-headless-loop.ts`
  - Removed stub `runHeadlessLoop` function
  - Made `main()` async (returns `Promise<void>`) since `runHeadlessLoop` is async
  - Passes `worktreePath`, `storyMeta`, and `projectDir` to `runHeadlessLoop`
  - Updated pipeline complete log to include cycles and elapsed time
  - Changed error handling to use `.catch()` on the async main call

**Decisions:**
- Used `spawn` from `node:child_process` (not `execFileSync`) per task guidance to stream output
- Used a `while` loop instead of `for` to avoid double-increment bug
- On spawn error, counts the cycle but skips task completion check (since sync layer may not have updated files)
- Passes `SAGA_STORY_ID` and `SAGA_STORY_TASK_LIST_ID` env vars to spawned process for session-init hook compatibility
- Task completion is checked by reading SAGA task files from `.saga/stories/<storyId>/` (sync layer updates these)
- Tests use mocked `spawn`, `readdirSync`, and `readFileSync` with vitest fake timers for time-based tests

**Test results:**
- 24/24 new tests pass
- 476/476 previously passing tests still pass (no regressions)
- Same 31 pre-existing failures in finder.test.ts, orchestrator.test.ts, storage.test.ts, hydrate.test.ts

**Next steps:**
- t6: Implement PR readiness marking and exit handling
- t7: Update environment variables and shared/env.ts

## Session 6: 2026-02-06

### Task: t6 - Implement PR readiness marking and exit handling

**What was done:**
- Created `packages/plugin-scripts/src/worker/mark-pr-ready.ts` with:
  - `markPrReady(storyId, worktreePath, allCompleted)` function that marks draft PR as ready via `gh pr ready story/<storyId>`
  - Only marks ready when `allCompleted=true`; skips when tasks are incomplete (timeout/max-cycles)
  - Handles missing PR gracefully (catches error, logs warning, does not throw)
  - Uses `execFileSync` with `cwd: worktreePath` consistent with other worker modules
  - `buildStatusSummary(allCompleted, cycles, elapsedMinutes)` returns structured summary with exit code: 0 for success, 2 for timeout/max-cycles
  - `writeOutputFile(outputFile, summary)` writes JSON summary to disk for dashboard monitoring, creates parent directories, skips when undefined
- Created `packages/plugin-scripts/src/worker/mark-pr-ready.test.ts` with 17 tests:
  - markPrReady: calls `gh pr ready` when allCompleted, skips when incomplete, handles missing PR, logs warning, logs success, uses correct branch format, uses utf-8 encoding
  - buildStatusSummary: exit code 0 for completed, exit code 2 for incomplete, includes cycles/elapsedMinutes/allCompleted/status fields
  - writeOutputFile: writes JSON to file, skips when undefined, creates parent directories, writes valid JSON
- Updated `packages/plugin-scripts/src/worker.ts`:
  - Added `--output-file <path>` CLI option for dashboard monitoring
  - Replaced stub `markPrReady` with real import from `./worker/mark-pr-ready.ts`
  - Added `buildStatusSummary` and `writeOutputFile` integration
  - Updated `main()` to exit with proper exit codes (0 success, 2 timeout)
  - Updated usage help text with new option
- Updated `packages/plugin-scripts/src/worker.test.ts`:
  - Added 2 tests for `--output-file` option (requires value, accepts path)

**Decisions:**
- Exit code 1 is reserved for errors (thrown exceptions caught in main's `.catch()`); exit code 2 is for timeout/max-cycles (non-error incomplete state)
- `markPrReady` takes `worktreePath` as cwd parameter (not just storyId) since it needs to run `gh` in the worktree directory
- `writeOutputFile` creates parent directories to support arbitrary output paths from `--output-file`
- Status summary uses `"completed"` / `"incomplete"` strings (matching the accepted vocabulary in the codebase)

**Test results:**
- 17/17 new mark-pr-ready tests pass
- 2/2 new CLI --output-file tests pass
- 495/495 previously passing tests still pass (no regressions)
- Same 31 pre-existing failures in finder.test.ts, orchestrator.test.ts, storage.test.ts, hydrate.test.ts

**Next steps:**
- t7: Update environment variables and shared/env.ts
- t8: Update session-init hook for story-based context detection

## Session 7: 2026-02-06

### Task: t7 - Update environment variables and shared/env.ts

**What was done:**
- Updated `packages/plugin-scripts/src/shared/env.ts` with:
  - `getStoryId()` — reads `SAGA_STORY_ID`, throws with descriptive message mentioning "worker context" if not set
  - `getStoryTaskListId()` — reads `SAGA_STORY_TASK_LIST_ID`, throws with descriptive message mentioning "worker context" if not set
  - `getEpicSlug()` — reads `SAGA_EPIC_SLUG`, marked with `@deprecated` JSDoc tag pointing to `getStoryId()`
  - `getStorySlug()` — reads `SAGA_STORY_SLUG`, marked with `@deprecated` JSDoc tag pointing to `getStoryId()`
- Created `packages/plugin-scripts/src/shared/env.test.ts` with 14 tests:
  - getProjectDir: returns value when set, throws when not set
  - getPluginRoot: returns value when set, throws when not set
  - getStoryId: returns value when set, throws when not set, throws with "worker context" message
  - getStoryTaskListId: returns value when set, throws when not set, throws with "worker context" message
  - getEpicSlug (deprecated): returns value when set, throws when not set
  - getStorySlug (deprecated): returns value when set, throws when not set

**Decisions:**
- Added `getEpicSlug()` and `getStorySlug()` as deprecated getters even though no formal getters existed before — this provides a centralized, documented place for the deprecation and gives callers a migration path
- Kept `getProjectDir()` and `getPluginRoot()` unchanged (not deprecated — they are still needed)
- Error messages for new getters mention "worker context" to distinguish from the session-level env vars

**Test results:**
- 14/14 new tests pass
- 509/509 previously passing tests still pass (no regressions)
- Same 31 pre-existing failures in finder.test.ts, orchestrator.test.ts, storage.test.ts, hydrate.test.ts

**Next steps:**
- t8: Update session-init hook for story-based context detection
- t9: Update scope-validator for SAGA_STORY_ID
