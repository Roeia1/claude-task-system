# Dashboard Package (`@saga-ai/dashboard`)

Comprehensive documentation of the dashboard package — a standalone CLI and web application for monitoring SAGA epics, stories, tasks, and worker sessions.

## Overview

The dashboard is published as `@saga-ai/dashboard` on npm. It provides:

1. **Web Dashboard** — A React SPA served by an Express server, showing epics, stories, tasks, and journal entries with real-time updates via WebSocket.
2. **Session Management CLI** — Commands to list, inspect, and stream tmux session output.
3. **REST API** — Endpoints for reading SAGA data from the filesystem.
4. **Real-time Updates** — File watching (chokidar) + WebSocket push for live dashboard updates.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| CLI Framework | Commander.js |
| Server | Express 5, Node.js HTTP |
| WebSocket | `ws` library |
| File Watching | chokidar v5 |
| Frontend Framework | React 19 |
| State Management | XState v5 (state machines) |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI primitives (Collapsible, Progress, Tabs, Toast, Slot) |
| Icons | Lucide React |
| Markdown Rendering | react-markdown + remark-gfm |
| Build (CLI) | esbuild (CJS bundle) |
| Build (Client) | Vite 7 |
| Testing | Vitest, Playwright, Storybook, Testing Library |
| Linting | Biome |

## File Structure

```
packages/dashboard/
├── package.json              # npm package config, bin entry, scripts
├── CLAUDE.md                 # Developer quick reference
├── tsconfig.json             # TypeScript config
├── vitest.config.ts          # Vitest configuration
├── src/
│   ├── cli.ts                # Entry point — Commander.js program
│   ├── cli.test.ts           # CLI tests
│   ├── commands/
│   │   ├── dashboard.ts      # `saga start` command handler
│   │   ├── dashboard.test.ts
│   │   └── sessions/
│   │       ├── index.ts      # `saga sessions list|status|logs` handlers
│   │       └── index.test.ts
│   ├── lib/
│   │   ├── sessions.ts       # Tmux session CRUD operations
│   │   ├── sessions.test.ts
│   │   ├── session-polling.ts # Periodic session discovery polling
│   │   ├── session-polling.test.ts
│   │   ├── log-stream-manager.ts  # JSONL log file streaming
│   │   └── log-stream-manager.test.ts
│   ├── server/
│   │   ├── index.ts          # Express app + HTTP server factory
│   │   ├── routes.ts         # REST API: /api/epics, /api/stories
│   │   ├── session-routes.ts # REST API: /api/sessions
│   │   ├── parser.ts         # Filesystem parser (reads .saga/ JSON files)
│   │   ├── watcher.ts        # chokidar file watcher for .saga/
│   │   ├── websocket.ts      # WebSocket server for real-time push
│   │   └── __tests__/        # Server unit + integration tests
│   ├── utils/
│   │   └── project-discovery.ts  # Walk-up discovery of .saga/ directory
│   └── client/               # React SPA (Vite project)
│       ├── index.html        # HTML entry point
│       ├── vite.config.ts    # Vite build config
│       ├── tsconfig.json     # Client-specific TypeScript config
│       ├── playwright.config.ts      # Integration test config
│       ├── playwright.e2e.config.ts  # E2E test config
│       ├── components.json   # shadcn/ui config
│       ├── src/
│       │   ├── main.tsx      # React entry point
│       │   ├── App.tsx       # Root app component
│       │   ├── router.tsx    # React Router routes
│       │   ├── index.css     # Tailwind CSS entry
│       │   ├── types/
│       │   │   └── dashboard.ts  # TypeScript interfaces for API data
│       │   ├── machines/
│       │   │   └── dashboardMachine.ts  # XState state machine
│       │   ├── context/
│       │   │   └── dashboard-context.tsx # React context + hooks
│       │   ├── pages/
│       │   │   ├── EpicList.tsx      # Epic list page (/)
│       │   │   ├── EpicDetail.tsx    # Epic detail page (/epic/:epicId)
│       │   │   └── StoryDetail.tsx   # Story detail page (/story/:storyId)
│       │   ├── components/
│       │   │   ├── Layout.tsx        # App shell with header + breadcrumbs
│       │   │   ├── Breadcrumb.tsx    # Navigation breadcrumbs
│       │   │   ├── EpicContent.tsx   # Markdown renderer for epic content
│       │   │   ├── StatusBadge.tsx   # Status indicator badges
│       │   │   ├── LogViewer.tsx     # Virtualized log viewer
│       │   │   ├── SessionsPanel.tsx # Session list with log viewing
│       │   │   ├── active-sessions.tsx # Active sessions indicator
│       │   │   ├── session-card.tsx  # Individual session card
│       │   │   └── ui/              # shadcn/ui primitives
│       │   │       ├── badge.tsx, button.tsx, card.tsx
│       │   │       ├── collapsible.tsx, progress.tsx, tabs.tsx
│       │   │       └── toast.tsx, toaster.tsx
│       │   ├── hooks/
│       │   │   ├── use-toast.ts          # Toast notification hook
│       │   │   └── use-dashboard-toasts.ts # Dashboard-specific toasts
│       │   ├── lib/
│       │   │   ├── utils.ts          # Class name utility (cn)
│       │   │   ├── fetch-utils.ts    # API fetch helpers
│       │   │   └── toast-utils.ts    # Toast message helpers
│       │   └── test-utils/           # Test factories, wrappers
│       ├── tests/
│       │   ├── fixtures.ts           # Test data fixtures
│       │   ├── integration/          # Playwright component tests
│       │   └── utils/mock-api.ts     # API mocking utilities
│       └── e2e/                      # End-to-end Playwright tests
│           ├── happy-paths.spec.ts
│           ├── error-paths.spec.ts
│           └── fixtures/             # .saga/ fixture data
```

