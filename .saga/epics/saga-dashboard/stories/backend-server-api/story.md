---
id: backend-server-api
title: Backend Server with API and Real-time Updates
status: ready
epic: saga-dashboard
tasks:
  - id: t1
    title: Project Setup and Express Server Foundation
    status: pending
  - id: t2
    title: File System Parsing Module
    status: pending
  - id: t3
    title: REST API Endpoints
    status: pending
  - id: t4
    title: File Watching with Chokidar
    status: pending
  - id: t5
    title: WebSocket Server for Real-time Updates
    status: pending
  - id: t6
    title: Integration Tests and Error Handling
    status: pending
---

## Context

This story implements the backend server for the SAGA Dashboard, a web-based visualization tool for monitoring epics and stories in the SAGA development workflow system. The server provides REST API endpoints for reading epic and story data from the filesystem, watches for file changes using chokidar, and broadcasts real-time updates to connected clients via WebSocket.

The backend serves as the data layer between the `.saga/` directory structure and the React frontend. It parses YAML frontmatter from story.md files to extract status information, reads journal.md files for session logs and blocker information, and aggregates statistics at the epic level. When files change on disk (e.g., when a worker updates task status), the server detects these changes and pushes updates to all connected dashboard clients within 1 second.

This is part of the `@saga/cli` npm package. The server is started via the `saga dashboard` CLI command and runs on port 3847 by default. The frontend (built separately) will be served as static files by this Express server.

## Scope Boundaries

**In scope:**
- Express.js server setup with TypeScript
- REST API endpoints: `GET /api/epics`, `GET /api/epics/:slug`, `GET /api/stories/:epicSlug/:storySlug`
- Parsing `.saga/epics/` directory structure
- Parsing YAML frontmatter from story.md using gray-matter
- Parsing journal.md files into structured session/blocker/resolution entries
- Chokidar file watching on `.saga/` directory
- WebSocket server using `ws` library for real-time updates
- WebSocket events: `epics:updated`, `story:updated` (server->client), `subscribe:story`, `unsubscribe:story` (client->server)
- Graceful error handling for missing/malformed files
- Integration with `saga dashboard` CLI command

**Out of scope:**
- React frontend implementation (covered by "React Dashboard with Full UI" story)
- CLI package structure, argument parsing, project discovery (covered by "CLI Package with Commands and Script Migration" story)
- Static file serving configuration (frontend build output will be added after frontend story)
- Database persistence (reads directly from filesystem)
- Authentication or authorization
- Story/epic editing (read-only API)
- Multi-project support
- Epic-level exclusions: mobile responsive design, deployment/hosting, command execution from dashboard

## Interface

### Inputs

- `.saga/epics/<epic-slug>/epic.md` - Epic definition files (markdown with title)
- `.saga/epics/<epic-slug>/stories/<story-slug>/story.md` - Story files with YAML frontmatter containing status, tasks
- `.saga/epics/<epic-slug>/stories/<story-slug>/journal.md` - Journal files (optional) with session logs, blockers, resolutions
- `.saga/archive/<epic-slug>/<story-slug>/` - Archived story files (same structure)
- CLI provides: `sagaRoot` (path to project root with `.saga/` directory), `port` (server port, default 3847)

### Outputs

- HTTP server running on specified port
- REST API returning JSON responses matching data models from epic:
  - `EpicSummary[]` for epic list
  - `Epic` with nested `StoryDetail[]` for epic detail
  - `StoryDetail` with parsed journal for story detail
- WebSocket server for real-time update broadcasts
- Console log messages for server startup and errors

## Acceptance Criteria

- [ ] Express server starts and listens on configurable port (default 3847)
- [ ] `GET /api/epics` returns list of all epics with story counts and status summaries
- [ ] `GET /api/epics/:slug` returns epic detail with full story list
- [ ] `GET /api/stories/:epicSlug/:storySlug` returns story detail with parsed journal
- [ ] Server handles missing files gracefully (returns 404 with error message)
- [ ] Server handles malformed YAML frontmatter gracefully (logs warning, uses defaults)
- [ ] Chokidar watches `.saga/` directory and detects file changes
- [ ] WebSocket broadcasts `epics:updated` when epic structure changes
- [ ] WebSocket broadcasts `story:updated` when specific story files change
- [ ] File change updates reach connected clients within 1 second
- [ ] Journal.md is parsed into structured entries by type (session, blocker, resolution)
- [ ] Archived stories are included in API responses (with archived flag)
- [ ] Server exports startServer function that CLI command can call

## Tasks

### t1: Project Setup and Express Server Foundation

**Guidance:**
- Create server source files in `packages/cli/src/server/`
- Set up TypeScript configuration extending from root tsconfig if exists
- Install dependencies: express, ws, chokidar, gray-matter, and their type definitions
- Create main server entry point that exports `startServer(config: { sagaRoot: string; port: number })`
- Set up basic Express app with JSON middleware and CORS for local development
- Add health check endpoint at `GET /api/health`

**References:**
- Epic tech stack: Express.js, ws, chokidar, gray-matter
- Default port: 3847 (from epic)
- Package structure from epic: `packages/cli/src/server/`

**Avoid:**
- Do not add static file serving yet (frontend story will handle that)
- Do not implement authentication (out of scope per epic)
- Do not use Socket.io (epic specifies ws library)

**Done when:**
- Server starts and logs "SAGA Dashboard server running on http://localhost:3847"
- `GET /api/health` returns `{ status: "ok" }`
- TypeScript compiles without errors
- `startServer` function is exported and can be called with config object

### t2: File System Parsing Module

