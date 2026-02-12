---
id: dashboard-adaptation
title: Dashboard Adaptation
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Move storage utilities to saga-types package
    status: pending
  - id: t2
    title: Update saga-scanner to use saga-types storage
    status: pending
  - id: t3
    title: Update server parser for JSON data model
    status: pending
  - id: t4
    title: Update file watcher paths and event parsing
    status: pending
  - id: t5
    title: Update REST API routes for new data model
    status: pending
  - id: t6
    title: Update session module for new naming and JSONL output
    status: pending
  - id: t7
    title: Update log streaming for JSONL messages
    status: pending
  - id: t8
    title: Update client-side TypeScript types
    status: pending
  - id: t9
    title: Update React components for new data model
    status: pending
  - id: t10
    title: Update XState machine and context
    status: pending
  - id: t11
    title: Update tests and fixtures
    status: pending
---

## Context

SAGA has migrated from a markdown-based storage format (YAML frontmatter in `.md` files, nested `epics/<slug>/stories/<slug>/story.md`) to a JSON-based storage format with flat story folders (`.saga/stories/<id>/story.json` + task files) and single-file epics (`.saga/epics/<id>.json`). The `@saga-ai/dashboard` package provides a web-based monitoring interface that reads this data, serves it through a REST/WebSocket API, and renders it in a React frontend.

Additionally, the worker pipeline now uses the Agent SDK and outputs structured JSONL messages (both `SagaWorkerMessage` events and Agent SDK `SDKMessage` types) to `$SAGA_SESSION_DIR/<sessionName>.jsonl`. The session naming convention has changed from `saga__<epic>__<story>__<timestamp>` to `saga-story-<storyId>-<timestamp>`. The dashboard's log streaming infrastructure must be updated from raw text `.out` file consumption to typed JSONL message parsing.

This story updates the entire dashboard pipeline -- from file scanning through API serving to React rendering -- to consume the new JSON format and JSONL worker output. After this story is complete, the dashboard will:
- Read `.saga/stories/` and `.saga/epics/` in JSON format using shared storage utilities from `@saga-ai/types`
- Derive story/epic status from task statuses
- Display epic-to-story trees with dependency information
- Show task-level detail including `guidance`, `doneWhen`, and `activeForm` fields
- Stream typed JSONL worker messages instead of raw terminal output

The dashboard currently uses `gray-matter` to parse YAML frontmatter from `story.md` and `epic.md` files organized in a nested `epics/<slug>/stories/<slug>/` hierarchy. The new format uses `JSON.parse` on flat `story.json`, `<epic-id>.json`, and `<task-id>.json` files. Story and epic statuses are no longer stored -- they are derived at read time from child statuses.

## Scope Boundaries

**In scope:**
- Moving storage utilities (`readStory`, `readEpic`, `readTask`, `listStories`, `listEpics`, `listTasks`, `deriveStoryStatus`, `deriveEpicStatus`) from `plugin-scripts` to `@saga-ai/types`
- Updating `saga-scanner.ts` to use storage utilities from `@saga-ai/types` for scanning `.saga/stories/` and `.saga/epics/`
- Updating `parser.ts` to use `deriveStoryStatus`/`deriveEpicStatus` from `@saga-ai/types`
- Updating `watcher.ts` to watch `.saga/stories/` and `.saga/epics/` for JSON file changes
- Updating `routes.ts` REST API endpoints for the new data model (story routes change from `/api/stories/:epicSlug/:storySlug` to `/api/stories/:storyId`)
- Updating `sessions.ts` for the new session naming convention (`saga-story-<storyId>-<timestamp>`) and `.jsonl` output files
- Updating `LogStreamManager` to parse JSONL line-by-line and send typed messages via WebSocket
- Updating `LogViewer` to render structured JSONL messages instead of raw terminal text
- Updating client-side TypeScript types in `dashboard.ts` to match new API shapes
- Updating React components (`EpicDetail`, `EpicList`, `StoryDetail`, `StoryCard`, status badges) for derived status, task-level fields, and epic dependency display
- Updating the XState dashboard machine context to reflect new data shapes
- Updating test fixtures from markdown to JSON format