## CLI Interface

The package exposes a `saga` binary via `package.json#bin`:

```bash
# Start the dashboard server (default port 3847)
saga start [--port <n>]

# Global option: override project discovery
saga --path /path/to/project start

# Session management
saga sessions list           # List all SAGA tmux sessions (JSON output)
saga sessions status <name>  # Check if a session is running (JSON output)
saga sessions logs <name>    # Stream session output (tail -f, raw output)
```

### Project Discovery

The `resolveProjectPath()` function (in `utils/project-discovery.ts`) walks up from the current working directory looking for a `.saga/` directory, similar to how git discovers `.git/`. The `--path` flag overrides auto-discovery.

## Server Architecture

### Express Server (`server/index.ts`)

The `startServer(config)` factory creates and returns a `ServerInstance`:

```
ServerConfig { sagaRoot: string, port?: number }
    → createApp(sagaRoot)       → Express app with middleware + routes
    → createWebSocketServer()   → WebSocket server attached to HTTP server
    → ServerInstance { app, httpServer, wsServer, port, close() }
```

Key middleware:
- JSON body parsing
- CORS headers (permissive for local development)
- Health check: `GET /api/health`
- API router: `/api/*`
- Static file serving: built client from `dist/client/`
- SPA fallback: serves `index.html` for all unmatched routes

### REST API Endpoints (`server/routes.ts`, `server/session-routes.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/health` | GET | Health check (`{ status: "ok" }`) |
| `GET /api/epics` | GET | List all epics as `EpicSummary[]` |
| `GET /api/epics/:epicId` | GET | Full epic with stories (`ParsedEpic`) |
| `GET /api/stories` | GET | List standalone stories (no epic) |
| `GET /api/stories/:storyId` | GET | Story detail with parsed journal |
| `GET /api/sessions` | GET | List sessions (filter: `?storyId=`, `?status=`) |
| `GET /api/sessions/:sessionName` | GET | Single session by name |

### Filesystem Parser (`server/parser.ts`)

The parser reads SAGA data from the `.saga/` directory using `@saga-ai/utils` functions:

