# Story Journal: migrate-commands-plugin-scripts

## Session: 2026-02-02T23:55:00Z

### Task: t1 - Migrate worktree.ts

**What was done:**
- Created `packages/plugin-scripts/src/worktree.ts` - migrated from `packages/cli/src/commands/worktree.ts`
- Created `packages/plugin-scripts/src/worktree.test.ts` - adapted tests from CLI to work with plugin-scripts
- The `resolveProjectPath` utility was inlined into the worktree script (simpler than creating a shared utility)
- Added CLI argument parsing directly in the script (no commander dependency needed for this simple interface)
- Added `--help` support with proper usage output
- Verified build produces `plugin/scripts/worktree.js` that works correctly

**Decisions:**
- Inlined `resolveProjectPath` instead of creating a shared utility - the function is small and worktree is the primary consumer. Can refactor to shared utility later if multiple scripts need it.
- Used simple argument parsing instead of commander - the worktree interface is simple enough that a small custom parser suffices. This keeps dependencies minimal.
- Kept the JSON output format identical to the CLI version for compatibility.

**Test results:**
- 15 worktree tests passing
- All 19 plugin-scripts tests passing (including hello placeholder tests)
- Build successfully produces `plugin/scripts/worktree.js`
- `node plugin/scripts/worktree.js --help` shows correct usage

**Next steps:**
- Task t2: Migrate find.ts and finder.ts
- Task t3: Migrate scope-validator.ts
- Task t4: Migrate sessions-kill.ts
- Task t5: Migrate and split implement.ts
- Task t6: Update all imports to use saga-types
- Task t7: Migrate and extend tests

## Session: 2026-02-03T00:06:00Z

### Task: t2 - Migrate find.ts and finder.ts

**What was done:**
- Created `packages/plugin-scripts/src/find/` directory structure:
  - `find/index.ts` - CLI entry point with argument parsing and main logic
  - `find/finder.ts` - fuzzy search logic using Fuse.js
  - `find/saga-scanner.ts` - directory scanning utilities for finding stories/epics
