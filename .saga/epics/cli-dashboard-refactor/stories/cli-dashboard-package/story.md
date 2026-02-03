---
id: cli-dashboard-package
title: Refactor CLI to standalone dashboard package
status: completed
epic: cli-dashboard-refactor
tasks:
  - id: t1
    title: Rename packages/cli to packages/dashboard
    status: completed
  - id: t2
    title: Update package.json for @saga-ai/dashboard
    status: completed
  - id: t3
    title: Remove non-dashboard commands from CLI entry point
    status: completed
  - id: t4
    title: Remove SAGA_* environment variable dependencies
    status: completed
  - id: t5
    title: Update imports to use saga-types
    status: completed
  - id: t6
    title: Convert init.ts to plugin skill
    status: completed
  - id: t7
    title: Update and verify tests
    status: completed
---

## Context

The current `@saga-ai/cli` package contains a mix of responsibilities: a standalone dashboard for monitoring epics/stories, and orchestration commands (`implement`, `scope-validator`, `find`, `worktree`, `init`, `sessions`) that depend on SAGA plugin environment variables. This creates a circular dependency where the CLI requires `SAGA_PLUGIN_ROOT` to function, preventing it from being a truly standalone tool.

This story transforms `packages/cli/` into `packages/dashboard/` with package name `@saga-ai/dashboard`. The dashboard will be a standalone package that only needs to read the `.saga/` directory structure - no plugin dependencies. It will contain:
- The dashboard command (`saga dashboard`) for the web-based monitoring UI
- Session viewing commands (`sessions list`, `sessions status`, `sessions logs`) for monitoring worker sessions

All orchestration commands are being migrated to `packages/plugin-scripts/` by a parallel story ("Migrate all commands to plugin-scripts"). The `init` command becomes a plugin skill since it's only invoked via `/init`.

## Scope Boundaries

**In scope:**
- Renaming `packages/cli/` directory to `packages/dashboard/`
- Updating package name from `@saga-ai/cli` to `@saga-ai/dashboard`
- Keeping only: `dashboard.ts`, `server/`, `client/`, session viewing (`list`, `status`, `logs`)
- Removing CLI entry points for: `implement`, `scope-validator`, `find`, `worktree`, `init`, `sessions kill`
- Removing all SAGA_* environment variable usage from retained code
- Updating imports to use `@saga-ai/saga-types` (depends on foundation story)
- Converting `init.ts` to plugin skill at `plugin/skills/init/`
- Updating tests for retained functionality

**Out of scope:**
- Migrating `implement`, `scope-validator`, `find`, `worktree`, `sessions kill` to plugin-scripts (handled by "Migrate all commands to plugin-scripts" story)
- Creating the `@saga-ai/saga-types` package (handled by "Create foundation packages" story)
- Updating plugin skills to use new scripts (handled by "Update plugin skills" story)
- Publishing to npm (handled by "Update plugin skills" story)
- Changing dashboard functionality or UI
- Modifying `.saga/` directory structure

## Interface

### Inputs

- `packages/saga-types/` with Epic, Story, Session, and directory structure types (from "Create foundation packages" story)
- Existing `packages/cli/` codebase with dashboard and session viewing functionality

### Outputs

- `packages/dashboard/` directory with `@saga-ai/dashboard` package
- Dashboard command working standalone (no SAGA_* env vars required)
- Session viewing commands (`list`, `status`, `logs`) retained
- `plugin/skills/init/` skill created from `init.ts`
- Clean separation: dashboard reads `.saga/`, plugin writes to it

## Acceptance Criteria

- [ ] Directory renamed from `packages/cli/` to `packages/dashboard/`
- [ ] Package name is `@saga-ai/dashboard` in package.json
- [ ] `saga dashboard` command works without any SAGA_* environment variables
- [ ] `saga sessions list`, `saga sessions status`, `saga sessions logs` commands work
- [ ] Commands removed from CLI entry: `implement`, `scope-validator`, `find`, `worktree`, `init`, `sessions kill`
- [ ] All imports use `@saga-ai/saga-types` for shared types
- [ ] `plugin/skills/init/SKILL.md` exists and contains converted init functionality
- [ ] `pnpm test` passes in `packages/dashboard/`
- [ ] No references to `SAGA_PLUGIN_ROOT`, `SAGA_PROJECT_DIR`, `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG` in dashboard code

## Tasks

### t1: Rename packages/cli to packages/dashboard

**Guidance:**
- Use `git mv packages/cli packages/dashboard` to preserve git history
- Update root `package.json` workspace references if present
- Update any `tsconfig.json` references in root or other packages

**References:**
- `packages/cli/` - current location
- Root `package.json` - may have workspace configuration

**Avoid:**
- Using filesystem rename instead of git mv (loses history)
- Forgetting to update workspace references

**Done when:**
- `packages/dashboard/` exists with all files from cli
- `git log --follow packages/dashboard/src/cli.ts` shows history
- No references to `packages/cli/` remain in config files

### t2: Update package.json for @saga-ai/dashboard