```
scanSagaDirectory(sagaRoot)
  ├── scanStories(sagaRoot)    → ScannedStory[] (from @saga-ai/utils)
  ├── listEpics(sagaRoot)      → Epic[] (from @saga-ai/utils)
  ├── toStoryDetail(story)     → StoryDetail (convert + derive status)
  ├── Group stories by epic
  └── buildEpic(epic, stories) → ParsedEpic (with derived status + counts)
```

Key transformations:
- **Status derivation**: Story status derived from task statuses via `deriveStoryStatus()`. Epic status derived from story statuses via `deriveEpicStatus()`.
- **Status format conversion**: Internal `in_progress` (snake_case) → API `inProgress` (camelCase) via `toApiStatus()`.
- **Worktree awareness**: `parseStory()` checks worktree paths first for latest execution state, then falls back to master copy.
- **Journal parsing**: `parseJournal()` splits `journal.md` by `## ` headers, categorizing entries as `session`, `blocker`, or `resolution`.

### Data Model (API Types)

```
EpicSummary
  ├── id, title, description
  ├── status: 'pending' | 'inProgress' | 'completed'
  └── storyCounts: { total, pending, inProgress, completed }

ParsedEpic extends EpicSummary
  ├── children: EpicChild[]     (dependency graph)
  └── stories: StoryDetail[]

StoryDetail
  ├── id, title, description, epic?
  ├── status, tasks: Task[]
  ├── journal?: JournalEntry[]
  ├── guidance?, doneWhen?, avoid?
  ├── branch?, pr?, worktree?
  └── journalPath?

Task
  ├── id, subject, description
  ├── status, blockedBy: string[]
  ├── guidance?, doneWhen?, activeForm?

JournalEntry
  ├── timestamp, type: 'session' | 'blocker' | 'resolution'
  ├── title, content
```

### File Watcher (`server/watcher.ts`)

The `createSagaWatcher()` function watches `.saga/stories/` and `.saga/epics/` using chokidar:

**Watched paths and events:**
| Path Pattern | Event |
|-------------|-------|
| `.saga/epics/<epic-id>.json` | `epic:added` / `epic:changed` / `epic:removed` |
| `.saga/stories/<story-id>/story.json` | `story:added` / `story:changed` / `story:removed` |
| `.saga/stories/<story-id>/<task-id>.json` | `story:changed` |
| `.saga/stories/<story-id>/journal.md` | `story:changed` |

**Implementation details:**
- Debounces events by key (`story:<id>` or `epic:<id>`) with 100ms delay
- Supports polling mode via `SAGA_USE_POLLING=1` env var (useful for tests)
- Parses file paths via `parseFilePath()` to extract epic/story IDs
- Only emits after watcher is `ready` and not `closed`

### WebSocket Server (`server/websocket.ts`)

Provides real-time push to connected dashboard clients:

**Server → Client events:**
| Event | Data | When |
|-------|------|------|
| `epics:updated` | `EpicSummary[]` | Any epic/story file changes |
| `story:updated` | `StoryDetail` | Subscribed story changes |
| `sessions:updated` | `DetailedSessionInfo[]` | Session polling detects changes |
| `logs:data` | `{ sessionName, messages, isInitial, isComplete }` | Log file changes |
| `logs:error` | `{ sessionName, error }` | Log subscription errors |
| `pong` | null | Response to client ping |

**Client → Server events:**
| Event | Data | Action |
|-------|------|--------|
| `subscribe:story` | `{ storyId }` | Track story for updates |
| `unsubscribe:story` | `{ storyId }` | Stop tracking story |
| `subscribe:logs` | `{ sessionName }` | Start log streaming |
| `unsubscribe:logs` | `{ sessionName }` | Stop log streaming |
| `{ type: 'ping' }` | — | Heartbeat (responds with pong) |

**Connection management:**
- Heartbeat interval: 30 seconds (ping/pong to detect stale connections)
- Per-client state tracks subscribed stories and alive status
- Cleanup on disconnect removes from all subscription sets