**Out of scope:**
- Implementing the actual JSON storage layer or Zod schemas (already done in "Story and Epic JSON Storage" and "SAGA Types Migration to JSON Format" stories)
- Worker execution, hydration, or sync logic (already done in "Worker Script and Execution Pipeline" and "Hydration and Sync Layer" stories)
- Updating plugin skills or the generate-story agent (already done in "Skills Migration" story)
- Backward compatibility with the old markdown format
- Adding new dashboard features beyond what the new data model requires (e.g., epic orchestration controls, worker launch UI)

## Interface

### Inputs

- **Storage utilities** (moved from `plugin-scripts` to `@saga-ai/types`):
  - `readStory`, `readEpic`, `readTask`, `listStories`, `listEpics`, `listTasks`
  - `deriveStoryStatus`, `deriveEpicStatus`
  - Path utilities: `createSagaPaths`, `createStoryPaths`, `createEpicPaths`
- **New JSON file formats** (produced by "Story and Epic JSON Storage" story):
  - `.saga/stories/<story-id>/story.json` -- Story metadata (id, title, description, epic?, guidance?, doneWhen?, avoid?, branch?, pr?, worktree?)
  - `.saga/stories/<story-id>/<task-id>.json` -- Task files (id, subject, description, activeForm?, status, blockedBy[], guidance?, doneWhen?)
  - `.saga/epics/<epic-id>.json` -- Epic files (id, title, description, children[{id, blockedBy[]}])
  - `.saga/stories/<story-id>/journal.md` -- Journal files (unchanged markdown format)
- **TypeScript types** from `@saga-ai/types`:
  - `Story`, `Epic`, `Task`, `EpicChild`, `TaskStatus` interfaces and Zod schemas
  - `SagaWorkerMessage` type (worker JSONL message types)
- **JSONL worker output** (produced by the worker pipeline):
  - `$SAGA_SESSION_DIR/<sessionName>.jsonl` -- One JSON object per line, typed as `SagaWorkerMessage | SDKMessage`
  - `SagaWorkerMessage` subtypes: `pipeline_start`, `pipeline_step`, `pipeline_end`, `cycle_start`, `cycle_end`
  - `SDKMessage` types from `@anthropic-ai/claude-agent-sdk`: `assistant`, `result`, `system`, etc.

### Outputs

- **Updated REST API** consumed by the React frontend:
  - `GET /api/epics` -- Returns epic summaries with derived status and story counts
  - `GET /api/epics/:epicId` -- Returns epic detail with child stories, dependencies, and derived status
  - `GET /api/stories/:storyId` -- Returns story detail with tasks, derived status, journal
- **Updated WebSocket events** pushed to the frontend on file changes:
  - `story:changed`, `story:added`, `story:removed` events keyed by story ID
  - `epic:changed`, `epic:added`, `epic:removed` events keyed by epic ID
- **Updated log streaming** via WebSocket:
  - `logs:data` messages now carry typed JSONL messages instead of raw text
- **Updated React UI** rendering epic/story trees with the new data model and structured log output

## Acceptance Criteria

- [ ] Storage utilities (`readStory`, `readEpic`, `readTask`, `listStories`, `listEpics`, `listTasks`, `deriveStoryStatus`, `deriveEpicStatus`) are in `@saga-ai/types` and `plugin-scripts` imports from there
- [ ] Dashboard scans `.saga/stories/` and `.saga/epics/` using storage utilities from `@saga-ai/types`
- [ ] Story status is derived at read time using `deriveStoryStatus` from `@saga-ai/types`
- [ ] Epic status is derived at read time using `deriveEpicStatus` from `@saga-ai/types`
- [ ] REST API endpoint `GET /api/stories/:storyId` returns story detail with full task list (including `guidance`, `doneWhen`, `activeForm` fields)
- [ ] REST API endpoint `GET /api/epics/:epicId` returns epic detail with child stories and dependency graph
- [ ] File watcher detects changes in `.saga/stories/` and `.saga/epics/` and triggers WebSocket updates
- [ ] Session module parses `saga-story-<storyId>-<timestamp>` naming convention and reads `.jsonl` output files
- [ ] `LogStreamManager` reads JSONL files line-by-line and sends typed messages to clients
- [ ] `LogViewer` renders structured JSONL messages (worker events and agent SDK messages) instead of raw text
- [ ] React components display derived status badges (pending/in_progress/completed instead of ready/in_progress/blocked/completed)
- [ ] React epic detail page shows story dependency graph (which stories block which)
- [ ] React story detail page shows task-level information including `guidance`, `doneWhen`, and `activeForm`
- [ ] All existing dashboard tests pass after updating fixtures to JSON format
- [ ] Standalone stories (no epic) are accessible via the API and visible in the dashboard

