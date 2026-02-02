# Journal: cli-dashboard-package

## Session 1: 2026-02-02

### Task: t1 - Rename packages/cli to packages/dashboard

**What was done:**
- Used `git mv packages/cli packages/dashboard` to rename directory while preserving git history
- Updated biome.json to reference `packages/dashboard` instead of `packages/cli` (8 occurrences)
- Updated packages/dashboard/package.json repository.directory from "packages/cli" to "packages/dashboard"
- Updated CLAUDE.md repository structure and documentation links
- Updated README.md documentation link
- Updated .claude/skills/publish/SKILL.md references (5 occurrences)
- Updated .claude/rules/cli-testing.md paths

**Files modified:**
- biome.json
- packages/dashboard/package.json
- CLAUDE.md
- README.md
- .claude/skills/publish/SKILL.md
- .claude/rules/cli-testing.md

**Verification:**
- `packages/dashboard/` exists with all files from cli
- No references to `packages/cli/` in config files (except pnpm-lock.yaml which regenerates)
- Git properly shows files as renamed (R status)

**Notes:**
- The pnpm-lock.yaml still contains old references but will update on next `pnpm install`
- Historical files in `.saga/` archive still reference old path but these are documentation artifacts

**Next steps:**
- t2: Update package.json for @saga-ai/dashboard (change package name, description)
- Subsequent tasks will remove non-dashboard commands and SAGA_* dependencies

## Session 2: 2026-02-03

### Task: t2 - Update package.json for @saga-ai/dashboard

**What was done:**
- Changed package name from `@saga-ai/cli` to `@saga-ai/dashboard`
- Updated description to "Dashboard and session monitoring for SAGA - Structured Autonomous Goal Achievement"
- Updated keywords from `["claude", "saga", "cli", "workflow", "automation"]` to `["claude", "saga", "dashboard", "monitoring", "sessions"]`
- Added `@saga-ai/types` workspace dependency (the actual package name, not `saga-types`)
- Ran `pnpm install` to update lockfile
- Verified build succeeds with new package name

**Files modified:**
- packages/dashboard/package.json
- pnpm-lock.yaml (regenerated)

**Verification:**
- Build passes: `pnpm build` in packages/dashboard succeeds
- Package name is now `@saga-ai/dashboard`
- `@saga-ai/types` is in dependencies

**Notes:**
- The story mentioned `@saga-ai/saga-types` but the actual package created by foundation story is `@saga-ai/types`
- Pre-existing test failures remain (tmux test, storybook snapshot tests) - not related to this task

**Next steps:**
- t3: Remove non-dashboard commands from CLI entry point

## Session 3: 2026-02-03

### Task: t3 - Remove non-dashboard commands from CLI entry point

**What was done:**
- Updated `src/cli.ts` to remove imports and command registrations for: `init`, `implement`, `find`, `worktree`, `scope-validator`
- Updated `src/commands/sessions/index.ts` to remove `kill` subcommand (kept `list`, `status`, `logs`)
- Deleted command files: `implement.ts`, `scope-validator.ts`, `find.ts`, `worktree.ts`, `init.ts` and their tests
- Deleted `utils/finder.ts` and `utils/finder.test.ts` (only used by removed commands)
- Updated `src/cli.test.ts` with tests for retained commands and tests verifying removed commands show "unknown command" errors
- Updated `src/commands/sessions/index.test.ts` to remove kill command tests

**Files deleted (via git rm):**
- packages/dashboard/src/commands/implement.ts
- packages/dashboard/src/commands/implement.test.ts
- packages/dashboard/src/commands/scope-validator.ts
- packages/dashboard/src/commands/scope-validator.test.ts
- packages/dashboard/src/commands/find.ts
- packages/dashboard/src/commands/find.test.ts
- packages/dashboard/src/commands/worktree.ts
- packages/dashboard/src/commands/worktree.test.ts
- packages/dashboard/src/commands/init.ts
- packages/dashboard/src/commands/init.test.ts
- packages/dashboard/src/utils/finder.ts
- packages/dashboard/src/utils/finder.test.ts

**Files modified:**
- packages/dashboard/src/cli.ts
- packages/dashboard/src/cli.test.ts
- packages/dashboard/src/commands/sessions/index.ts
- packages/dashboard/src/commands/sessions/index.test.ts

**Verification:**
- Build passes: `pnpm build` succeeds (CLI bundle reduced from 99.6kb to 53.6kb)
- `saga dashboard --help` works
- `saga sessions list|status|logs` commands work
- `saga init`, `saga implement`, `saga find`, `saga worktree`, `saga scope-validator` all show "unknown command" errors
- `saga sessions kill` shows "unknown command" error
- Unit tests pass (557 tests pass, 4 pre-existing storybook snapshot failures)

**Notes:**
- Pre-existing storybook snapshot test failures remain (4 tests) - not related to this task
- The CLI is now focused solely on dashboard and session monitoring functionality

**Next steps:**
- t4: Remove SAGA_* environment variable dependencies

## Session 4: 2026-02-03

### Task: t4 - Remove SAGA_* environment variable dependencies

**What was done:**
- Verified that plugin-specific environment variables are NOT present in dashboard code:
  - `SAGA_PLUGIN_ROOT` - not found
  - `SAGA_PROJECT_DIR` - not found
  - `SAGA_EPIC_SLUG` - not found
  - `SAGA_STORY_SLUG` - not found
  - `SAGA_TASK_CONTEXT` - not found
- Verified dashboard uses `project-discovery.ts` to discover `.saga/` directory by walking up from cwd
- Verified session viewing works via tmux directly without any env vars
- Fixed lint formatting issue in `src/commands/sessions/index.test.ts` (from previous session)

**Analysis of remaining SAGA_* references:**

Two SAGA_* references remain in the code, but these are NOT plugin dependencies:

1. `SAGA_USE_POLLING` in `src/server/watcher.ts`:
   - An optional dashboard configuration flag for file watching mode
   - Enables polling for more reliable test behavior
   - Not required - dashboard works without it (defaults to native watching)
   - Not a plugin dependency - anyone can set this

2. `SAGA_INTERNAL_SESSION` in `src/lib/sessions.ts`:
   - Exported in shell scripts created by the dashboard when spawning tmux sessions
   - Used as a signal FOR the plugin to detect session context
   - This is an OUTPUT from dashboard, not an INPUT/dependency
   - Part of the documented interface between dashboard and plugin

**Decision:**
- Per the acceptance criteria (line 85 of story.md), the specific variables to remove are:
  `SAGA_PLUGIN_ROOT`, `SAGA_PROJECT_DIR`, `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`
- These are the plugin-specific environment variables that would create dependencies
- `SAGA_USE_POLLING` and `SAGA_INTERNAL_SESSION` are NOT in this list
- The task guidance also lists only these specific variables
- The done-when grep criteria appears overly broad compared to the specific guidance

**Verification:**
- `grep -rn "SAGA_PLUGIN_ROOT|SAGA_PROJECT_DIR|SAGA_EPIC_SLUG|SAGA_STORY_SLUG|SAGA_TASK_CONTEXT" src/` returns no results
- Dashboard uses `resolveProjectPath()` which walks up from cwd to find `.saga/`
- Session commands use tmux directly via `listSessions`, `getSessionStatus`, `streamLogs`
- Dashboard starts and works with no SAGA_* env vars set (SAGA_USE_POLLING is optional)

**Files modified:**
- packages/dashboard/src/commands/sessions/index.test.ts (lint fix only)

**Next steps:**
- t5: Update imports to use saga-types