## Session Management

### Tmux Sessions (`lib/sessions.ts`)

SAGA uses tmux for detached worker sessions:

**Session naming**: `saga-story-<storyId>-<timestamp>`
**Output files**: `/tmp/saga-sessions/<session-name>.jsonl`

**Core operations:**
| Function | Description |
|----------|-------------|
| `createSession(storyId, command)` | Create detached tmux session with output capture |
| `listSessions()` | List running SAGA sessions via `tmux ls` |
| `getSessionStatus(name)` | Check if session exists via `tmux has-session` |
| `streamLogs(name)` | Stream output file via `tail -f` |
| `killSession(name)` | Kill session via `tmux kill-session` |
| `parseSessionName(name)` | Extract storyId from session name |
| `buildSessionInfo(name, status)` | Build DetailedSessionInfo with timestamps and preview |

**Session creation flow:**
1. Validate storyId (slug format: `[a-z0-9-]`)
2. Check tmux availability (`which tmux`)
3. Create output directory `/tmp/saga-sessions/`
4. Write command to `.cmd` file (avoids shell interpretation)
5. Generate wrapper `.sh` script that uses `script` for output capture
6. Create detached tmux session running the wrapper script

**Output capture:** Uses the Unix `script` command to capture all terminal output to a JSONL file. Handles macOS vs Linux syntax differences (`script -qF` on Darwin, `script -q -c` on Linux).

### Session Polling (`lib/session-polling.ts`)

Polls for session changes every 3 seconds:

1. Lists running tmux sessions
2. Builds `DetailedSessionInfo` for each (with file timestamps and output preview)
3. Compares with previous state (session set changes + property changes)
4. Broadcasts `sessions:updated` only when changes detected
5. First poll always broadcasts to establish baseline

### Log Stream Manager (`lib/log-stream-manager.ts`)

Manages real-time JSONL log streaming to WebSocket clients:

**Features:**
- File watching with chokidar for immediate change detection
- Reference counting: watcher created on first subscriber, cleaned up when last unsubscribes
- Incremental delivery: tracks line count per session, only sends new lines
- Session completion: sends final lines with `isComplete: true` flag

**Flow:**
1. Client sends `subscribe:logs` → `subscribe(sessionName, ws)`
2. Manager reads full file, parses JSONL, sends as `isInitial: true`
3. Creates chokidar watcher on the output file
4. On file change: reads file, extracts lines beyond last known count, sends incremental
5. On session completion: sends remaining lines with `isComplete: true`, cleans up watcher
6. Client sends `unsubscribe:logs` → removes from subscription set

## Client Architecture

### React Application

The client is a Vite-built React SPA with the following architecture:

```
                    ┌─────────────────────────────┐
                    │     DashboardProvider        │
                    │  (XState Actor Context)      │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────┴──────────────────┐
                    │     BrowserRouter            │
                    │     └── Layout               │
                    │         ├── Header + Breadcrumb│
                    │         ├── Toaster          │
                    │         └── Outlet            │
                    │             ├── EpicList  (/) │
                    │             ├── EpicDetail    │
                    │             │    (/epic/:id)  │
                    │             └── StoryDetail   │
                    │                  (/story/:id) │
                    └──────────────────────────────┘
```

### State Machine (`machines/dashboardMachine.ts`)

XState v5 state machine managing WebSocket connection and data:

```
                    ┌──────┐
                    │ idle │ ←── CONNECT ──┐
                    └──┬───┘              │
                       │ CONNECT          │
                    ┌──▼───────┐          │
                    │  active  │          │
                    │  ├─loading│         │
                    │  └─connected│       │
                    └──┬───────┘          │
            WS_ERROR / │                  │
          WS_DISCONNECTED                 │
                    ┌──▼──────────┐       │
                    │ reconnecting│       │
                    │ (backoff)   │       │
                    └──┬───────┬──┘       │
             canRetry  │       │ maxRetries│
                    ┌──▼──┐ ┌─▼────┐     │
                    │active│ │error │─────┘
                    └─────┘ └──────┘
```

