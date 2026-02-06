---
id: dashboard-adaptation
title: Dashboard Adaptation
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Update saga-scanner to read JSON format
    status: pending
  - id: t2
    title: Update server parser for JSON data model
    status: pending
  - id: t3
    title: Update file watcher paths and event parsing
    status: pending
  - id: t4
    title: Update REST API routes for new data model
    status: pending
  - id: t5
    title: Update client-side TypeScript types
    status: pending
  - id: t6
    title: Update React components for new data model
    status: pending
  - id: t7
    title: Update XState machine and context
    status: pending
  - id: t8
    title: Update tests and fixtures
    status: pending
---

## Context

SAGA is migrating from a markdown-based storage format (YAML frontmatter in `.md` files, nested `epics/<slug>/stories/<slug>/story.md`) to a JSON-based storage format with flat story folders (`.saga/stories/<id>/story.json` + task files) and single-file epics (`.saga/epics/<id>.json`). The `@saga-ai/dashboard` package provides a web-based monitoring interface that reads this data, serves it through a REST/WebSocket API, and renders it in a React frontend.

This story updates the entire dashboard pipeline -- from file scanning through API serving to React rendering -- to consume the new JSON format. After this story is complete, the dashboard will read `.saga/stories/` and `.saga/epics/` in JSON format, derive story/epic status from task statuses, display epic-to-story trees with dependency information, and show task-level detail including `guidance`, `doneWhen`, and `activeForm` fields.

The dashboard currently uses `gray-matter` to parse YAML frontmatter from `story.md` and `epic.md` files organized in a nested `epics/<slug>/stories/<slug>/` hierarchy. The new format uses `JSON.parse` on flat `story.json`, `<epic-id>.json`, and `<task-id>.json` files. Story and epic statuses are no longer stored -- they are derived at read time from child statuses.

## Scope Boundaries

**In scope:**
- Updating `saga-scanner.ts` to scan `.saga/stories/` (flat folders with `story.json` + `*.json` task files) and `.saga/epics/` (single JSON files)
- Updating `parser.ts` to parse JSON story, epic, and task files instead of markdown with YAML frontmatter
- Updating `watcher.ts` to watch `.saga/stories/` and `.saga/epics/` for JSON file changes
- Updating `routes.ts` REST API endpoints for the new data model (story routes change from `/api/stories/:epicSlug/:storySlug` to `/api/stories/:storyId`)
- Updating client-side TypeScript types in `dashboard.ts` to match new API shapes
- Updating React components (`EpicDetail`, `EpicList`, `StoryDetail`, `StoryCard`, status badges) for derived status, task-level fields, and epic dependency display
- Updating the XState dashboard machine context to reflect new data shapes
- Updating test fixtures from markdown to JSON format
- Removing `gray-matter` dependency from the scanner/parser pipeline (no longer needed for SAGA files)

**Out of scope:**
- Implementing the actual JSON storage layer or Zod schemas (covered by "Story and Epic JSON Storage" and "SAGA Types Migration to JSON Format" stories)
- Worker execution, hydration, or sync logic (covered by "Worker Script and Execution Pipeline" and "Hydration and Sync Layer" stories)
- Updating plugin skills or the generate-story agent (covered by "Skills Migration" story)
- Backward compatibility with the old markdown format
- Adding new dashboard features beyond what the new data model requires (e.g., epic orchestration controls, worker launch UI)
- Session management changes (tmux session naming pattern updates are minimal and follow from the new data model)

## Interface

### Inputs

- **New JSON file formats** (produced by "Story and Epic JSON Storage" story):
  - `.saga/stories/<story-id>/story.json` -- Story metadata (id, title, description, epic?, guidance?, doneWhen?, avoid?, branch?, pr?, worktree?)
  - `.saga/stories/<story-id>/<task-id>.json` -- Task files (id, subject, description, activeForm?, status, blockedBy[], guidance?, doneWhen?)
  - `.saga/epics/<epic-id>.json` -- Epic files (id, title, description, children[{id, blockedBy[]}])
  - `.saga/stories/<story-id>/journal.md` -- Journal files (unchanged markdown format)
- **New TypeScript types** (produced by "SAGA Types Migration to JSON Format" story):
  - `Story`, `Epic`, `Task` interfaces from `saga-types` package

### Outputs

- **Updated REST API** consumed by the React frontend:
  - `GET /api/epics` -- Returns epic summaries with derived status and story counts
  - `GET /api/epics/:epicId` -- Returns epic detail with child stories, dependencies, and derived status
  - `GET /api/stories/:storyId` -- Returns story detail with tasks, derived status, journal
- **Updated WebSocket events** pushed to the frontend on file changes:
  - `story:changed`, `story:added`, `story:removed` events keyed by story ID
  - `epic:changed`, `epic:added`, `epic:removed` events keyed by epic ID
- **Updated React UI** rendering epic/story trees with the new data model

## Acceptance Criteria

