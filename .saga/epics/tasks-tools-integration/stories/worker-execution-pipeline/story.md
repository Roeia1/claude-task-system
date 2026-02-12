---
id: worker-execution-pipeline
title: Worker Script and Execution Pipeline
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Create worker.ts entry point with CLI argument parsing
    status: pending
  - id: t2
    title: Implement worktree and branch setup (idempotent)
    status: pending
  - id: t3
    title: Implement draft PR creation (idempotent)
    status: pending
  - id: t4
    title: Implement hydration step
    status: pending
  - id: t5
    title: Implement headless run loop with prompt injection
    status: pending
  - id: t6
    title: Implement PR readiness marking and exit handling
    status: pending
  - id: t7
    title: Update environment variables and shared/env.ts
    status: pending
  - id: t8
    title: Update session-init hook for story-based context detection
    status: pending
  - id: t9
    title: Update scope-validator for SAGA_STORY_ID
    status: pending
  - id: t10
    title: Update execute-story skill for new worker invocation
    status: pending
  - id: t11
    title: Wire worker.ts into esbuild and verify end-to-end
    status: pending
---

## Context

SAGA currently uses a markdown-based worker system where `implement.js` (compiled from `packages/plugin-scripts/src/implement.ts`) orchestrates headless Claude runs to implement story tasks. The orchestrator reads `story.md` for context, uses `SAGA_EPIC_SLUG` and `SAGA_STORY_SLUG` environment variables, and spawns headless Claude sessions that parse their own output for status signals (ONGOING/FINISH/BLOCKED).

The new system replaces this with a worker script (`worker.js`) that leverages Claude Code's native Tasks tools (`TaskList`, `TaskGet`, `TaskUpdate`) instead of parsing structured output. The worker is a linear Node.js process that runs inside a tmux session and manages end-to-end story execution: create worktree/branch, create draft PR, read `story.json` for context, hydrate SAGA tasks to `~/.claude/tasks/`, loop spawning headless runs with `CLAUDE_CODE_ENABLE_TASKS=true` and `CLAUDE_CODE_TASK_LIST_ID`, and mark the PR ready on completion.

This story also updates the supporting infrastructure -- environment variables (`SAGA_STORY_ID`, `SAGA_STORY_TASK_LIST_ID`), the session-init hook, and the scope-validator -- to work with the new story-based context where story ID is the primary identifier (replacing the old epic-slug + story-slug pair).

## Scope Boundaries

**In scope:**
- New `worker.ts` entry point in `packages/plugin-scripts/src/` that compiles to `plugin/scripts/worker.js`
- Worktree and branch creation within the worker (idempotent, using story ID for branch naming `story/<storyId>`)
- Draft PR creation via `gh` CLI (idempotent, checks if PR already exists)
- Reading `story.json` for context and building the headless run prompt
- Hydration: reading task files from `.saga/stories/<storyId>/`, converting to Claude Code format, writing to `~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/`
- Headless run execution loop using `claude -p` with `CLAUDE_CODE_ENABLE_TASKS=true` and `CLAUDE_CODE_TASK_LIST_ID`
- PR readiness marking on completion (converting draft to ready)
- New environment variables: `SAGA_STORY_ID` and `SAGA_STORY_TASK_LIST_ID`
- Updated `packages/plugin-scripts/src/shared/env.ts` with getters for new variables
- Updated `plugin/hooks/session-init.sh` to detect story worktrees and extract `SAGA_STORY_ID`
- Updated `packages/plugin-scripts/src/scope-validator.ts` to use `SAGA_STORY_ID` instead of `SAGA_EPIC_SLUG`/`SAGA_STORY_SLUG`
- Updated `plugin/skills/execute-story/SKILL.md` to invoke the new worker
- Updated worker prompt template (`plugin/skills/execute-story/worker-prompt.md`) for native Tasks flow
- Esbuild configuration to compile `worker.ts` as an entry point

**Out of scope:**
- SAGA types package changes (Zod schemas, `Story`, `Epic`, `Task` interfaces) -- covered by "SAGA Types Migration to JSON Format" story
- Storage format changes (`story.json`, `epic.json`, flat `.saga/stories/` structure) -- covered by "Story and Epic JSON Storage" story
- Hydration service as a reusable module or sync layer via tool hooks -- covered by "Hydration and Sync Layer" story
- Skills migration for `/create-epic`, `/generate-stories`, etc. -- covered by "Skills Migration" story
- Dashboard changes -- covered by "Dashboard Adaptation" story
- Epic orchestration (traversing stories in dependency order)
- Parallel worker execution

## Interface

### Inputs

