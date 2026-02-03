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

## Session: 2026-02-03T00:30:00Z

### Task: t7 - Migrate and extend tests

**What was done:**
- Created `packages/plugin-scripts/src/implement/scope-config.test.ts` (7 tests)
  - Tests for `buildScopeSettings()` function
  - Verifies hook configuration structure, matcher format, and command string
- Created `packages/plugin-scripts/src/implement/output-parser.test.ts` (66 tests)
  - Tests for `WORKER_OUTPUT_SCHEMA` structure
  - Tests for `formatToolUsage()` - all tool types (Read, Write, Edit, Bash, Glob, Grep, Task, TodoWrite, StructuredOutput, unknown)
  - Tests for `formatAssistantContent()` - text blocks, tool_use blocks, edge cases
  - Tests for `formatStreamLine()` - assistant messages, system init, result messages
  - Tests for `extractStructuredOutputFromToolCall()` - finding StructuredOutput in tool calls
  - Tests for `validateAndExtractOutput()` - status validation, output extraction
  - Tests for `processResultLine()` - structured_output extraction, error handling
  - Tests for `parseStreamingResult()` - complete streaming output parsing
- Created `packages/plugin-scripts/src/implement/session-manager.test.ts` (42 tests)
  - Tests for `shellEscape()` - quoting, special characters, embedded quotes
  - Tests for `shellEscapeArgs()` - array escaping and joining
  - Tests for `validateSlug()` - valid/invalid slug patterns
  - Tests for `buildDetachedCommand()` - command building with various options
- Created `packages/plugin-scripts/src/implement/orchestrator.test.ts` (24 tests)
  - Tests for `getSkillRoot()` - path computation
  - Tests for `computeStoryPath()` - story.md path computation
  - Tests for `getWorktreePath()` - worktree path computation
  - Tests for `validateStoryFiles()` - worktree and story.md validation
  - Tests for `loadWorkerPrompt()` - prompt file loading
  - Tests for `createErrorResult()` - error result construction
  - Tests for `validateLoopResources()` - combined resource validation
  - Tests for `buildLoopResult()` - final loop result construction

**Decisions:**
- Created comprehensive unit tests for all exported functions in the implement modules
- Tests cover happy paths, edge cases, and error conditions
- Used temporary directories for file system tests (cleaned up in afterEach hooks)
- Tests verify behavior of the actual implementation, not just coverage

**Test results:**
- 139 new tests added (7 + 66 + 42 + 24)
- All 235 plugin-scripts tests passing (96 existing + 139 new)
- Build continues to work correctly

**Story completion:**
All 7 tasks in story t1-t7 are now complete:
- t1: worktree.ts migrated with tests ✓
- t2: find.ts and finder.ts migrated with tests ✓
- t3: scope-validator.ts migrated with tests ✓
- t4: sessions-kill.ts migrated with tests ✓
- t5: implement.ts split into modules ✓
- t6: imports updated to use saga-types ✓
- t7: unit tests added for implement modules ✓

## Session: 2026-02-03T02:09:00Z

### Post-completion: Address PR review feedback

**What was done:**
- Updated `scope-config.ts` to reference the plugin-scripts path instead of the CLI path for the scope-validator script
- Differentiated scope-validator exit codes: exit code 1 for config errors, exit code 2 for blocked (scope violation)
- Re-exported `ScannedStory` and `ScannedEpic` types from the finder module for external consumers
- Updated scope-config test to match the new path

**Files changed:**
- `packages/plugin-scripts/src/find/finder.ts` - re-export types
- `packages/plugin-scripts/src/implement/scope-config.ts` - fix script path
- `packages/plugin-scripts/src/implement/scope-config.test.ts` - update test
- `packages/plugin-scripts/src/scope-validator.ts` - differentiate exit codes

## Session: 2026-02-03T02:55:00Z

### Post-completion: Use env vars and saga-types paths, simplify worktree detection

**What was done:**
- Replaced `--path` CLI options with `SAGA_PROJECT_DIR` and `SAGA_PLUGIN_ROOT` environment variables across find, worktree, and implement scripts
- Scripts now fail with informative errors when required env vars are missing (no silent fallbacks)
- Adopted saga-types path utilities (`createSagaPaths`, `createWorktreePaths`, etc.) for all path construction
- Updated `ENVIRONMENT.md` with new worktree detection logic (`.git` file vs directory check)
- Simplified `session-init.sh` worktree detection to use `.git` file/directory check instead of checking for `.saga/epics` directory
- Removed duplicated code block from ENVIRONMENT.md

**Decisions:**
- Environment variables are the correct mechanism for scripts invoked by hooks - they run in the shell context where SAGA env vars are already set by `session-init.sh`. The `--path` flags were a CLI artifact that doesn't apply in the plugin context.
- Using saga-types path utilities ensures consistency across all scripts and avoids hardcoded `.saga/` path patterns.
- The `.git` file vs directory check is more reliable for worktree detection than checking for `.saga/epics` (which may not exist yet in a fresh worktree).

**Files changed:**
- `packages/plugin-scripts/src/find/index.ts`, `finder.ts`, `saga-scanner.ts` - env var usage
- `packages/plugin-scripts/src/implement/index.ts`, `orchestrator.ts` - env var usage
- `packages/plugin-scripts/src/worktree.ts` - env var usage
- `packages/plugin-scripts/src/worktree.test.ts`, `implement/orchestrator.test.ts` - test updates
- `plugin/docs/ENVIRONMENT.md` - documentation updates
- `plugin/hooks/session-init.sh` - simplified worktree detection

## Session: 2026-02-03T03:55:00Z

### Post-completion: Move story env vars to worker context, fix hook format, harden scope-validator

**What was done:**
- Removed `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`, `SAGA_STORY_DIR` from `session-init.sh` - these are worker-specific and should not be set in interactive sessions
- Set worker env vars in orchestrator when spawning headless workers instead
- Used saga-types for all path construction in session-manager (no hardcoded `.saga` paths)
- Fixed `find.test.ts` to use `SAGA_PROJECT_DIR` env var instead of `--path` flag
- Removed the `hello` placeholder script and its tests
- Updated `ENVIRONMENT.md` to document the distinction between interactive session vars and worker-only vars
- Fixed Claude Code hook format in `scope-config.ts` - was using a plain string but the correct format requires an object with `type` and `command` fields
- Updated scope-config tests to verify the object format
- Changed scope-validator to exit with code 2 (blocked) instead of code 1 when required environment variables are missing, ensuring operations fail safely rather than proceeding without scope validation
- Error message now instructs the worker to exit with BLOCKED status and report the configuration error as a blocker

**Decisions:**
- Story-specific env vars (`SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`, `SAGA_STORY_DIR`) belong in the worker context, not the interactive session. The orchestrator knows which story is being executed and passes these to the worker process.
- The `hello` placeholder script served its purpose during initial package setup and is no longer needed now that real scripts are in place.
- Hook configuration must use `{ type: "command", command: "..." }` format per Claude Code docs, not a bare string.
- Scope-validator should block (exit 2) on missing env vars rather than reporting a generic error (exit 1). This ensures the hook system treats it as a scope violation, preventing any file operations from proceeding without proper scope validation.
