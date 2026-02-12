## Session: 2026-02-12T05:10

### Task: t1 - Move storage utilities to saga-types package

**What was done:**
- Copied `packages/plugin-scripts/src/storage.ts` to `packages/saga-types/src/storage.ts`, converting `@saga-ai/types` imports to local relative imports (since the module is now inside the types package)
- Copied both test files (`storage.test.ts` and `storage.integration.test.ts`) to saga-types, updating import paths to use `'./index.ts'` for types and `'./storage.ts'` for storage functions
- Updated `packages/saga-types/src/index.ts` barrel export to re-export all 15 storage functions
- Added `"./storage.ts": "./src/storage.ts"` to saga-types `package.json` exports map
- Updated plugin-scripts test files to import directly from `@saga-ai/types` instead of `'./storage.ts'`
- Removed `packages/plugin-scripts/src/storage.ts` entirely (biome's `noBarrelFile` lint rule prohibits re-export-only files, and no other source files imported from it)
- All plugin-scripts tests (23 files, 451 tests) pass with imports from `@saga-ai/types`
- Saga-types now has 10 test files with 207 tests (90 original + 117 new storage tests)

**Decisions:**
- Removed the plugin-scripts `storage.ts` entirely instead of keeping it as a re-export. The biome `noBarrelFile` lint rule forbids barrel/re-export files for performance reasons. Since no non-test source files in plugin-scripts imported from `./storage.ts`, it was safe to delete.
- Did not modify `hydrate/service.ts` or `find/saga-scanner.ts` -- these files have their own local implementations of similar functions (not imported from `./storage.ts`), so they are unaffected.

**Next steps:**
- t2: Update saga-scanner to use saga-types storage

## Session: 2026-02-12T05:23

### Task: t2 - Update saga-scanner to use saga-types storage

**What was done:**
- Rewrote `packages/dashboard/src/utils/saga-scanner.ts` to use `@saga-ai/types` storage utilities (`listStories`, `listEpics`, `listTasks`, `createStoryPaths`)
- Replaced old `scanAllStories()` (markdown-based, async, multi-source deduplication) with synchronous `scanStories()` that calls `listStories()` and `listTasks()` from `@saga-ai/types`
- Replaced old `scanEpics()` (markdown `epic.md` parsing) with synchronous `scanEpics()` that calls `listEpics()` from `@saga-ai/types`
- Removed old markdown scanning functions: `scanWorktrees`, `scanEpicsStories`, `scanArchive`, `scanAllStories`
- Removed `gray-matter` import (no longer needed for story scanning; still available in package for journal.md in parser.ts)
- Removed old helper functions: `isDirectory`, `fileExists`, `extractEpicTitle`, `parseStoryFile`
- Removed unused exports: `worktreesDirectoryExists`, `epicsDirectoryExists`
- Updated `ScannedStory` interface: replaced `slug/epicSlug/status/storyPath/worktreePath/archived/frontmatter/body` with `id/epicId/description/tasks/guidance/doneWhen/avoid/branch/pr/worktree`
- Updated `ScannedEpic` type to be an alias for `Epic` from `@saga-ai/types` (has `id/title/description/children`)
- Kept `parseFrontmatter` exported for journal.md parsing
- Kept `sagaDirectoryExists` utility
- Worktree information now comes from `story.json`'s `worktree` field instead of scanning `.saga/worktrees/` directory
- Created 18 new tests in `packages/dashboard/src/utils/__tests__/saga-scanner.test.ts` — all pass
- Scanner functions are now synchronous (storage utilities are sync), matching `@saga-ai/types` API

**Decisions:**
- Made `ScannedEpic` a type alias for `Epic` from `@saga-ai/types` rather than a separate interface — the Epic type already has all needed fields (id, title, description, children)
- Functions are now synchronous — `@saga-ai/types` storage uses `readFileSync`/`readdirSync`, so no need for async
- Did not update parser.ts — that is task t3. The parser currently fails to compile because it imports removed exports (`scanAllStories`, old `ScannedStory`). This is expected and will be fixed in t3.

**Next steps:**
- t3: Update server parser for JSON data model