- `story.json` file at `.saga/stories/<storyId>/story.json` (provided by "Story and Epic JSON Storage" story) containing: `id`, `title`, `description`, `guidance`, `doneWhen`, `avoid`, and optional `epic` reference
- Task files at `.saga/stories/<storyId>/*.json` (excluding `story.json`) containing: `id`, `subject`, `description`, `activeForm`, `status`, `blockedBy`, `guidance`, `doneWhen`
- Hydration utilities (from "Hydration and Sync Layer" story) -- if not yet available, this story implements inline hydration logic that can later be extracted
- SAGA types (`Story`, `Task`, `ClaudeCodeTask`, `toClaudeTask`) from `@saga-ai/types` -- if not yet available, this story defines local type interfaces

### Outputs

- `plugin/scripts/worker.js` -- compiled worker script invocable as `node worker.js <storyId>`
- Updated `plugin/scripts/scope-validator.js` -- scope enforcement using `SAGA_STORY_ID`
- Updated `plugin/hooks/session-init.sh` -- story-aware context detection
- Updated `plugin/skills/execute-story/SKILL.md` -- skill that invokes the new worker
- Updated `plugin/skills/execute-story/worker-prompt.md` -- prompt template for native Tasks flow
- Hydrated task files in `~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/` (runtime output)

## Acceptance Criteria

- [ ] `node plugin/scripts/worker.js <storyId>` runs end-to-end: creates worktree, creates draft PR, hydrates tasks, spawns headless runs, marks PR ready
- [ ] Worker is idempotent: running twice for the same story does not fail (worktree check, PR check)
- [ ] Headless runs receive `CLAUDE_CODE_ENABLE_TASKS=true` and `CLAUDE_CODE_TASK_LIST_ID=saga__<storyId>__<sessionTimestamp>`
- [ ] Story context (title, description, guidance, doneWhen, avoid) is injected into headless run prompt from `story.json`
- [ ] Task files are hydrated to `~/.claude/tasks/<taskListId>/` in Claude Code format before first headless run
- [ ] Worker detects when all tasks are completed and marks PR as ready-for-review
- [ ] `session-init.sh` detects story worktrees at `.saga/worktrees/<storyId>/` and sets `SAGA_STORY_ID`
- [ ] `scope-validator.js` uses `SAGA_STORY_ID` to validate file access within `.saga/stories/<storyId>/`
- [ ] `execute-story` skill creates tmux session and invokes worker with correct arguments
- [ ] All new code has unit tests with >80% coverage
- [ ] `pnpm build` in `packages/plugin-scripts/` produces `plugin/scripts/worker.js`

## Tasks

### t1: Create worker.ts entry point with CLI argument parsing

**Guidance:**
- Create `packages/plugin-scripts/src/worker.ts` as the main entry point
- Accept a single positional argument: `storyId` (e.g., `node worker.js auth-setup-db`)
- Accept optional flags: `--max-cycles <n>` (default 10), `--max-time <minutes>` (default 60), `--model <model>` (default `opus`)
- Follow the CLI pattern established in `packages/plugin-scripts/src/implement.ts` and `packages/plugin-scripts/src/worktree.ts`
- The worker is a linear process (no re-entry). Steps are: (1) setup worktree/branch, (2) create draft PR, (3) read story.json, (4) hydrate tasks, (5) loop headless runs, (6) mark PR ready
- Import environment helpers from `./shared/env.ts`
- Use `process.stdout.write` for structured output (not `console.log`)

**References:**
- `packages/plugin-scripts/src/implement.ts` -- existing entry point pattern
- `packages/plugin-scripts/src/worktree.ts` -- CLI argument parsing pattern
- `packages/plugin-scripts/src/shared/env.ts` -- environment variable helpers

**Avoid:**
- Do not create a class-based architecture; keep it functional like the existing scripts
- Do not add tmux session creation to the worker; that is the skill's responsibility
- Do not handle stdin interaction; this is a headless process

**Done when:**
- `worker.ts` exists with `main()` function that parses CLI arguments
- Running `node worker.js` without arguments prints usage help
- Running `node worker.js <storyId>` invokes the pipeline (steps can be stubs initially)
- Unit tests verify argument parsing and validation

### t2: Implement worktree and branch setup (idempotent)

**Guidance:**
- Implement step 1 of the worker pipeline: create worktree and branch for the story
- Branch naming: `story/<storyId>` (e.g., `story/auth-setup-db`)
- Worktree location: `.saga/worktrees/<storyId>/` (flat, not nested under epic)
- Must be idempotent: if worktree already exists, skip creation and log a message
- If branch exists but worktree does not, create the worktree from existing branch
- Use `git worktree add` and `git branch` commands via `execFileSync`
- Fetch latest main branch before creating the new branch

