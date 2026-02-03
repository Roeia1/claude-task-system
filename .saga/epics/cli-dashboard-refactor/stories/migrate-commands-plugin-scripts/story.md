---
id: migrate-commands-plugin-scripts
title: Migrate all commands to plugin-scripts
status: ready
epic: cli-dashboard-refactor
tasks:
  - id: t1
    title: Migrate worktree.ts
    status: pending
  - id: t2
    title: Migrate find.ts and finder.ts
    status: pending
  - id: t3
    title: Migrate scope-validator.ts
    status: pending
  - id: t4
    title: Migrate sessions-kill.ts
    status: pending
  - id: t5
    title: Migrate and split implement.ts
    status: pending
  - id: t6
    title: Update all imports to use saga-types
    status: pending
  - id: t7
    title: Migrate and extend tests
    status: pending
---

## Context

This story migrates all plugin-dependent CLI commands from `packages/cli/src/commands/` to `packages/plugin-scripts/src/`, establishing a clean separation where the CLI becomes a standalone dashboard while the plugin contains all orchestration logic. The commands being migrated are those that depend on `SAGA_*` environment variables and plugin context: `implement.ts`, `scope-validator.ts`, `find.ts` (with its `finder.ts` utility), `worktree.ts`, and `sessions-kill`. After this migration, these commands will be called via `node $SAGA_PLUGIN_ROOT/scripts/<name>.js` from plugin skills instead of `npx @saga-ai/cli <command>`.

The largest file, `implement.ts` (~1200 lines), will be refactored into focused modules during migration: `orchestrator.ts` (main worker loop), `session-manager.ts` (tmux operations), `output-parser.ts` (worker JSON parsing), and `scope-config.ts` (hook configuration). This improves testability and maintainability.

This work depends on the foundation packages story (saga-types + plugin-scripts infrastructure) being completed first, as we need the Zod schemas and build configuration in place.

## Scope Boundaries

**In scope:**
- Migrate `worktree.ts` (187 lines) to `packages/plugin-scripts/src/worktree.ts`
- Migrate `find.ts` (60 lines) + `finder.ts` (371 lines) to `packages/plugin-scripts/src/find/`
- Migrate `scope-validator.ts` (240 lines) to `packages/plugin-scripts/src/scope-validator.ts`
- Migrate `sessions/kill` functionality to `packages/plugin-scripts/src/sessions-kill.ts`
- Migrate and refactor `implement.ts` (1214 lines) into `packages/plugin-scripts/src/implement/` with split modules
- Update all imports to use `@saga-ai/types` (from saga-types package)
- Migrate existing tests from CLI to plugin-scripts
- Add new unit tests for split implement modules
- Ensure all scripts output to `plugin/scripts/` via esbuild build

**Out of scope:**
- Creating the packages/plugin-scripts infrastructure (handled by foundation story)
- Creating the packages/saga-types package (handled by foundation story)
- Session list/status/logs commands (stay in dashboard - handled by dashboard refactor story)
- Dashboard command migration (handled by dashboard refactor story)
- Init command (converted to plugin skill - handled by dashboard refactor story)
- Updating plugin skills to call new scripts (handled by update-skills story)
- Publishing packages or updating versions (handled by publish story)

## Interface

### Inputs

- `packages/saga-types/` package with Zod schemas for Epic, Story, Session, directory types (from foundation story)
- `packages/plugin-scripts/` with package.json, tsconfig, esbuild config outputting to `plugin/scripts/` (from foundation story)
- Vitest test setup in plugin-scripts (from foundation story)
- Existing command implementations in `packages/cli/src/commands/`
- Existing tests in `packages/cli/src/commands/*.test.ts`

### Outputs

- `packages/plugin-scripts/src/worktree.ts` - git worktree creation script
- `packages/plugin-scripts/src/find/index.ts` - epic/story finder entry point
- `packages/plugin-scripts/src/find/finder.ts` - fuzzy search logic with Fuse.js
- `packages/plugin-scripts/src/scope-validator.ts` - PreToolUse hook validator
- `packages/plugin-scripts/src/sessions-kill.ts` - tmux session termination
- `packages/plugin-scripts/src/implement/index.ts` - entry point with CLI args parsing
- `packages/plugin-scripts/src/implement/orchestrator.ts` - main worker loop (runLoop)
- `packages/plugin-scripts/src/implement/session-manager.ts` - tmux session create/attach/kill
- `packages/plugin-scripts/src/implement/output-parser.ts` - parse and validate worker JSON output
- `packages/plugin-scripts/src/implement/scope-config.ts` - build scope hook configuration
- `packages/plugin-scripts/src/implement/types.ts` - local types (WorkerResult, CycleOutcome, etc.)
- Built scripts in `plugin/scripts/*.js` (via esbuild)
- Comprehensive tests for all migrated and new modules