## Tasks

### t1: Move storage utilities to saga-types package

**Guidance:**
- Move `packages/plugin-scripts/src/storage.ts` to `packages/saga-types/src/storage.ts`
- The storage module contains: `readStory`, `writeStory`, `readEpic`, `writeEpic`, `readTask`, `writeTask`, `listStories`, `listEpics`, `listTasks`, `listEpicStories`, `listStandaloneStories`, `deriveStoryStatus`, `deriveEpicStatus`, `validateStoryId`, `ensureUniqueStoryId`
- Dependencies are clean: only `node:fs`, `node:path`, and `@saga-ai/types` (which becomes local imports after the move)
- Export all storage functions from `packages/saga-types/src/index.ts`
- Update `packages/plugin-scripts/src/storage.ts` to re-export from `@saga-ai/types` (or update all imports in plugin-scripts to point to `@saga-ai/types` directly)
- Move the corresponding test file (`storage.test.ts` and `storage.integration.test.ts`) to saga-types as well
- Verify all plugin-scripts tests still pass after the move

**References:**
- Source: `packages/plugin-scripts/src/storage.ts`
- Tests: `packages/plugin-scripts/src/storage.test.ts`, `packages/plugin-scripts/src/storage.integration.test.ts`
- Target: `packages/saga-types/src/storage.ts`
- Barrel: `packages/saga-types/src/index.ts`

**Avoid:**
- Do not change any function signatures or behavior -- this is a pure move
- Do not break plugin-scripts -- ensure all imports resolve after the move

**Done when:**
- Storage utilities are exported from `@saga-ai/types`
- `plugin-scripts` imports storage from `@saga-ai/types` instead of local `./storage`
- All existing storage tests pass in their new location
- All plugin-scripts tests pass

### t2: Update saga-scanner to use saga-types storage

**Guidance:**
- Rewrite `saga-scanner.ts` to use storage utilities from `@saga-ai/types`: `listStories`, `listEpics`, `readStory`, `readEpic`, `listTasks`, `readTask`
- Replace `scanEpicsStories()` with a new `scanStories()` function that calls `listStories()` and `readStory()` for each
- Replace `scanEpics()` to call `listEpics()` and `readEpic()` for each
- For each story, load tasks using `listTasks()` and `readTask()`
- Read the `worktree` field from `story.json` for worktree information (instead of scanning `.saga/worktrees/` separately)
- Remove old markdown scanning functions (`scanEpicsStories`, `scanWorktrees`, `scanArchive`)
- Remove archive scanning (archive format is TBD in new model)
- Keep `parseFrontmatter` exported for journal.md parsing (journal remains markdown)
- Keep `gray-matter` available -- it is still needed for journal.md and possibly other markdown files

**References:**
- Current scanner: `packages/dashboard/src/utils/saga-scanner.ts`
- Storage utilities: `@saga-ai/types` (after t1 move) -- `listStories`, `listEpics`, `readStory`, `readEpic`, `listTasks`, `readTask`
- Story type: `Story` from `@saga-ai/types` -- `{id, title, description, epic?, guidance?, doneWhen?, avoid?, branch?, pr?, worktree?}`
- Task type: `Task` from `@saga-ai/types` -- `{id, subject, description, activeForm?, status, blockedBy[], guidance?, doneWhen?}`
- Epic type: `Epic` from `@saga-ai/types` -- `{id, title, description, children[{id, blockedBy[]}]}`

**Avoid:**
- Do not keep backward compatibility with the old markdown format -- this is a clean break
- Do not reimplement storage logic that already exists in `@saga-ai/types` -- use the shared utilities

**Done when:**
- `scanStories(sagaRoot)` returns stories with their tasks from `.saga/stories/` using `@saga-ai/types` storage
- `scanEpics(sagaRoot)` returns epics with their children from `.saga/epics/` using `@saga-ai/types` storage
- Stories include `worktree` field from `story.json`
- Old markdown scanning functions are removed

### t3: Update server parser for JSON data model

