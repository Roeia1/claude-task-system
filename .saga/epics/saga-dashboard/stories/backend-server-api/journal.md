# Journal: backend-server-api

## Session: 2026-01-26T23:30:00Z

### Task: t1 - Project Setup and Express Server Foundation

**What was done:**
- Installed server dependencies: express, ws, chokidar, gray-matter, @types/express, @types/ws
- Created `packages/cli/src/server/` directory structure
- Created `packages/cli/src/server/index.ts` with:
  - `ServerConfig` interface (sagaRoot, port)
  - `ServerInstance` interface (app, httpServer, port, close)
  - `startServer()` function that creates Express app with JSON middleware, CORS headers, and health endpoint
  - Default port 3847
- Created `packages/cli/src/server/__tests__/server.test.ts` with 8 tests covering:
  - Server startup on default and custom ports
  - Express app and HTTP server instance exports
  - Server closability
  - Health endpoint returns `{ status: "ok" }`
  - CORS headers present
  - JSON middleware functionality
- Updated `packages/cli/src/commands/dashboard.ts` to use the actual `startServer()` instead of placeholder
- Added graceful shutdown handlers (SIGINT, SIGTERM) to dashboard command

**Decisions:**
- Used native `http.createServer()` to wrap Express for future WebSocket integration (ws library attaches to HTTP server)
- Used `*` for CORS origin since this is a local development tool
- Kept server code minimal, deferring route handlers to future tasks

**Next steps:**
- t2: Implement file system parsing module (parser.ts) with gray-matter for YAML frontmatter

## Session: 2026-01-26T23:56:00Z

### Task: t2 - File System Parsing Module

**What was done:**
- Created `packages/cli/src/server/parser.ts` with complete filesystem parsing logic:
  - TypeScript interfaces: `StoryCounts`, `Task`, `JournalEntry`, `StoryDetail`, `EpicSummary`, `Epic`
  - `parseStory(storyPath, epicSlug)` - parses story.md with YAML frontmatter using gray-matter
  - `parseEpic(epicPath)` - extracts title from first `# ` heading in epic.md
  - `parseJournal(journalPath)` - parses journal.md by `## Session:`, `## Blocker:`, `## Resolution:` headers
  - `scanSagaDirectory(sagaRoot)` - scans entire .saga/ directory structure including archived stories
- Created comprehensive test suite in `packages/cli/src/server/__tests__/parser.test.ts` with 23 tests covering:
  - Valid YAML frontmatter parsing
  - Missing file handling (returns null/empty array)
  - Malformed YAML graceful degradation (uses defaults)
  - Journal entry parsing for all types (session, blocker, resolution)
  - Multiple epics and stories scanning
  - Story counts calculation by status
  - Archived stories detection with `archived: true` flag
  - Relative path generation from saga root
- Fixed server.test.ts to use random ports (30000-50000 range) to avoid port conflicts in parallel test runs

**Decisions:**
- Used async/await for all file operations for consistency
- Graceful error handling: missing files return null/empty, malformed YAML logs warning and uses defaults (status: 'ready', tasks: [])
- Story status validated to one of: 'ready', 'in_progress', 'blocked', 'completed'
- Task status validated to one of: 'pending', 'in_progress', 'completed'
- Paths in results are relative to saga root (not absolute) to avoid exposing system paths
- Journal entries parsed by splitting on `## ` headers and checking for known prefixes

**Next steps:**
- t3: Implement REST API endpoints (routes.ts) using the parser module

## Session: 2026-01-27T00:33:00Z

### Task: t3 - REST API Endpoints

**What was done:**
- Created `packages/cli/src/server/routes.ts` with Express router and three endpoints:
  - `GET /api/epics` - returns `EpicSummary[]` (without full story list or content)
  - `GET /api/epics/:slug` - returns full `Epic` with stories and content
  - `GET /api/stories/:epicSlug/:storySlug` - returns `StoryDetail` with parsed journal
- Implemented data caching (cache cleared on each request for now, will be refreshed by file watcher)
- Integrated router into main server via `createApiRouter(sagaRoot)` in `index.ts`
- Created comprehensive test suite in `packages/cli/src/server/__tests__/routes.test.ts` with 21 tests covering:
  - Epic list returns proper `EpicSummary[]` structure
  - Epic detail includes stories with tasks and archived flag
  - Story detail includes parsed journal entries by type
  - 404 responses for missing epics/stories with JSON error bodies
  - Relative paths used (no absolute system paths exposed)
  - Empty array for projects with no epics
- Installed `supertest` and `@types/supertest` for HTTP testing
- Updated `dashboard.test.ts` to work with actual running server (async process spawning with proper cleanup)

**Decisions:**
- Used `toEpicSummary()` helper to strip stories/content from Epic for the list endpoint
- 404 responses return JSON `{ error: "..." }` for consistency
- Journal is parsed on-demand in story detail endpoint (not cached with story)
- Tests use random ports (30000-50000) to avoid conflicts in parallel test runs
- Dashboard tests now spawn actual server process and wait for startup message

**Next steps:**
- t4: Implement file watching with Chokidar (watcher.ts)

## Session: 2026-01-27T00:42:00Z

### Task: t4 - File Watching with Chokidar

**What was done:**
- Created `packages/cli/src/server/watcher.ts` with complete file watching logic:
  - TypeScript interfaces: `WatcherEventType`, `WatcherEvent`, `SagaWatcher`
  - `createSagaWatcher(sagaRoot)` - creates chokidar watcher for .saga/ directory
  - Event types: `epic:added`, `epic:changed`, `epic:removed`, `story:added`, `story:changed`, `story:removed`
  - `parseFilePath()` helper to extract epic/story slugs from file paths
  - `createDebouncer()` helper for 100ms event debouncing
- Created comprehensive test suite in `packages/cli/src/server/__tests__/watcher.test.ts` with 14 tests covering:
  - Watcher creation and basic functionality
  - Story change detection (story.md modification, journal.md creation)
  - Epic change detection (epic.md modification)
  - New epic/story addition detection
  - Debouncing rapid changes into single events
  - File filtering (only .md files)
  - Archive story watching with `archived: true` flag
  - Error handling for non-existent directories
  - Watcher close functionality

**Decisions:**
- Used `usePolling: true` with 100ms interval for reliable cross-platform behavior (FSEvents issues in temp directories on macOS)
- Watch entire `.saga` directory rather than separate epics/archive paths
- 100ms debounce to batch rapid file changes
- journal.md changes emit `story:changed` (not `story:added`) since it's a change to the story content
- story.md add/unlink emit `story:added`/`story:removed`, changes emit `story:changed`
- Watcher sets `ready` flag only after chokidar's `ready` event to prevent premature event processing
- Events are forwarded through EventEmitter to allow user listeners to be added after watcher creation

**Next steps:**
- t5: Implement WebSocket server for real-time updates (websocket.ts)