**Guidance:**
- Change `"name"` from `"@saga-ai/cli"` to `"@saga-ai/dashboard"`
- Update `"description"` to reflect dashboard-only purpose
- Keep version at current (will be bumped to 3.0.0 in publish story)
- Update `"bin"` entry if needed
- Remove dependencies only used by commands being removed (after t3)
- Add dependency on `@saga-ai/saga-types` (workspace reference)

**References:**
- `packages/cli/package.json` - current package.json
- Epic section on version 3.0.0 strategy

**Avoid:**
- Removing dependencies still needed by dashboard/server/client
- Changing version number (done in separate story)

**Done when:**
- Package name is `@saga-ai/dashboard`
- Description mentions dashboard/monitoring purpose
- `@saga-ai/saga-types` is in dependencies

### t3: Remove non-dashboard commands from CLI entry point

**Guidance:**
- Edit `src/cli.ts` to remove command registrations for: `implement`, `scope-validator`, `find`, `worktree`, `init`
- Edit `src/commands/sessions/index.ts` to remove `kill` subcommand, keep `list`, `status`, `logs`
- Delete command files being removed: `implement.ts`, `scope-validator.ts`, `find.ts`, `worktree.ts`, `init.ts`
- Delete corresponding test files for removed commands
- Keep: `dashboard.ts`, `server/`, `client/`, `lib/`, `utils/` (except `finder.ts` if only used by removed commands)

**References:**
- `packages/cli/src/cli.ts` - Commander.js command registration
- `packages/cli/src/commands/sessions/index.ts` - sessions subcommands
- Epic "Components to Move" table

**Avoid:**
- Deleting files still needed by dashboard (e.g., `project-discovery.ts`)
- Breaking session viewing functionality

**Done when:**
- `saga dashboard` command works
- `saga sessions list|status|logs` commands work
- `saga implement`, `saga init`, etc. show "unknown command" errors
- No dead code remains

### t4: Remove SAGA_* environment variable dependencies

**Guidance:**
- Search for `SAGA_PLUGIN_ROOT`, `SAGA_PROJECT_DIR`, `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`, `SAGA_TASK_CONTEXT` in remaining code
- For dashboard, it should discover `.saga/` directory via `project-discovery.ts` (walking up from cwd)
- Session viewing should work by discovering sessions via tmux directly (doesn't need SAGA_* vars)
- Remove any conditional logic that depends on these env vars

**References:**
- `packages/cli/src/utils/project-discovery.ts` - existing discovery logic
- `packages/cli/src/lib/sessions.ts` - session utilities
- Epic section on "Dashboard as Standalone Package"

**Avoid:**
- Breaking the `--path` flag override for dashboard
- Removing env var handling that's actually in code being deleted (already handled in t3)

**Done when:**
- `grep -r "SAGA_" packages/dashboard/src/` returns no results
- Dashboard starts and works with no env vars set
- Session viewing works with no env vars set

### t5: Update imports to use saga-types

**Guidance:**
- Replace local type definitions with imports from `@saga-ai/saga-types`
- Types to import: `Epic`, `Story`, `StoryStatus`, `Session`, `SessionStatus`, etc.
- Update any Zod schema usage to use schemas from saga-types
- Ensure workspace dependency allows local development

**References:**
- `packages/saga-types/src/index.ts` - exported types (from foundation story)
- Epic "Zod Schemas" section for schema structure
- Existing type definitions in CLI code

**Avoid:**
- Duplicating type definitions that exist in saga-types
- Breaking type safety by using `any`

**Done when:**
- All shared types imported from `@saga-ai/saga-types`
- No duplicate type definitions in dashboard code
- TypeScript compiles without errors

### t6: Convert init.ts to plugin skill

**Guidance:**
- Create `plugin/skills/init/` directory structure
- Create `SKILL.md` that describes the /init command
- The init logic creates `.saga/` directory structure
- This is a user-invocable skill (not an internal script)
- Can reference init.ts logic but implement as markdown instructions for Claude
- No TypeScript needed - skill describes what Claude should do

**References:**
- `packages/cli/src/commands/init.ts` - current implementation
- `plugin/skills/create-epic/SKILL.md` - example skill structure
- Epic "Target Architecture" showing init as plugin skill

**Avoid:**
- Making init a plugin-script (it's a skill, not a script)
- Over-complicating the skill - it just creates directories

**Done when:**
- `plugin/skills/init/SKILL.md` exists
- Skill describes creating `.saga/epics/` directory structure
- Plugin manifests updated if needed to register skill

### t7: Update and verify tests

**Guidance:**
- Update test file paths after directory rename
- Remove tests for deleted commands
- Update remaining tests to not depend on SAGA_* env vars
- Ensure dashboard and session viewing tests pass
- Update any mocks that reference removed functionality

**References:**
- `packages/cli/src/commands/dashboard.test.ts` - dashboard tests
- `packages/cli/src/commands/sessions/index.test.ts` - session tests
- `packages/cli/docs/TESTING.md` - testing guidelines

**Avoid:**
- Leaving broken test imports
- Skipping tests instead of fixing them

**Done when:**
- `pnpm test` passes in `packages/dashboard/`
- No test files reference removed commands
- Coverage maintained for retained functionality