**Guidance:**
- Rewrite `scanSagaDirectory()` to use the updated scanner functions from t2
- Use `deriveStoryStatus` and `deriveEpicStatus` from `@saga-ai/types` for status derivation
- Group stories under their epics using the `epic` field in `story.json`
- Support standalone stories (those without an `epic` field) -- expose them via the API but not nested under any epic
- Update `StoryCounts` to use new statuses: `pending`, `inProgress`, `completed` (drop `ready` and `blocked`)
- Update `StoryDetail` interface to include full task objects with `subject`, `description`, `guidance`, `doneWhen`, `activeForm`, `status`, `blockedBy`
- Update `Epic` interface to include `children` array and `description` field
- Keep journal parsing unchanged (journal.md remains markdown with `##` section headers)
- Update `parseStory()` to work with the scanned story data (JSON-based, not frontmatter)

**References:**
- Current parser: `packages/dashboard/src/server/parser.ts`
- Status derivation: `deriveStoryStatus`, `deriveEpicStatus` from `@saga-ai/types`
- `toStoryDetail()`, `buildEpic()`, `scanSagaDirectory()` are the main functions to update

**Avoid:**
- Do not reimplement status derivation -- use `deriveStoryStatus`/`deriveEpicStatus` from `@saga-ai/types`
- Do not store status on stories or epics -- always derive it
- Do not change journal.md parsing -- it remains markdown with `##` section headers
- Do not keep old status types (`ready`, `blocked`) -- the new model only has `pending`, `in_progress`, `completed`

**Done when:**
- `scanSagaDirectory()` returns epics with nested stories, all with derived statuses
- Standalone stories (no epic) are included in the returned data
- `StoryDetail` includes full task objects (not just id/title/status)
- `StoryCounts` reflects `pending`/`inProgress`/`completed` counts
- Status derivation uses shared functions from `@saga-ai/types`

### t4: Update file watcher paths and event parsing

**Guidance:**
- Change watched directories from `['.saga/epics/', '.saga/archive/']` to `['.saga/stories/', '.saga/epics/']`
- Update `parseFilePath()` to handle new path structures:
  - `.saga/stories/<story-id>/story.json` -> story event with `storyId`
  - `.saga/stories/<story-id>/<task-id>.json` -> story event with `storyId` (task change triggers story refresh)
  - `.saga/stories/<story-id>/journal.md` -> story event with `storyId`
  - `.saga/epics/<epic-id>.json` -> epic event with `epicId`
- Replace `epicSlug`/`storySlug` in `WatcherEvent` with `epicId`/`storyId` to match new naming
- Task file changes (`.saga/stories/<id>/<task>.json`) should emit `story:changed` since status derivation depends on task states
- Remove archive path handling

**References:**
- Current watcher: `packages/dashboard/src/server/watcher.ts`
- New paths: `.saga/stories/<story-id>/` (folders), `.saga/epics/<epic-id>.json` (files)
- `createChokidarWatcher()`, `parseFilePath()`, `createFileEventHandler()` are the main functions to update

**Avoid:**
- Do not watch `.saga/archive/` -- archive handling is deferred
- Do not create separate watcher events for individual task files -- aggregate them as `story:changed`
- Do not change the debouncing mechanism -- it works well as-is

**Done when:**
- Watcher watches `.saga/stories/` and `.saga/epics/` directories
- Changes to `story.json`, task JSON files, and `journal.md` within a story folder emit `story:changed` (or `story:added`/`story:removed` for `story.json`)
- Changes to `<epic-id>.json` emit `epic:changed`/`epic:added`/`epic:removed`
- `WatcherEvent` uses `storyId`/`epicId` field naming

### t5: Update REST API routes for new data model

**Guidance:**
- Change story endpoint from `GET /api/stories/:epicSlug/:storySlug` to `GET /api/stories/:storyId`
- The story endpoint should return the full story detail including all tasks and derived status
- Epic endpoints (`GET /api/epics`, `GET /api/epics/:epicId`) should include the `children` dependency array and derived status
- Add support for listing standalone stories: `GET /api/stories` returns stories not belonging to any epic
- Update `toEpicSummary()` to use new `StoryCounts` shape (pending/inProgress/completed)
- The story endpoint no longer needs to find the story through its parent epic -- stories are top-level entities

**References:**
- Current routes: `packages/dashboard/src/server/routes.ts`
- Current URL pattern: `/api/stories/:epicSlug/:storySlug` -> new: `/api/stories/:storyId`
- `registerEpicsRoutes()`, `registerStoriesRoutes()` are the main functions to update