## Acceptance Criteria

- [ ] All five commands (worktree, find, scope-validator, sessions-kill, implement) exist in `packages/plugin-scripts/src/`
- [ ] `implement.ts` is split into at least 4 modules: orchestrator, session-manager, output-parser, scope-config
- [ ] All source files import types from `@saga-ai/types` (not local definitions)
- [ ] `pnpm build` in plugin-scripts produces working scripts in `plugin/scripts/`
- [ ] All migrated tests pass: `pnpm test` in plugin-scripts shows green
- [ ] Each split implement module has dedicated unit tests
- [ ] Running `node plugin/scripts/worktree.js --help` shows usage information
- [ ] Running `node plugin/scripts/find.js --help` shows usage information
- [ ] Running `node plugin/scripts/implement.js --help` shows usage information
- [ ] Running `node plugin/scripts/scope-validator.js` accepts stdin input and validates
- [ ] Running `node plugin/scripts/sessions-kill.js <name>` terminates tmux sessions
- [ ] No duplicate type definitions between plugin-scripts and saga-types

## Tasks

### t1: Migrate worktree.ts

**Guidance:**
- Copy `packages/cli/src/commands/worktree.ts` to `packages/plugin-scripts/src/worktree.ts`
- Update imports: replace any local type imports with `@saga-ai/types`
- Keep the same CLI interface (arguments, output format)
- The script should be callable as `node scripts/worktree.js <epic-slug> <story-slug> --path <path>`

**References:**
- `packages/cli/src/commands/worktree.ts` - current implementation (187 lines)
- `packages/cli/src/commands/worktree.test.ts` - existing tests
- Epic section "Plugin Script Interface" for expected CLI interface

**Avoid:**
- Changing the JSON output format (other code depends on it)
- Adding new dependencies not already in the CLI package

**Done when:**
- `packages/plugin-scripts/src/worktree.ts` exists and compiles
- `node plugin/scripts/worktree.js --help` works
- Worktree test from CLI passes in plugin-scripts

### t2: Migrate find.ts and finder.ts

**Guidance:**
- Create `packages/plugin-scripts/src/find/` directory
- Move `find.ts` to `packages/plugin-scripts/src/find/index.ts` as entry point
- Move `finder.ts` to `packages/plugin-scripts/src/find/finder.ts` as the search logic
- Update imports to use `@saga-ai/types` for Story, Epic types
- Keep Fuse.js as the fuzzy search library

**References:**
- `packages/cli/src/commands/find.ts` - current CLI entry (60 lines)
- `packages/cli/src/utils/finder.ts` - current search logic (371 lines)
- `packages/cli/src/commands/find.test.ts` - existing tests
- `packages/cli/src/utils/finder.test.ts` - existing finder tests

**Avoid:**
- Changing the `--type` and `--status` filter interfaces
- Breaking the fuzzy search scoring behavior

**Done when:**
- `packages/plugin-scripts/src/find/index.ts` and `finder.ts` exist
- `node plugin/scripts/find.js <query> --type story` works
- All finder tests pass in plugin-scripts

### t3: Migrate scope-validator.ts

**Guidance:**
- Copy to `packages/plugin-scripts/src/scope-validator.ts`
- This is called as a PreToolUse hook, receiving tool call JSON via stdin
- Requires environment variables: `SAGA_PROJECT_DIR`, `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`
- Update any Story/Epic type imports to use `@saga-ai/types`

**References:**
- `packages/cli/src/commands/scope-validator.ts` - current implementation (240 lines)
- `packages/cli/src/commands/scope-validator.test.ts` - existing tests
- Epic section describing scope-validator.js interface

**Avoid:**
- Changing the validation logic (it protects story isolation)
- Modifying the exit code behavior (0 = allow, non-0 = block)

**Done when:**
- `packages/plugin-scripts/src/scope-validator.ts` compiles
- stdin JSON input is properly parsed and validated
- All scope-validator tests pass in plugin-scripts

### t4: Migrate sessions-kill.ts