- [ ] Dashboard scans `.saga/stories/` for flat story folders containing `story.json` and `*.json` task files
- [ ] Dashboard scans `.saga/epics/` for single JSON epic files (`<epic-id>.json`)
- [ ] Story status is derived at read time: any task `in_progress` -> "in_progress"; all tasks `completed` -> "completed"; otherwise "pending"
- [ ] Epic status is derived at read time from child story statuses using the same derivation rules
- [ ] REST API endpoint `GET /api/stories/:storyId` returns story detail with full task list (including `guidance`, `doneWhen`, `activeForm` fields)
- [ ] REST API endpoint `GET /api/epics/:epicId` returns epic detail with child stories and dependency graph
- [ ] File watcher detects changes in `.saga/stories/` and `.saga/epics/` and triggers WebSocket updates
- [ ] React components display derived status badges (pending/in_progress/completed instead of ready/in_progress/blocked/completed)
- [ ] React epic detail page shows story dependency graph (which stories block which)
- [ ] React story detail page shows task-level information including `guidance`, `doneWhen`, and `activeForm`
- [ ] All existing dashboard tests pass after updating fixtures to JSON format
- [ ] Standalone stories (no epic) are accessible via the API and visible in the dashboard

## Tasks

### t1: Update saga-scanner to read JSON format

**Guidance:**
- Replace `scanEpicsStories()` with a new `scanStories()` function that reads `.saga/stories/` (flat folders)
- Each story folder contains `story.json` (metadata) and `<task-id>.json` files (tasks)
- Replace `scanEpics()` to read `.saga/epics/*.json` files (single JSON files per epic, not directories with `epic.md`)
- Use `JSON.parse` instead of `gray-matter` for parsing
- Read task files by listing `*.json` files in each story folder, excluding `story.json`
- The `ScannedStory` type should include task data (array of parsed task objects)
- The `ScannedEpic` type should include `children` array with `{id, blockedBy[]}` entries
- Remove worktree scanning for now (worktree paths will change in the new model -- story worktrees are at `.saga/worktrees/<story-id>/` not nested under epic)
- Remove archive scanning (archive format is TBD in new model)
- Keep `parseFrontmatter` exported for any remaining markdown parsing (journal.md)

**References:**
- Current scanner: `packages/dashboard/src/utils/saga-scanner.ts`
- New storage layout from epic: `.saga/stories/<story-id>/story.json`, `.saga/stories/<story-id>/<task-id>.json`, `.saga/epics/<epic-id>.json`
- Story JSON schema: `{id, title, description, epic?, guidance?, doneWhen?, avoid?, branch?, pr?, worktree?}`
- Task JSON schema: `{id, subject, description, activeForm?, status, blockedBy[], guidance?, doneWhen?}`
- Epic JSON schema: `{id, title, description, children[{id, blockedBy[]}]}`

**Avoid:**
- Do not keep backward compatibility with the old markdown format -- this is a clean break
- Do not import from `saga-types` package -- define local interfaces until the types story is complete, then switch
- Do not use `gray-matter` for JSON files -- only `JSON.parse` is needed

**Done when:**
- `scanStories(sagaRoot)` returns an array of stories with their tasks from `.saga/stories/`
- `scanEpics(sagaRoot)` returns an array of epics with their children from `.saga/epics/`
- Stories reference their parent epic via the `epic` field in `story.json` (not via directory nesting)
- Old markdown scanning functions (`scanEpicsStories`, `scanWorktrees`, `scanArchive`) are removed or clearly deprecated

### t2: Update server parser for JSON data model

**Guidance:**
- Rewrite `scanSagaDirectory()` to use the updated scanner functions
- Derive story status from task statuses: any task `in_progress` -> story is `in_progress`; all tasks `completed` -> story is `completed`; otherwise `pending`
- Derive epic status from child story statuses using the same rules
- Group stories under their epics using the `epic` field in `story.json`
- Support standalone stories (those without an `epic` field) -- expose them via the API but not nested under any epic
- Update `StoryCounts` to use new statuses: `pending`, `inProgress`, `completed` (drop `ready` and `blocked`)
- Update `StoryDetail` interface to include full task objects with `subject`, `description`, `guidance`, `doneWhen`, `activeForm`, `status`, `blockedBy`
- Update `Epic` interface to include `children` array and `description` field
- Keep journal parsing unchanged (journal.md remains markdown)
- Update `parseStory()` to read `story.json` + task files instead of `story.md` with frontmatter

**References:**
- Current parser: `packages/dashboard/src/server/parser.ts`
- Status derivation rules from epic: "any task in_progress -> in_progress; all tasks completed -> completed; otherwise pending"
- `toStoryDetail()`, `buildEpic()`, `scanSagaDirectory()` are the main functions to update

**Avoid:**
- Do not store status on stories or epics -- always derive it
- Do not change journal.md parsing -- it remains markdown with `##` section headers
- Do not keep old status types (`ready`, `blocked`) -- the new model only has `pending`, `in_progress`, `completed`