**Avoid:**
- Do not keep the old two-segment story URL (`/:epicSlug/:storySlug`) -- the new model uses flat story IDs
- Do not break session routes -- they remain unchanged

**Done when:**
- `GET /api/stories/:storyId` returns story detail with tasks and derived status
- `GET /api/epics/:epicId` returns epic detail with children, dependencies, and derived status
- `GET /api/epics` returns epic summaries with derived status and updated story counts
- Stories are no longer looked up through their parent epic

### t6: Update session module for new naming and JSONL output

**Guidance:**
- Update `sessions.ts` to support the new session naming convention: `saga-story-<storyId>-<timestamp>` (replacing `saga__<epic>__<story>__<timestamp>`)
- Update `SESSION_NAME_PATTERN` regex to match the new format
- Update `SESSION_NAME_PARTS_COUNT` and the name-parsing logic to extract `storyId` and `timestamp` from the new format
- Change `DetailedSessionInfo` to include `storyId` (instead of `epicSlug`/`storySlug` or the double-underscore parsing)
- Update `OUTPUT_DIR` file extension from `.out` to `.jsonl` -- the output file is now `$SAGA_SESSION_DIR/<sessionName>.jsonl`
- Update `buildSessionInfo()` to read `.jsonl` files instead of `.out` files
- Update `outputPreview` generation -- instead of reading the last N lines of raw text, read the last N JSONL lines and extract a meaningful preview (e.g., the last `pipeline_step` message or the `pipeline_end` status)
- The `SAGA_SESSION_DIR` environment variable defines the base directory (default: `/tmp/saga-sessions`)

**References:**
- Current sessions module: `packages/dashboard/src/lib/sessions.ts`
- New session naming: `saga-story-<storyId>-<timestamp>` (from execute-story SKILL.md)
- Old session naming: `saga__<epic>__<story>__<timestamp>`
- Output file: `$SAGA_SESSION_DIR/<sessionName>.jsonl` (was `.out`)
- `SagaWorkerMessage` types from `@saga-ai/types`: `pipeline_start`, `pipeline_step`, `pipeline_end`, `cycle_start`, `cycle_end`

**Avoid:**
- Do not break session creation -- that is handled by the execute-story skill, not the dashboard
- Do not change the tmux interaction commands (list, attach, kill) -- only update name parsing and output file handling

**Done when:**
- Session module correctly parses `saga-story-<storyId>-<timestamp>` session names
- `DetailedSessionInfo` exposes `storyId` (not epic/story slug pair)
- Output file paths use `.jsonl` extension
- Session output preview is generated from JSONL content

### t7: Update log streaming for JSONL messages

**Guidance:**
- Update `LogStreamManager` to read `.jsonl` files instead of `.out` files:
  - Change the file path from `${sessionName}.out` to `${sessionName}.jsonl`
  - Switch from byte-offset incremental reading to line-based JSONL parsing
  - On initial subscription: read the full file, split into lines, parse each line as JSON
  - On file change: read new lines since last known line count, parse each as JSON
  - Send typed message arrays to clients instead of raw text strings
- Update the `LogsDataMessage` interface:
  - Change `data` field from `string` to an array of parsed JSONL message objects
  - Each message is either a `SagaWorkerMessage` (type: `saga_worker`) or an `SDKMessage` (from Agent SDK)
- Import `SagaWorkerMessage` from `@saga-ai/types` for type-safe handling
- Update the WebSocket message protocol:
  - `logs:data` messages carry `messages: WorkerMessage[]` instead of `data: string`
- Update `LogViewer` component:
  - Instead of displaying raw text lines, render structured messages
  - Distinguish between `saga_worker` events (pipeline progress, cycle info) and SDK `assistant`/`result` messages
  - Show worker progress information: current cycle, pipeline step, elapsed time, completion status
  - Preserve virtual scrolling for performance
- Update `useLogSubscription` hook to handle typed messages instead of raw text concatenation
- Update the XState machine's log message routing to handle the new message format

**References:**
- Current `LogStreamManager`: `packages/dashboard/src/lib/log-stream-manager.ts`
- Current `LogViewer`: `packages/dashboard/src/client/src/components/LogViewer.tsx`
- Current `useLogSubscription` hook: inline in LogViewer.tsx
- `SagaWorkerMessage` types: `@saga-ai/types` -- `pipeline_start`, `pipeline_step`, `pipeline_end`, `cycle_start`, `cycle_end`
- `SDKMessage` type: `@anthropic-ai/claude-agent-sdk`
- WebSocket message routing: `packages/dashboard/src/client/src/machines/dashboardMachine.ts`