**Guidance:**
- Create `packages/plugin-scripts/src/sessions-kill.ts`
- Extract only the kill functionality from `packages/cli/src/commands/sessions/index.ts`
- Also need to migrate relevant parts of `packages/cli/src/lib/sessions.ts` (the `killSession` function)
- List/status/logs stay in dashboard (not migrated here)

**References:**
- `packages/cli/src/commands/sessions/index.ts` - current session commands
- `packages/cli/src/lib/sessions.ts` - session utilities including killSession
- `packages/cli/src/commands/sessions/index.test.ts` - existing tests

**Avoid:**
- Including list/status/logs functionality (those stay in dashboard)
- Changing the JSON output format for kill result

**Done when:**
- `packages/plugin-scripts/src/sessions-kill.ts` exists
- `node plugin/scripts/sessions-kill.js <session-name>` terminates sessions
- Kill-related tests pass in plugin-scripts

### t5: Migrate and split implement.ts

**Guidance:**
- Create `packages/plugin-scripts/src/implement/` directory structure:
  - `index.ts` - entry point, CLI args parsing with commander
  - `orchestrator.ts` - main `runLoop()` function and cycle management
  - `session-manager.ts` - `createSession()`, `attachSession()`, `killSession()` for tmux
  - `output-parser.ts` - `parseWorkerOutput()` and JSON validation
  - `scope-config.ts` - `buildScopeSettings()` for hook configuration
  - `types.ts` - local types: `WorkerResult`, `CycleOutcome`, `ImplementOptions`, etc.
- Move shared types (Session, SessionStatus) to imports from `@saga-ai/types`
- Keep implementation logic identical, just reorganize into modules
- Each module should be independently testable

**References:**
- `packages/cli/src/commands/implement.ts` - current monolithic file (1214 lines)
- `packages/cli/src/commands/implement.test.ts` - existing tests
- Epic section "implement.ts Refactoring" showing target structure
- JSDoc at top of implement.ts describing key functions

**Avoid:**
- Changing the worker orchestration logic during migration
- Breaking the tmux session naming convention
- Modifying the JSON output format for results

**Done when:**
- All 6 implement module files exist in `packages/plugin-scripts/src/implement/`
- `node plugin/scripts/implement.js <story-slug> --max-cycles 5` works
- Original implement.test.ts passes against new structure
- Each module can be imported and tested independently

### t6: Update all imports to use saga-types

**Guidance:**
- Search all migrated files for local type definitions
- Replace with imports from `@saga-ai/types`
- Types to replace: `Epic`, `EpicFrontmatter`, `Story`, `StoryFrontmatter`, `StoryStatus`, `Session`, `SessionStatus`
- Add `@saga-ai/types` as a dependency in `packages/plugin-scripts/package.json`

**References:**
- `packages/saga-types/src/index.ts` - available exports
- Current type definitions scattered in CLI files

**Avoid:**
- Creating duplicate type definitions
- Importing types that don't exist in saga-types (create them there first if needed)

**Done when:**
- No local Epic/Story/Session type definitions in plugin-scripts
- All imports resolve correctly
- TypeScript compiles without errors
- `@saga-ai/types` is in plugin-scripts dependencies

### t7: Migrate and extend tests

**Guidance:**
- Copy test files from CLI to plugin-scripts:
  - `worktree.test.ts`
  - `find.test.ts` and `finder.test.ts`
  - `scope-validator.test.ts`
  - `sessions/index.test.ts` (kill-related tests only)
  - `implement.test.ts`
- Update imports in test files to point to new locations
- Add new unit tests for split implement modules:
  - `orchestrator.test.ts` - test runLoop with mocked session-manager
  - `output-parser.test.ts` - test JSON parsing edge cases
  - `session-manager.test.ts` - test tmux command generation
  - `scope-config.test.ts` - test hook configuration building

**References:**
- `packages/cli/src/commands/*.test.ts` - existing test files
- `packages/cli/docs/TESTING.md` - testing guidelines
- Vitest configuration in plugin-scripts (from foundation story)

**Avoid:**
- Deleting tests from CLI before dashboard story removes those commands
- Changing test assertions (only update imports/paths)

**Done when:**
- All migrated tests pass in plugin-scripts
- New unit tests exist for orchestrator, output-parser, session-manager, scope-config
- `pnpm test` in plugin-scripts shows 100% of tests passing
- Test coverage for split modules is meaningful (not just smoke tests)
