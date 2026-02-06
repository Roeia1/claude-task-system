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