**Avoid:**
- Do not change the WebSocket connection/reconnection logic -- only update message payloads
- Do not remove virtual scrolling -- it is needed for performance with many messages
- Do not change the subscription/unsubscription protocol -- only update message content format

**Done when:**
- `LogStreamManager` reads `.jsonl` files and parses each line as a typed JSON message
- `logs:data` WebSocket messages carry typed message arrays instead of raw text
- `LogViewer` renders structured messages with different styling for worker events vs SDK messages
- Worker progress (cycle number, pipeline step, completion status) is visible in the UI
- Virtual scrolling works with the new message-based rendering

### t8: Update client-side TypeScript types

**Guidance:**
- Update `types/dashboard.ts` to match the new API response shapes
- Import `Task`, `Story`, `Epic`, `EpicChild`, `TaskStatus` from `@saga-ai/types` for server-side usage
- For client-side API response types, define locally but ensure they mirror the `@saga-ai/types` shapes:
  - Change `StoryStatus` from `'ready' | 'inProgress' | 'blocked' | 'completed'` to `'pending' | 'inProgress' | 'completed'`
  - Update `Task` interface to include `subject` (replaces `title`), `description`, `activeForm?`, `status`, `blockedBy[]`, `guidance?`, `doneWhen?`
  - Update `StoryCounts` to drop `ready` and `blocked`, add `pending`
  - Update `StoryDetail` to include `description`, `guidance?`, `doneWhen?`, `avoid?`, `epic?` (optional epic ID)
  - Update `Epic` to include `description`, `children` array with `{id, blockedBy[]}`
  - Add `EpicChild` interface: `{id: string, blockedBy: string[]}`
  - Update `EpicSummary` to use `id` instead of `slug`
- Add `WorkerMessage` type for the JSONL log messages (used by LogViewer)
- Add `DetailedSessionInfo` type update to include `storyId` instead of `epicSlug`/`storySlug`

**References:**
- Current types: `packages/dashboard/src/client/src/types/dashboard.ts`
- Domain types: `@saga-ai/types` -- `Story`, `Epic`, `Task`, `EpicChild`, `TaskStatus`
- Worker message types: `@saga-ai/types` -- `SagaWorkerMessage`

**Avoid:**
- Do not keep old status values (`ready`, `blocked`) in the type definitions
- Do not break the sessions panel types -- update them alongside

**Done when:**
- All TypeScript types match the new API response format
- No references to `ready` or `blocked` status remain in type definitions
- `Task` type includes all new fields (`subject`, `description`, `blockedBy`, `guidance`, `doneWhen`, `activeForm`)
- `WorkerMessage` type is defined for JSONL log message rendering
- Session types use `storyId` instead of epic/story slug pair

### t9: Update React components for new data model

**Guidance:**
- Update `StatusBadge` to support `pending` | `inProgress` | `completed` (drop `ready` and `blocked`)
- Update `StoryCard` to show derived status and task progress
- Update `EpicDetail` page:
  - Show epic description
  - Display story dependency graph (show which stories are blocked by which, using the `children` array)
  - Use new status values for sorting and display
- Update `StoryDetail` page:
  - Show task-level detail: `subject`, `description`, `guidance`, `doneWhen`, `activeForm`, `status`, `blockedBy`
  - Show story `description`, `guidance`, `doneWhen`, `avoid` fields
  - Update task progress calculation to work with new task shape (`subject` instead of `title`)
- Update `EpicList` page to use new `StoryCounts` shape
- Update URL routing: story URLs change from `/epic/:epicSlug/story/:storySlug` to `/story/:storyId` (stories are top-level)
- Keep epic detail URL as `/epic/:epicId`
- Update `router.tsx` for new URL patterns
- Update breadcrumb navigation for the new URL structure

**References:**
- Components: `packages/dashboard/src/client/src/pages/EpicDetail.tsx`, `StoryDetail.tsx`, `EpicList.tsx`
- Components: `packages/dashboard/src/client/src/components/` (StatusBadge, StoryCard, EpicContent, Breadcrumb)
- Router: `packages/dashboard/src/client/src/router.tsx`