**Guidance:**
- Create `packages/cli/src/server/parser.ts` for all filesystem parsing logic
- Use gray-matter to parse YAML frontmatter from story.md files
- Extract title from epic.md (first `# ` heading)
- Parse journal.md by headers: `## Session:`, `## Blocker:`, `## Resolution:`
- Create typed interfaces matching epic data models: `EpicSummary`, `Epic`, `StoryDetail`, `Task`, `JournalEntry`
- Handle missing files by returning null/undefined rather than throwing
- Handle malformed YAML by logging warning and using sensible defaults (status: 'ready', empty tasks array)

**References:**
- Data models from epic: `EpicSummary`, `Epic`, `StoryDetail`, `Task`, `JournalEntry` interfaces
- Journal parsing approach from epic: "Parse by headers (`## Session:`, `## Blocker:`, `## Resolution:`)"
- Story frontmatter structure from CLAUDE.md

**Avoid:**
- Do not parse files synchronously in request handlers (parse on startup and cache)
- Do not throw errors for missing optional files (journal.md is optional)
- Do not read files outside `.saga/` directory

**Done when:**
- `parseStory(storyPath)` returns `StoryDetail` with tasks from frontmatter
- `parseEpic(epicPath)` returns `Epic` with title and nested stories
- `parseJournal(journalPath)` returns `JournalEntry[]` sorted by timestamp
- `scanSagaDirectory(sagaRoot)` returns complete data structure for all epics/stories
- All functions handle missing/malformed files gracefully

### t3: REST API Endpoints

**Guidance:**
- Create `packages/cli/src/server/routes.ts` for Express route handlers
- Implement three endpoints matching epic interface contracts
- Use parsed data from parser module (cache results, refresh on file changes)
- Return proper HTTP status codes: 200 for success, 404 for not found, 500 for server errors
- Include archived stories from `.saga/archive/` directory with `archived: true` flag
- Format responses to match epic data model interfaces exactly

**References:**
- Epic REST API endpoints section defines exact routes and response shapes
- `GET /api/epics` returns `EpicSummary[]`
- `GET /api/epics/:slug` returns `Epic` with full story list
- `GET /api/stories/:epicSlug/:storySlug` returns `StoryDetail`

**Avoid:**
- Do not add endpoints not specified in epic (keep API minimal)
- Do not return file paths that expose absolute system paths (use relative paths from saga root)
- Do not block on filesystem reads during requests (use cached data)

**Done when:**
- `GET /api/epics` returns array of epic summaries with accurate story counts
- `GET /api/epics/:slug` returns epic detail or 404 if not found
- `GET /api/stories/:epicSlug/:storySlug` returns story detail with parsed journal or 404
- All responses match TypeScript interfaces from parser module
- Archived stories appear in responses with `archived: true`

### t4: File Watching with Chokidar

**Guidance:**
- Create `packages/cli/src/server/watcher.ts` for file watching logic
- Watch `.saga/epics/` and `.saga/archive/` directories
- Filter to only watch `.md` files (epic.md, story.md, journal.md)
- Debounce rapid changes (use 100ms debounce to batch updates)
- Emit events that identify what changed: epic added/removed, story added/removed/updated
- Re-parse affected files when changes detected and update cache
- Handle watch errors gracefully (log and continue)

**References:**
- Epic specifies chokidar for file watching
- Performance requirement: "updates under 1 second" from epic

**Avoid:**
- Do not watch entire project directory (only `.saga/`)
- Do not process changes synchronously (debounce and batch)
- Do not crash on file permission errors

**Done when:**
- Watcher starts successfully and logs watched directories
- File changes trigger re-parse of affected epic/story
- Watcher emits typed events: `EpicChanged`, `StoryChanged`
- Changes are debounced (multiple rapid changes = one update)
- Watcher recovers from transient errors without crashing

### t5: WebSocket Server for Real-time Updates

**Guidance:**
- Create `packages/cli/src/server/websocket.ts` for WebSocket handling
- Attach ws server to existing HTTP server (share port with Express)
- Implement server->client events: `epics:updated`, `story:updated`
- Implement client->server events: `subscribe:story`, `unsubscribe:story`
- Track subscriptions per client for targeted story updates
- Connect watcher events to WebSocket broadcasts
- Send full updated data in events (not just change notifications)

**References:**
- Epic WebSocket events section defines event names and directions
- Epic specifies ws library (not Socket.io)
- `story:updated` should include full `StoryDetail` object

**Avoid:**
- Do not use Socket.io (epic explicitly chose ws for simplicity)
- Do not broadcast every file change (aggregate and debounce)
- Do not keep stale connections (implement ping/pong heartbeat)

**Done when:**
- WebSocket server accepts connections on same port as HTTP
- `epics:updated` broadcasts to all clients when epic list changes
- `story:updated` broadcasts to subscribed clients when story changes
- Clients can subscribe/unsubscribe to specific stories
- Dead connections are cleaned up via heartbeat mechanism

### t6: Integration Tests and Error Handling

**Guidance:**
- Create `packages/cli/src/server/__tests__/` directory for tests
- Test API endpoints with supertest against running server
- Test file parsing with fixture files (valid and malformed)
- Test WebSocket events with ws client
- Add comprehensive error handling for all edge cases
- Ensure server logs are informative but not verbose in normal operation

**References:**
- Test fixtures should include: valid epic/story, missing journal, malformed frontmatter
- Epic non-functional requirement: "Graceful handling of missing/malformed files"

**Avoid:**
- Do not skip error path testing
- Do not leave unhandled promise rejections
- Do not expose stack traces in API responses (log internally, return generic message)

**Done when:**
- API endpoint tests pass with valid requests
- API endpoint tests verify 404 for missing resources
- Parser tests verify graceful handling of malformed files
- WebSocket tests verify event delivery
- Server handles and logs errors without crashing
- All tests run with `npm test` command
