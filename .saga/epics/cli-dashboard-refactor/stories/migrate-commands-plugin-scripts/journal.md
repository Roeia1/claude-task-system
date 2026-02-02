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