**References:**
- `packages/plugin-scripts/src/worktree.ts` -- existing worktree creation logic (this is the old epic-based naming; adapt to story-based)
- Epic section "Worktree and Branch Naming" -- defines `story/<storyId>` branch format and `.saga/worktrees/<storyId>/` path

**Avoid:**
- Do not use the old `story-<storySlug>-epic-<epicSlug>` branch naming convention
- Do not error on existing worktree/branch; be idempotent
- Do not import from the old `worktree.ts` directly; implement fresh logic in the worker module

**Done when:**
- Worker creates worktree at `.saga/worktrees/<storyId>/` with branch `story/<storyId>`
- Running twice does not fail; second run logs "worktree already exists" and continues
- If only the branch exists (worktree removed), worktree is re-created from existing branch
- Unit tests verify idempotent behavior with mocked git commands

### t3: Implement draft PR creation (idempotent)

**Guidance:**
- Implement step 2: create a draft PR for the story branch
- Use `gh pr create --draft --title "Story: <storyId>" --body "..."` via `execFileSync`
- Must be idempotent: check if a PR already exists for this branch first using `gh pr list --head <branch> --json number --limit 1`
- If PR exists, log and skip. If not, create it.
- Store the PR URL in `story.json` by updating the `pr` field (if story.json write utilities are available)
- Run from the worktree directory as cwd

**References:**
- `gh pr create` CLI documentation
- `gh pr list` for checking existing PRs
- Epic section "Worker Architecture" step 2

**Avoid:**
- Do not create PRs against non-default branches
- Do not make the PR non-draft; it starts as draft and is marked ready only on completion

**Done when:**
- Worker creates a draft PR when none exists for the branch
- Running twice does not create duplicate PRs
- PR title follows the format `Story: <storyId>`
- Unit tests verify idempotent PR creation with mocked `gh` commands

### t4: Implement hydration step

**Guidance:**
- Implement step 4: read story tasks and hydrate them to `~/.claude/tasks/`
- Generate a task list ID: `saga__<storyId>__<sessionTimestamp>` where timestamp is `Date.now()`
- Read all `*.json` files from `.saga/stories/<storyId>/` (excluding `story.json`) as SAGA task files
- Convert each SAGA task to Claude Code format using a `toClaudeTask` function:
  - Map `id`, `subject`, `description`, `activeForm`, `status`, `blockedBy` directly
  - Set `blocks` by computing reverse dependencies from other tasks' `blockedBy` arrays
  - Put `guidance` and `doneWhen` into `metadata`
- Create the directory `~/.claude/tasks/<taskListId>/`
- Write each converted task as `<taskId>.json`
- Return the `taskListId` for use in headless run spawning
- If the hydration service from the "Hydration and Sync Layer" story is available, use it; otherwise implement inline logic that follows the same contract

**References:**
- Epic section "Hydration & Sync" -- describes the full hydration flow
- Epic section "Conversion Layer" -- `toClaudeTask` and `fromClaudeTask` functions
- Epic section "ClaudeCodeTask Type" -- target format for `~/.claude/tasks/`
- `~/.claude/tasks/` -- Claude Code's native task storage location

**Avoid:**
- Do not hydrate `story.json` as a task; it is metadata, not an executable task
- Do not sync status back during hydration; sync is handled separately via tool hooks (different story)
- Do not clean up old task list directories; per-session namespacing eliminates the need

**Done when:**
- Worker reads SAGA task files and writes Claude Code format tasks to `~/.claude/tasks/saga__<storyId>__<timestamp>/`
- Conversion preserves all fields correctly (subject, description, status, blockedBy, metadata)
- `blocks` field is computed from reverse dependency analysis
- Unit tests verify conversion logic and file writing with mocked filesystem

### t5: Implement headless run loop with prompt injection

**Guidance:**
- Implement step 5: the main execution loop that spawns headless Claude runs
- Read `story.json` fields and build the prompt template:
  ```
  You are working on: ${story.title}

  ${story.description}

  Guidance: ${story.guidance}

  Done when: ${story.doneWhen}

  Avoid: ${story.avoid}

  Execute the tasks in the task list using TaskList, TaskGet, and TaskUpdate.
  ```
- Only include non-empty fields in the prompt
- Spawn headless runs via `claude -p "<prompt>"` with environment variables:
  - `CLAUDE_CODE_ENABLE_TASKS=true`
  - `CLAUDE_CODE_TASK_LIST_ID=<taskListId>`
