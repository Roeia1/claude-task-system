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

## Session: 2026-02-13T01:17

### Task: t5 - Update REST API routes for new data model

**What was done:**
- Rewrote `packages/dashboard/src/server/routes.ts` for the new JSON data model:
  - Changed `scanSagaDirectory()` return type from `Epic[]` to `ScanResult` (with `epics` and `standaloneStories`)
  - Changed `GET /api/epics/:slug` to `GET /api/epics/:epicId` — finds epic by `id` instead of `slug`
  - Changed `GET /api/stories/:epicSlug/:storySlug` to `GET /api/stories/:storyId` — looks up story directly via `parseStory()` instead of searching through parent epic
  - Added `GET /api/stories` endpoint returning standalone stories (those without an `epic` field)
  - Updated `toEpicSummary()` to use new fields: `id` (not `slug`), `description`, `status`, `storyCounts` (no `path`)
  - Routes are now synchronous except the story detail endpoint (which awaits `parseJournal`)
- Rewrote `packages/dashboard/src/server/__tests__/routes.test.ts` with 22 new tests:
  - Test fixtures use JSON format (`.saga/epics/<id>.json`, `.saga/stories/<id>/story.json` + `<task-id>.json`)
  - Tests cover: epic summaries with derived status, new `StoryCounts` shape (pending/inProgress/completed, no ready/blocked), epic detail with children dependency array, story detail by ID with full task objects (subject, description, blockedBy, guidance, doneWhen, activeForm), journal parsing, standalone stories, 404 handling
  - All 22 tests pass

**Decisions:**
- Story lookup uses `parseStory(sagaRoot, storyId)` directly instead of scanning all epics — stories are now top-level entities identified by ID
- Standalone stories are returned as a separate list at `GET /api/stories` to avoid polluting the epic-based navigation
- `EpicSummary` no longer includes `children` or `stories` — those are only in the detail endpoint

**Next steps:**
- t6: Update session module for new naming and JSONL output

## Session: 2026-02-13T01:30

### Task: t6 - Update session module for new naming and JSONL output

**What was done:**
- Rewrote `packages/dashboard/src/lib/sessions.ts` for new session naming and JSONL output:
  - Changed session naming from `saga__<epicSlug>__<storySlug>__<timestamp>` to `saga-story-<storyId>-<timestamp>`
  - Changed `createSession(epicSlug, storySlug, command)` to `createSession(storyId, command)` (2 args)
  - Changed `parseSessionName()` to return `{storyId}` instead of `{epicSlug, storySlug}`
  - Changed `DetailedSessionInfo` to expose `storyId` instead of `epicSlug`/`storySlug`
  - Changed all output file references from `.out` to `.jsonl` extension
  - Changed `SESSION_NAME_PATTERN` regex from `/^(saga__[a-z0-9_-]+):/` to `/^(saga-story-[a-z0-9-]+-\d+):/`
  - Updated `listSessions()` to match `saga-story-` prefix instead of `saga__`
  - Updated `streamLogs()` to look for `.jsonl` files
  - Updated `generateOutputPreview()` to parse JSONL lines, filtering invalid JSON and showing only valid JSON lines
  - Replaced `validateSessionSlugs(epicSlug, storySlug)` with `validateStoryId(storyId)`
- Updated `packages/dashboard/src/server/session-routes.ts`:
  - Changed filter from `epicSlug`/`storySlug` query params to `storyId` query param
  - Removed the nested epicSlug→storySlug filter chain
- Updated test files:
  - `sessions.test.ts`: 62 tests — all use new `saga-story-` format, test `storyId` field, `.jsonl` paths, JSONL preview generation
  - `sessions.integration.test.ts`: 34 tests — all use new 2-arg `createSession(storyId, command)` API, new name pattern, new prefix filtering
  - `session-routes.test.ts`: 14 tests — all use `storyId` filter, verify no `epicSlug`/`storySlug` in responses
  - `commands/sessions/index.test.ts`: 5 tests — updated session names and mock return types

**Decisions:**
- The `parseSessionName()` function identifies the timestamp as the last hyphen-separated segment that is all digits, allowing story IDs with hyphens (e.g., `dashboard-adaptation`) to be parsed correctly
- JSONL preview generation skips non-JSON lines gracefully (falls back to raw lines if no valid JSON found)
- Session routes now only support `storyId` filter (not `epicSlug`/`storySlug`), matching the flat story model
- Integration tests now call `createSession(storyId, command)` directly (synchronous) — no more `await` needed since these functions were always synchronous

**Next steps:**
- t7: Update log streaming for JSONL messages

## Session: 2026-02-13T01:33

### Task: t7 - Update log streaming for JSONL messages

**What was done:**
- Rewrote `packages/dashboard/src/lib/log-stream-manager.ts` for JSONL-based message delivery:
  - Changed file extension from `.out` to `.jsonl` in all file path references
  - Changed `LogsDataMessage` interface: replaced `data: string` with `messages: WorkerMessage[]` (array of parsed JSON objects)
  - Changed tracking from byte-offset (`filePositions`) to line-count (`lineCounts`) for incremental reads
  - Added `parseJsonlLines()` helper to parse JSONL content into typed message arrays, skipping empty and invalid lines
  - Added `countLines()` helper for tracking non-empty line positions
  - Changed `getFilePosition()` method to `getLineCount()` method
  - `subscribe()` now reads the JSONL file, parses all lines, and sends `messages: WorkerMessage[]` instead of `data: string`
  - `sendIncrementalContent()` now reads the full file, extracts lines beyond the last known count, parses them, and sends new messages only
  - `notifySessionCompleted()` sends any remaining unparsed lines with `isComplete: true`
  - Exported `WorkerMessage` type (alias for `Record<string, unknown>`)