**Key features:**
- WebSocket actor (fromCallback) with heartbeat and message queuing
- Exponential backoff reconnection (1s, 2s, 4s... up to 30s, max 5 retries)
- Story subscription tracking (persisted across reconnections)
- Log data callback registry for streaming session output
- Data events handled in all states (REST API works independently of WebSocket)

### Context & Hooks (`context/dashboard-context.tsx`)

React context wrapping the XState actor provides:

| Hook | Purpose |
|------|---------|
| `useDashboard()` | All state + memoized actions (connect, disconnect, retry, setEpics, etc.) |
| `useDashboardState()` | State flags (isIdle, isLoading, isConnected, isReconnecting, isError) |
| `useDashboardActorRef()` | Direct actor ref for sending events |
| `useDashboardSelector()` | Optimized state selection |

### Pages

**EpicList (`/`):**
- Fetches `GET /api/epics` on mount
- Renders grid of EpicCards with progress bars and status badges
- Shows ActiveSessions component at the top
- Loading skeletons during fetch
- Empty state: "No epics found"

**EpicDetail (`/epic/:epicId`):**
- Fetches `GET /api/epics/:epicId` on mount
- Shows epic header with title and progress bar
- Renders epic description as markdown via EpicContent
- Lists stories sorted by status priority (inProgress > pending > completed)
- 404 and error states

**StoryDetail (`/story/:storyId`):**
- Fetches `GET /api/stories/:storyId` on mount
- Subscribes to WebSocket story updates when connected
- Tabbed UI with 4 tabs:
  - **Tasks**: Task list with status icons (CheckCircle, Circle), badges, and strikethrough for completed
  - **Story Content**: Markdown rendered description
  - **Journal**: Collapsible journal entries grouped by type (blockers, resolutions, sessions)
  - **Sessions**: SessionsPanel with session cards and log viewer
- Tab selection persisted in URL query param (`?tab=`)
- Blocker count badge on Journal tab

### Component Hierarchy (ASCII Art)

```
Layout
├── Header
│   ├── "SAGA Dashboard" title
│   └── Breadcrumb (route-aware navigation)
├── Toaster (toast notifications)
└── Outlet (page content)
    │
    ├── EpicList
    │   ├── ActiveSessions (running worker indicator)
    │   ├── EpicCardSkeleton (×3, loading state)
    │   └── EpicCard[]
    │       ├── CardTitle (epic title)
    │       ├── Progress (completion bar)
    │       └── StatusBadgeWithCount[] (pending/inProgress/completed)
    │
    ├── EpicDetail
    │   ├── HeaderSkeleton / EpicHeader
    │   │   ├── Title
    │   │   └── Progress bar
    │   ├── EpicContent (markdown renderer)
    │   └── StoriesList
    │       └── StoryCard[]
    │           ├── CardTitle, StatusBadge
    │           └── Task progress count
    │
    └── StoryDetail
        ├── HeaderSkeleton / StoryHeader
        │   ├── Breadcrumb (epic link → story)
        │   ├── Title, StatusBadge
        │   └── Task progress count
        └── Tabs
            ├── Tasks → TasksTabContent
            │   └── TaskItem[]
            │       ├── TaskStatusIcon (CheckCircle/Circle)
            │       ├── Subject text (strikethrough if completed)
            │       └── Status Badge
            ├── Content → ContentTabContent
            │   └── ReactMarkdown (with remark-gfm)
            ├── Journal → JournalTabContent
            │   ├── JournalSection[Blockers] (AlertCircle)
            │   ├── JournalSection[Resolutions] (CheckCircle)
            │   └── JournalSection[Sessions] (Circle)
            │       └── JournalEntryItem[]
            │           └── Collapsible Card
            └── Sessions → SessionsPanel
                └── SessionCard[]
                    └── LogViewer (virtualized)
```