**Avoid:**
- Do not add interactive features (e.g., buttons to start execution) -- the dashboard is read-only
- Do not change the overall layout or design system -- only update data shapes and status values
- Do not break the sessions panel -- it is independent of epic/story data

**Done when:**
- Status badges show "Pending", "In Progress", "Completed" (no "Ready" or "Blocked")
- Epic detail page shows story dependencies visually
- Story detail page shows task-level fields (subject, description, guidance, doneWhen)
- Story URLs use `/story/:storyId` pattern
- All pages render correctly with the new data model

### t10: Update XState machine and context

**Guidance:**
- Update the dashboard machine context types to match new data shapes
- Replace `EpicSummary.slug` with `EpicSummary.id` in context
- Replace `StoryDetail.slug`/`epicSlug` references with `id`/`epic` references
- Update `SUBSCRIBE_STORY`/`UNSUBSCRIBE_STORY` events to use `storyId` instead of `epicSlug`/`storySlug`
- Update `subscribedStories` set to use story IDs instead of `epicSlug:storySlug` keys
- Ensure data actions (`setEpics`, `setCurrentEpic`, `setCurrentStory`) work with new type shapes
- Update log message routing to handle typed JSONL messages (from t7) instead of raw text

**References:**
- Machine: `packages/dashboard/src/client/src/machines/dashboardMachine.ts`
- Context: `packages/dashboard/src/client/src/context/dashboard-context.tsx`
- Events: `EPICS_LOADED`, `EPIC_LOADED`, `STORY_LOADED`, `SUBSCRIBE_STORY`, `UNSUBSCRIBE_STORY`
- Log callbacks: `logDataCallbacks`, `logErrorCallbacks` in dashboardMachine.ts

**Avoid:**
- Do not change the overall machine structure (states, transitions) -- only update context types and event payloads
- Do not change connection/reconnection logic -- it is independent of data shapes

**Done when:**
- Machine context uses new type shapes
- Story subscription uses `storyId` instead of `epicSlug:storySlug`
- All machine events work with new data shapes
- Log message routing handles typed JSONL messages
- Dashboard context hooks return correctly typed data

### t11: Update tests and fixtures

**Guidance:**
- Convert test fixtures from markdown format to JSON format:
  - Replace `.saga/epics/<slug>/epic.md` with `.saga/epics/<id>.json`
  - Replace `.saga/epics/<slug>/stories/<slug>/story.md` with `.saga/stories/<id>/story.json` + `<task-id>.json`
- Update unit tests for parser, scanner, watcher, and routes to use new JSON format
- Add tests for session name parsing with the new `saga-story-<storyId>-<timestamp>` format
- Add tests for `LogStreamManager` JSONL parsing (mock `.jsonl` files with typed messages)
- Update E2E test fixtures in `src/client/e2e/fixtures/`
- Update component tests and Storybook stories to use new data shapes
- Update snapshot tests (they will need to be regenerated)
- Verify derived status logic is correctly tested (status derivation uses `@saga-ai/types` utilities)
- Add tests for `LogViewer` rendering of typed JSONL messages

**References:**
- Server tests: `packages/dashboard/src/server/__tests__/`
- E2E fixtures: `packages/dashboard/src/client/e2e/fixtures/`
- Component tests: `packages/dashboard/src/client/src/components/*.test.tsx`
- Storybook stories: `packages/dashboard/src/client/src/components/*.stories.tsx`, `packages/dashboard/src/client/src/pages/*.stories.tsx`
- Log stream tests: `packages/dashboard/src/lib/__tests__/`
- Session tests: `packages/dashboard/src/lib/__tests__/`

**Avoid:**
- Do not skip updating snapshot tests -- they must be regenerated to match new output
- Do not keep old markdown fixtures around -- clean break to JSON
- Do not reduce test coverage -- maintain or improve it

**Done when:**
- All test fixtures use JSON format matching the new schema
- Parser tests verify status derivation from task/story statuses
- Watcher tests verify correct events for `.saga/stories/` and `.saga/epics/` changes
- Route tests verify new URL patterns and response shapes
- Session tests verify new naming convention parsing and `.jsonl` file handling
- Log stream tests verify JSONL parsing and typed message delivery
- LogViewer tests verify structured message rendering
- E2E tests pass with JSON fixtures
- Component tests pass with new data shapes
- All snapshot tests are regenerated