- Updated `packages/dashboard/src/client/src/machines/dashboardMachine.ts`:
  - Changed `LogDataCallback` from `(data: string, isInitial, isComplete)` to `(messages: WorkerMessage[], isInitial, isComplete)`
  - Changed `handleLogMessage()` to read `data.messages` instead of `data.data`
  - Added `WorkerMessage` type and exported it
- Rewrote `packages/dashboard/src/client/src/components/LogViewer.tsx`:
  - `useLogSubscription` now accumulates `WorkerMessage[]` instead of concatenating strings
  - Added `formatMessage()` function to render different message types: `saga_worker` subtypes (pipeline_start/step/end, cycle_start/end), `assistant` SDK messages, `result` messages, and raw `text` messages
  - Added `getMessageClass()` for color-coding: `text-primary` for worker events, `text-success`/`text-danger` for pipeline completion
  - `VirtualizedLogContent` renders structured messages instead of raw text lines
  - `parseInitialContent()` handles both JSONL and plain text `initialContent` prop for backward compatibility with existing tests/storybook
- Rewrote `packages/dashboard/src/lib/log-stream-manager.test.ts` with 56 tests:
  - All test fixtures use `.jsonl` files with sample JSONL messages (pipeline_start, pipeline_step, pipeline_end, cycle_start, sdk assistant)
  - Tests verify parsed `messages` array instead of raw `data` string
  - Tests verify `getLineCount()` tracking instead of `getFilePosition()` byte tracking
  - Added JSONL parsing tests: SagaWorkerMessage types, SDK messages, mixed types, empty files, invalid JSON lines, empty lines
  - All 56 tests pass
- Updated storybook snapshot for LogViewer (class ordering change)

**Decisions:**
- Used `Record<string, unknown>` as the `WorkerMessage` type rather than a union of `SagaWorkerMessage | SDKMessage`. This keeps the dashboard loosely coupled to the exact message schema — it parses whatever JSON it receives and renders based on the `type` field.
- `parseInitialContent()` in LogViewer handles both JSONL and plain text to maintain backward compatibility with existing tests and storybook stories. Lines that aren't valid JSON are wrapped as `{type: 'text', content: line}`.
- The incremental read strategy re-reads the full file and slices by line count (instead of byte offset). This is simpler and avoids partial-line issues with JSONL, at the cost of slightly more I/O. Acceptable since log files are typically small and writes are infrequent.
- 6 new test failures in `websocket.test.ts` (log streaming tests) are expected — those tests still create `.out` files instead of `.jsonl`. They will be fixed in t11 (update tests and fixtures).

**Next steps:**
- t8: Update client-side TypeScript types

## Session: 2026-02-13T01:48

### Task: t8 - Update client-side TypeScript types

**What was done:**
- Rewrote `packages/dashboard/src/client/src/types/dashboard.ts` to match the new API response shapes:
  - Changed `StoryStatus` from `'ready' | 'inProgress' | 'blocked' | 'completed'` to `'pending' | 'inProgress' | 'completed'`
  - Updated `Task` interface: replaced `title: string` with `subject: string`, added `description`, `blockedBy[]`, `guidance?`, `doneWhen?`, `activeForm?`
  - Updated `StoryCounts`: removed `ready`/`blocked`, added `pending` (now: pending/inProgress/completed/total)
  - Updated `EpicSummary`: replaced `slug` with `id`, added `description` and `status`, removed `isArchived`
  - Updated `StoryDetail`: replaced `slug`/`epicSlug` with `id`/`epic?`, added `description`, `guidance?`, `doneWhen?`, `avoid?`, `branch?`, `pr?`, `worktree?`, removed `content`
  - Updated `Epic`: now extends `EpicSummary`, added `children: EpicChild[]`, `stories: StoryDetail[]`, removed `slug`/`content`/`isArchived`
  - Added `EpicChild` interface: `{id: string, blockedBy: string[]}`
  - Added `WorkerMessage` type (`Record<string, unknown>`) for JSONL log message rendering
  - Replaced `Session` re-export from `@saga-ai/types` with local `SessionInfo` interface using `storyId` instead of `epicSlug`/`storySlug`
  - Defined `SessionStatus` locally as `'running' | 'completed'`
- No test regressions — same 19 pre-existing failures in websocket.test.ts and integration.test.ts (to be fixed in t11)

**Decisions:**
- Defined `SessionInfo` locally instead of re-exporting from `@saga-ai/types`, because the `Session` type in `@saga-ai/types` still uses the old `epicSlug`/`storySlug` format. The dashboard's server-side `DetailedSessionInfo` already uses `storyId`, so the client type matches the actual API response.
- Made `Epic` extend `EpicSummary` to match the server-side pattern where `ParsedEpic extends EpicSummary`
- `WorkerMessage` is `Record<string, unknown>` to stay loosely coupled, matching the same decision in `log-stream-manager.ts` and `dashboardMachine.ts`

**Next steps:**
- t9: Update React components for new data model