## Build and Publish Process

### Build Pipeline

The build has two parallel tracks:

```
pnpm build
├── pnpm lint:fix          (Biome check --write)
├── pnpm build:cli         (esbuild → dist/cli.cjs)
└── pnpm build:client      (Vite build → dist/client/)
```

**CLI Bundle (`build:cli`):**
- esbuild bundles `src/cli.ts` → `dist/cli.cjs` (CommonJS format)
- Shebang banner: `#!/usr/bin/env node`
- Externals: `express`, `ws`, `chokidar`, `gray-matter`, `commander` (installed as runtime dependencies)
- All other code is bundled into the single CJS file

**Client Bundle (`build:client`):**
- Vite builds `src/client/` → `dist/client/`
- Manual chunks for optimal loading:
  - `vendor-react`: react, react-dom, react-router
  - `vendor-markdown`: react-markdown, remark-gfm
  - `vendor-xstate`: xstate, @xstate/react
  - `vendor-radix`: all Radix UI primitives
- Path alias: `@` → `src/client/src/`
- Dev proxy: `/api` → `http://localhost:3847`, `/ws` → `ws://localhost:3847`

### npm Publish

```bash
pnpm publish:npm
# = pnpm build && pnpm test && pnpm publish --access public
```

Published files: `dist/`, `README.md` (per `package.json#files`).

The binary `saga` maps to `dist/cli.cjs`.

### Test Commands

| Command | What it runs |
|---------|-------------|
| `pnpm test` | Build + vitest run + integration + e2e |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:integration` | Playwright component tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm test:storybook` | Storybook visual snapshot tests |

## Configuration

### Server Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `port` | 3847 | HTTP/WebSocket server port |
| `sagaRoot` | auto-discovered | Path to project root with `.saga/` |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SAGA_USE_POLLING` | `0` | Set to `1` to use polling mode for file watching (reliable for tests) |

### Client Configuration

- `components.json` — shadcn/ui component configuration
- `vite.config.ts` — Vite build configuration with Tailwind plugin, React plugin, path aliases, chunk splitting, and dev proxy
- `playwright.config.ts` — Component test config
- `playwright.e2e.config.ts` — E2E test config with fixture data

## Data Flow Diagram

```
Filesystem (.saga/)                Server                           Client (React SPA)
┌──────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────┐
│ .saga/epics/     │    │  parser.ts              │    │  REST API Fetching       │
│   *.json         │───▶│  scanSagaDirectory()    │◀───│  fetch('/api/epics')     │
│ .saga/stories/   │    │  parseStory()           │    │  fetch('/api/stories/x') │
│   */story.json   │    │  parseJournal()          │    └───────────┬──────────────┘
│   */task-id.json │    └─────────┬───────────────┘                │
│   */journal.md   │              │                                │
└──────┬───────────┘              │                     ┌──────────▼──────────────┐
       │                 ┌────────▼────────────┐        │  dashboardMachine       │
       │                 │  watcher.ts          │        │  (XState v5)            │
       │  chokidar       │  story:changed       │        │  Context:               │
       └────────────────▶│  epic:changed        │        │    epics, currentEpic,  │
                         └────────┬─────────────┘        │    currentStory,        │
                                  │                      │    sessions, error      │
                         ┌────────▼─────────────┐        └──────────▲──────────────┘
                         │  websocket.ts         │                   │
                         │  WebSocket push       │───────────────────┘
                         │  epics:updated        │    WebSocket messages
                         │  story:updated        │    (real-time updates)
                         └───────────────────────┘
                                  ▲
               ┌──────────────────┤
               │                  │
    ┌──────────┴──────────┐   ┌──┴─────────────────┐
    │ session-polling.ts  │   │ log-stream-manager  │
    │ tmux ls (3s poll)   │   │ chokidar watch      │
    │ sessions:updated    │   │ JSONL incremental   │
    └─────────────────────┘   │ logs:data           │
                              └─────────────────────┘
```