- Use `spawn` from `node:child_process` (not `execFileSync`) to stream output
- After each headless run completes, check if all tasks are done by reading the task files from `.saga/stories/<storyId>/` (sync layer will have updated them) or by re-hydrating
- Respect `maxCycles` and `maxTime` limits
- The loop exits when: all tasks completed, max cycles reached, or max time exceeded

**References:**
- `packages/plugin-scripts/src/implement/session-manager.ts` -- existing `spawnWorkerAsync` for spawning patterns
- `packages/plugin-scripts/src/implement/orchestrator.ts` -- existing loop structure (adapt, do not copy wholesale)
- Epic section "Worker Architecture" and "Headless Run Execution Loop"
- Epic section "Error Handling" -- headless run crash behavior

**Avoid:**
- Do not parse structured JSON output from headless runs for ONGOING/FINISH/BLOCKED signals; the native Tasks tools handle status tracking
- Do not use the old `--json-schema` flag for structured output; the worker checks task completion status directly
- Do not retry failed headless runs automatically; log the error and let the loop continue or exit based on cycle limits

**Done when:**
- Worker spawns headless Claude runs with correct environment variables
- Prompt is built from `story.json` fields, omitting empty ones
- Loop respects max cycles and max time limits
- Loop detects task completion by checking SAGA task statuses
- Unit tests verify prompt building, environment setup, and loop exit conditions

### t6: Implement PR readiness marking and exit handling

**Guidance:**
- Implement step 6: when all tasks are completed, mark the draft PR as ready for review
- Use `gh pr ready <branch>` to convert draft to ready
- Handle the case where PR does not exist (log warning, do not fail)
- Output a final status summary to stdout: cycles completed, elapsed time, final status
- Exit codes: 0 for success (all tasks done), 1 for error, 2 for max-cycles/timeout
- Log output to a file specified by `--output-file <path>` flag (for dashboard monitoring)

**References:**
- `gh pr ready` CLI documentation
- `packages/plugin-scripts/src/implement/orchestrator.ts` lines 146-165 -- `buildLoopResult` for result formatting pattern

**Avoid:**
- Do not mark PR ready if tasks are incomplete (timeout or max-cycles case)
- Do not delete the worktree on completion; it may be needed for follow-up work

**Done when:**
- Worker marks PR ready when all tasks complete
- Worker outputs structured status summary on exit
- Exit codes reflect completion status
- Unit tests verify PR marking logic and exit code selection

### t7: Update environment variables and shared/env.ts

**Guidance:**
- Add two new environment variable getters to `packages/plugin-scripts/src/shared/env.ts`:
  - `getStoryId()` reads `SAGA_STORY_ID` (required in worker context, throws if not set)
  - `getStoryTaskListId()` reads `SAGA_STORY_TASK_LIST_ID` (required in worker context, throws if not set)
- Keep existing `getProjectDir()` and `getPluginRoot()` unchanged
- The worker sets these variables before spawning headless runs:
  - `SAGA_STORY_ID` = story ID
  - `SAGA_STORY_TASK_LIST_ID` = `saga__<storyId>__<sessionTimestamp>`
- Deprecate `SAGA_EPIC_SLUG` and `SAGA_STORY_SLUG` (add JSDoc `@deprecated` comments but keep the functions for backward compatibility)

**References:**
- `packages/plugin-scripts/src/shared/env.ts` -- existing helpers to extend
- Epic section "Environment Variables" -- full variable table with old vs new

**Avoid:**
- Do not remove existing environment variable getters; other scripts may still use them during migration
- Do not add validation beyond presence check; the variable values are validated elsewhere

**Done when:**
- `getStoryId()` and `getStoryTaskListId()` exist in `shared/env.ts`
- Existing functions are annotated with `@deprecated`
- Unit tests verify the new getters (set env, call function, assert return value)

### t8: Update session-init hook for story-based context detection

**Guidance:**
- Update `plugin/hooks/session-init.sh` to detect the new worktree layout
- New detection logic: if inside a worktree at `.saga/worktrees/<storyId>/`, extract story ID from the folder name (it is the last path component)
- Set `SAGA_STORY_ID` in `CLAUDE_ENV_FILE` when in a story worktree
- Keep setting `SAGA_TASK_CONTEXT="story-worktree"` for backward compatibility
- The new path pattern is `.saga/worktrees/<storyId>/` (flat, not `.saga/worktrees/<epicSlug>/<storySlug>/`)

**References:**
- `plugin/hooks/session-init.sh` -- current implementation to modify
- Epic section "Context Detection" -- updated detection logic with `SAGA_STORY_ID`