- Created `packages/plugin-scripts/src/find.ts` - esbuild entry point that imports the find module
- Created `packages/plugin-scripts/src/find.test.ts` - CLI integration tests
- Created `packages/plugin-scripts/src/find/finder.test.ts` - unit tests for finder logic
- Added `fuse.js` as a dependency for fuzzy matching
- Removed `gray-matter` dependency - used simple frontmatter parser instead (sufficient for finder's needs)

**Decisions:**
- Used simple `parseFrontmatter()` function instead of `gray-matter` library. The original code used gray-matter for complex YAML parsing (tasks arrays), but the finder only needs simple fields (id, slug, title, status). This avoids ESM/CJS bundling issues with gray-matter.
- Created a directory structure (`find/`) with the entry point importing from subdirectory. This allows modular organization while maintaining the esbuild entry point pattern (top-level `.ts` files).
- Inlined `resolveProjectPath` (same pattern as worktree.ts) - keeps scripts self-contained.
- Added `--status` filter option to allow filtering stories by status.

**Test results:**
- 31 finder unit tests passing (parseFrontmatter, extractContext, findEpic, findStory)
- 11 command integration tests passing
- All 61 plugin-scripts tests passing
- Build successfully produces `plugin/scripts/find.js`
- `node plugin/scripts/find.js --help` shows correct usage
- Verified real queries work against this project

**Next steps:**
- Task t3: Migrate scope-validator.ts
- Task t4: Migrate sessions-kill.ts
- Task t5: Migrate and split implement.ts
- Task t6: Update all imports to use saga-types
- Task t7: Migrate and extend tests

## Session: 2026-02-03T00:10:00Z

### Task: t3 - Migrate scope-validator.ts

**What was done:**
- Created `packages/plugin-scripts/src/scope-validator.ts` - migrated from `packages/cli/src/commands/scope-validator.ts`
- Created `packages/plugin-scripts/src/scope-validator.test.ts` - adapted tests from CLI to work with plugin-scripts
- The script reads tool input JSON from stdin and validates file paths against story scope
- Validates three rules: within worktree, not in archive, and within assigned story scope
- Exit codes: 0 = allowed, 2 = blocked (with formatted error message to stderr)
- Build produces `plugin/scripts/scope-validator.js`

**Decisions:**
- Kept the implementation identical to CLI version - the scope validation logic is critical and shouldn't change during migration
- Maintained the same box-formatted error output to stderr for consistency with existing hook integration
- No dependencies needed beyond Node built-ins (path, process)
- Tests mirror the internal validation logic directly since the command reads from stdin

**Test results:**
- 27 scope-validator tests passing (isWithinWorktree, file path extraction, normalizePath, isArchiveAccess, checkStoryAccess, validatePath)
- All 88 plugin-scripts tests passing
- Build successfully produces `plugin/scripts/scope-validator.js`
- Verified with manual testing:
  - Valid worktree paths → exit code 0
  - Paths outside worktree → exit code 2 with violation message
  - Archive paths → exit code 2 with violation message
  - Other story paths → exit code 2 with violation message

**Next steps:**
- Task t4: Migrate sessions-kill.ts
- Task t5: Migrate and split implement.ts
- Task t6: Update all imports to use saga-types
- Task t7: Migrate and extend tests

## Session: 2026-02-03T00:13:00Z

### Task: t4 - Migrate sessions-kill.ts

**What was done:**
- Created `packages/plugin-scripts/src/sessions-kill.ts` - extracted kill functionality from `packages/cli/src/lib/sessions.ts`
- Created `packages/plugin-scripts/src/sessions-kill.test.ts` - CLI integration tests
- The script is a focused, single-purpose tool that terminates tmux sessions
- Uses `tmux kill-session -t <name>` to terminate sessions
- JSON output format: `{ "killed": boolean }`
- Exit code 0 for success (killed or not found), exit code 1 for argument errors

**Decisions:**
- Extracted only the `killSession` function from the sessions library - list/status/logs stay in the dashboard CLI
- Kept the JSON output format identical to the CLI version: `{ killed: boolean }`
- Used simple argument parsing (same pattern as other scripts) rather than commander
- CLI integration tests only - no mocking needed since the function is simple (just wraps `spawnSync`)
- The function returns `killed: false` for non-existent sessions (not an error) - matches original behavior

**Test results:**
- 8 sessions-kill tests passing (--help, -h, argument validation, kill functionality, JSON output format)
- All 96 plugin-scripts tests passing
- Build successfully produces `plugin/scripts/sessions-kill.js`
- `node plugin/scripts/sessions-kill.js --help` shows correct usage
- `node plugin/scripts/sessions-kill.js saga__fake__fake__1234` returns `{ "killed": false }`

**Next steps:**
- Task t5: Migrate and split implement.ts
- Task t6: Update all imports to use saga-types
- Task t7: Migrate and extend tests

## Session: 2026-02-03T00:20:00Z

### Task: t5 - Migrate and split implement.ts

**What was done:**
- Created `packages/plugin-scripts/src/implement/` directory structure with 6 modules:
  - `types.ts` - local types (ImplementOptions, StoryInfo, LoopResult, WorkerOutput, etc.) and constants
  - `scope-config.ts` - buildScopeSettings() for PreToolUse hook configuration
  - `output-parser.ts` - formatToolUsage(), formatStreamLine(), parseStreamingResult() and JSON validation
  - `session-manager.ts` - createSession(), spawnWorkerAsync(), buildDetachedCommand(), shellEscape utilities
  - `orchestrator.ts` - runLoop() main orchestration, validateStoryFiles(), loadWorkerPrompt()
  - `index.ts` - CLI entry point with argument parsing, dry-run, mode handlers
- Created `packages/plugin-scripts/src/implement.ts` - esbuild entry point
- All modules are independently importable and testable
- Build produces `plugin/scripts/implement.js` that works correctly

**Decisions:**
- Split the monolithic implement.ts (1214 lines) into 6 focused modules as specified in the story
- Kept implementation logic identical, just reorganized into modules
- Used the same pattern as other scripts: top-level entry point imports from subdirectory module
- Inlined resolveProjectPath again (same pattern as other scripts)
- Session-manager contains both tmux session creation (createSession) and worker spawning (spawnWorkerAsync)
- Output-parser contains all streaming JSON parsing and tool usage formatting

**Test results:**
- All 96 existing plugin-scripts tests still pass
- Build successfully produces `plugin/scripts/implement.js`
- `node plugin/scripts/implement.js --help` shows correct usage with all options
- Note: Unit tests for the split modules will be added in task t7

**Next steps:**
- Task t6: Update all imports to use saga-types
- Task t7: Migrate and extend tests (including new unit tests for implement modules)

## Session: 2026-02-03T00:25:00Z

### Task: t6 - Update all imports to use saga-types

**What was done:**
- Created `packages/saga-types/src/index.ts` - barrel export for all types (Story, Epic, Session, StoryStatus, etc.)
- Added barrel export `"."` to `packages/saga-types/package.json` exports
- Updated `packages/plugin-scripts/src/find/saga-scanner.ts`:
  - Import `StoryStatus` from `@saga-ai/types`
  - Changed `status: string` to `status: StoryStatus` in `ScannedStory` interface
- Updated `packages/plugin-scripts/src/find/finder.ts`:
  - Import `StoryStatus` from `@saga-ai/types`
  - Import `FuseResult` type from `fuse.js` (fixed existing type reference issue)
  - Changed `status: string` to `status: StoryStatus` in `StoryInfo` interface
  - Changed `status?: string` to `status?: StoryStatus` in `FindStoryOptions` interface
- Updated `packages/plugin-scripts/src/find/index.ts`:
  - Import `StoryStatus` from `@saga-ai/types`
  - Cast CLI status argument appropriately when calling `findStory()`

**Decisions:**
- The local types (`EpicInfo`, `StoryInfo`, `ScannedStory`, `ScannedEpic`) are intentionally different from saga-types full types. They are internal simplified types for search results, not duplicates.
- Only `StoryStatus` was shared since `status` fields benefit from the enum type safety
- The full `Story`, `Epic`, `Session` types from saga-types have different shapes than the internal types (e.g., `Story` has `frontmatter.status` not just `status`)
- Fixed a pre-existing Fuse.js type import issue (`Fuse.FuseResult` → `FuseResult`)

**Verification:**
- TypeScript compiles without errors (`pnpm typecheck`)
- All 96 tests pass (`pnpm test`)
- Build produces working scripts (`pnpm build`)
- `@saga-ai/types` is already in plugin-scripts dependencies
- No duplicate Epic/Story/Session/StoryStatus type definitions in plugin-scripts

**Next steps:**
- Task t7: Migrate and extend tests (including new unit tests for implement modules)
