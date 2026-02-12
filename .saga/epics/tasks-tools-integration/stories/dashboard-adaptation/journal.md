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

## Session: 2026-02-13T01:00

### Task: t3 - Update server parser for JSON data model

**What was done:**
- Verified that parser.ts was already rewritten in a previous session to use JSON-based storage from `@saga-ai/types`
- `scanSagaDirectory()` uses `scanStories()` and `scanEpics()` from the updated scanner (t2), groups stories by epic, and builds `ParsedEpic` objects with derived statuses
- `toStoryDetail()` converts `ScannedStory` to `StoryDetail` with full task objects (subject, description, status, blockedBy, guidance, doneWhen, activeForm)
- `buildEpic()` uses `deriveEpicStatus` from `@saga-ai/types` to derive epic status from story statuses
- `StoryCounts` uses new status shape: pending/inProgress/completed (no ready/blocked)
- `parseStory()` reads directly from JSON storage using `readStory`/`listTasks` from `@saga-ai/types`
- Standalone stories (no epic field) are returned separately in `ScanResult.standaloneStories`
- Journal parsing remains unchanged (markdown with `##` section headers)
- All 24 parser tests pass, covering: story parsing with tasks, status derivation (pending/inProgress/completed), optional fields, journal parsing, standalone stories, epic dependency children, story counts
- 5 other test files fail (cli, dashboard, routes, integration, websocket) — these are expected failures from tasks t4-t11 that reference old APIs

**Decisions:**
- Used `toApiStatus()` helper to convert snake_case `TaskStatus` (from `@saga-ai/types`: `in_progress`) to camelCase API status (`inProgress`) at the parser boundary
- `deriveEpicStatus` receives story statuses converted back to `TaskStatus` format since the function expects snake_case

**Next steps:**
- t4: Update file watcher paths and event parsing

## Session: 2026-02-13T01:08

### Task: t4 - Update file watcher paths and event parsing

**What was done:**
- Rewrote `packages/dashboard/src/server/watcher.ts` to watch new path structure:
  - Changed watched directories from `['.saga/epics/', '.saga/archive/']` to `['.saga/stories/', '.saga/epics/']`
  - `.saga/stories/<story-id>/story.json` → `story:added/changed/removed` events
  - `.saga/stories/<story-id>/<task-id>.json` → `story:changed` events (task changes trigger story refresh)
  - `.saga/stories/<story-id>/journal.md` → `story:changed` events
  - `.saga/epics/<epic-id>.json` → `epic:added/changed/removed` events
- Updated `WatcherEvent` interface: replaced `epicSlug/storySlug/archived` with `epicId?/storyId?`
- Removed archive path handling (`parseArchivePath`, `isStoryMarkdownFile`)
- Removed old path constants (`MIN_PATH_PARTS`, `ARCHIVE_STORY_PARTS`, `EPIC_FILE_PARTS`, `STORY_FILE_PARTS`)
- Updated `parseFilePath()` to handle new flat structure (stories are `.saga/stories/<id>/<file>`, epics are `.saga/epics/<id>.json`)
- Updated `parseEpicsPath()` to detect `<epic-id>.json` files (3-part path) instead of `<epic-slug>/epic.md` (4-part path)
- Added `parseStoriesPath()` for `.saga/stories/<story-id>/<file>` detection (JSON + journal.md)
- Updated debounce keys from `story:${epicSlug}:${storySlug}:${archived}` to `story:${storyId}` and `epic:${epicSlug}` to `epic:${epicId}`
- Wrote 21 new tests covering: story.json changes, task JSON changes, journal.md changes, epic JSON changes, add/remove events, debouncing, file filtering (ignore .txt), field naming assertions (storyId not storySlug), error handling, close behavior
- All 21 watcher tests pass
- Full suite: 5 files still fail (same as before: cli, dashboard, routes, integration, websocket — tasks t5-t11)

**Decisions:**
- Task JSON file changes emit `story:changed` (not separate task events) since status derivation depends on task states — the story must be re-read when any task changes
- `story:added`/`story:removed` only fire for `story.json` add/unlink; task and journal changes always fire `story:changed`
- Ignored files that aren't `.json` or `journal.md` in story directories (e.g., `.txt` files)
- The `websocket.ts` module still references old `epicSlug`/`storySlug`/`archived` fields from `WatcherEvent` — this will be fixed in subsequent tasks (t5/t10)

**Next steps:**
- t5: Update REST API routes for new data model