**Avoid:**
- Do not remove existing context detection for the old worktree layout; both should work during the transition
- Do not set `SAGA_STORY_TASK_LIST_ID` in the hook; that is only set by the worker at runtime

**Done when:**
- Hook detects `.saga/worktrees/<storyId>/` paths and sets `SAGA_STORY_ID`
- Hook still works for old `.saga/worktrees/<epicSlug>/<storySlug>/` paths
- `SAGA_TASK_CONTEXT` is set correctly for both layouts
- Manual verification by checking the hook output in both worktree layouts

### t9: Update scope-validator for SAGA_STORY_ID

**Guidance:**
- Update `packages/plugin-scripts/src/scope-validator.ts` to support `SAGA_STORY_ID` as the primary scope identifier
- When `SAGA_STORY_ID` is set, validate access against `.saga/stories/<storyId>/` instead of the old `.saga/epics/<epicSlug>/stories/<storySlug>/` path
- Keep backward compatibility: if `SAGA_STORY_ID` is not set, fall back to `SAGA_EPIC_SLUG` + `SAGA_STORY_SLUG`
- Update the `getScopeEnvironment()` function to prefer the new variable
- Update `checkStoryAccess()` to validate against the flat `.saga/stories/<storyId>/` path

**References:**
- `packages/plugin-scripts/src/scope-validator.ts` -- current implementation to modify
- `packages/plugin-scripts/src/scope-validator.test.ts` -- existing tests to extend
- Epic section "Scope Validation" -- updated validation logic

**Avoid:**
- Do not remove the old `SAGA_EPIC_SLUG`/`SAGA_STORY_SLUG` code path immediately; maintain backward compatibility
- Do not validate paths outside `.saga/` (project files are always allowed within the worktree)

**Done when:**
- Scope validator uses `SAGA_STORY_ID` when available to check `.saga/stories/<storyId>/` access
- Falls back to old variables when `SAGA_STORY_ID` is not set
- Existing tests still pass
- New tests verify `.saga/stories/<storyId>/` scope enforcement
- New tests verify backward compatibility with old variable names

### t10: Update execute-story skill for new worker invocation

**Guidance:**
- Update `plugin/skills/execute-story/SKILL.md` to invoke the new worker script
- The skill should: (1) resolve the story (using existing find.js or equivalent), (2) create a tmux session, (3) run `node $SAGA_PLUGIN_ROOT/scripts/worker.js <storyId>` inside the session
- Update the tmux session naming to `saga-story-<storyId>-<timestamp>`
- Update the worker prompt template (`worker-prompt.md`) to instruct headless runs to use native Tasks tools instead of parsing story.md
- The prompt should tell the headless run to use `TaskList`, `TaskGet`, `TaskUpdate` for task execution

**References:**
- `plugin/skills/execute-story/SKILL.md` -- current skill to update
- `plugin/skills/execute-story/worker-prompt.md` -- current prompt to update
- `packages/plugin-scripts/src/implement/session-manager.ts` lines 187-218 -- `createSession()` for tmux pattern
- Epic section "Tmux Session Management" -- updated session naming

**Avoid:**
- Do not put execution logic in the skill; the skill only creates the tmux session and invokes the worker
- Do not remove the existing skill entirely; update it to use the new worker

**Done when:**
- Skill invokes `node $SAGA_PLUGIN_ROOT/scripts/worker.js <storyId>` in a tmux session
- Session naming follows `saga-story-<storyId>-<timestamp>` format
- Worker prompt instructs headless runs to use native Tasks tools
- Skill outputs monitoring instructions (session name, output file)

### t11: Wire worker.ts into esbuild and verify end-to-end

**Guidance:**
- Verify that `packages/plugin-scripts/esbuild.config.mjs` picks up `worker.ts` as an entry point (it should automatically since it scans `src/*.ts`)
- Run `pnpm build` in `packages/plugin-scripts/` and verify `plugin/scripts/worker.js` is produced
- Run `node plugin/scripts/worker.js --help` to verify the compiled script works
- Run the full test suite to ensure no regressions
- Verify the build output includes the shebang line (`#!/usr/bin/env node`)

**References:**
- `packages/plugin-scripts/esbuild.config.mjs` -- build configuration
- `packages/plugin-scripts/package.json` -- build scripts

**Avoid:**
- Do not modify esbuild.config.mjs unless the automatic entry point scanning does not pick up worker.ts
- Do not skip running the existing test suite; regressions in other scripts would be a problem

**Done when:**
- `pnpm build` produces `plugin/scripts/worker.js`
- `node plugin/scripts/worker.js --help` prints usage information
- All existing tests pass (`pnpm test` in `packages/plugin-scripts/`)
- All new tests pass