**Done when:**
- `scanSagaDirectory()` returns epics with nested stories, all with derived statuses
- Standalone stories (no epic) are included in the returned data
- `StoryDetail` includes full task objects (not just id/title/status)
- `StoryCounts` reflects `pending`/`inProgress`/`completed` counts

### t3: Update file watcher paths and event parsing

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

### t4: Update REST API routes for new data model

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

### t5: Update client-side TypeScript types

**Guidance:**
- Update `types/dashboard.ts` to match the new API response shapes
- Change `StoryStatus` from `'ready' | 'inProgress' | 'blocked' | 'completed'` to `'pending' | 'inProgress' | 'completed'`
- Update `Task` interface to include `subject` (replaces `title`), `description`, `activeForm?`, `status`, `blockedBy[]`, `guidance?`, `doneWhen?`
- Update `StoryCounts` to drop `ready` and `blocked`, add `pending`
- Update `StoryDetail` to include `description`, `guidance?`, `doneWhen?`, `avoid?`, `epic?` (optional epic ID)
- Update `Epic` to include `description`, `children` array with `{id, blockedBy[]}`
- Add `EpicChild` interface: `{id: string, blockedBy: string[]}`
- Update `EpicSummary` to use `id` instead of `slug`

**References:**
- Current types: `packages/dashboard/src/client/src/types/dashboard.ts`
- New Story schema: `{id, title, description, epic?, guidance?, doneWhen?, avoid?, branch?, pr?, worktree?}`
- New Epic schema: `{id, title, description, children[{id, blockedBy[]}]}`
- New Task schema: `{id, subject, description, activeForm?, status, blockedBy[], guidance?, doneWhen?}`

**Avoid:**
- Do not keep old status values (`ready`, `blocked`) in the type definitions
- Do not import from `saga-types` -- define types locally for the dashboard (they are API response shapes, not domain types)

**Done when:**
- All TypeScript types match the new API response format
- No references to `ready` or `blocked` status remain in type definitions
- `Task` type includes all new fields (`subject`, `description`, `blockedBy`, `guidance`, `doneWhen`, `activeForm`)

### t6: Update React components for new data model

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

### t7: Update XState machine and context

**Guidance:**
- Update the dashboard machine context types to match new data shapes
- Replace `EpicSummary.slug` with `EpicSummary.id` in context
- Replace `StoryDetail.slug`/`epicSlug` references with `id`/`epic` references
- Update `SUBSCRIBE_STORY`/`UNSUBSCRIBE_STORY` events to use `storyId` instead of `epicSlug`/`storySlug`
- Update `subscribedStories` set to use story IDs instead of `epicSlug:storySlug` keys
- Ensure data actions (`setEpics`, `setCurrentEpic`, `setCurrentStory`) work with new type shapes

**References:**
- Machine: `packages/dashboard/src/client/src/machines/dashboardMachine.ts`
- Context: `packages/dashboard/src/client/src/context/dashboard-context.tsx`
- Events: `EPICS_LOADED`, `EPIC_LOADED`, `STORY_LOADED`, `SUBSCRIBE_STORY`, `UNSUBSCRIBE_STORY`

**Avoid:**
- Do not change the overall machine structure (states, transitions) -- only update context types and event payloads
- Do not change connection/reconnection logic -- it is independent of data shapes

**Done when:**
- Machine context uses new type shapes
- Story subscription uses `storyId` instead of `epicSlug:storySlug`
- All machine events work with new data shapes
- Dashboard context hooks return correctly typed data

### t8: Update tests and fixtures

**Guidance:**
- Convert test fixtures from markdown format to JSON format:
  - Replace `.saga/epics/<slug>/epic.md` with `.saga/epics/<id>.json`
  - Replace `.saga/epics/<slug>/stories/<slug>/story.md` with `.saga/stories/<id>/story.json` + `<task-id>.json`
- Update unit tests for parser, scanner, watcher, and routes to use new JSON format
- Update E2E test fixtures in `src/client/e2e/fixtures/`
- Update component tests and Storybook stories to use new data shapes
- Update snapshot tests (they will need to be regenerated)
- Verify derived status logic is correctly tested (status derivation is a core behavior)

**References:**
- Server tests: `packages/dashboard/src/server/__tests__/`
- E2E fixtures: `packages/dashboard/src/client/e2e/fixtures/`
- Component tests: `packages/dashboard/src/client/src/components/*.test.tsx`
- Storybook stories: `packages/dashboard/src/client/src/components/*.stories.tsx`, `packages/dashboard/src/client/src/pages/*.stories.tsx`

**Avoid:**
- Do not skip updating snapshot tests -- they must be regenerated to match new output
- Do not keep old markdown fixtures around -- clean break to JSON
- Do not reduce test coverage -- maintain or improve it

**Done when:**
- All test fixtures use JSON format matching the new schema
- Parser tests verify status derivation from task/story statuses
- Watcher tests verify correct events for `.saga/stories/` and `.saga/epics/` changes
- Route tests verify new URL patterns and response shapes
- E2E tests pass with JSON fixtures
- Component tests pass with new data shapes
- All snapshot tests are regenerated
