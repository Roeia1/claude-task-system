# SAGA CLI & Dashboard

## Overview

A unified CLI package (`@saga/cli`) that provides both command-line tools and a web dashboard for the SAGA system. The CLI consolidates core SAGA operations (`init`, `implement`) while the dashboard provides visualization of epics, stories, statuses, and the ability to trigger implementations directly from the browser.

## Goals

1. **Unified CLI**: Single `saga` command for all SAGA operations (`init`, `implement`, `dashboard`)
2. **Visual System Overview**: Provide a clear, intuitive visualization of all epics and their associated stories
3. **Real-time Status Display**: Show current status of stories (ready, in_progress, blocked, completed) with live updates
4. **Journal Browser**: Enable inline viewing and navigation of journal.md content for any story
5. **Command Integration**: Support triggering `/implement` directly from the dashboard UI
6. **Progress Tracking**: Display visual progress indicators, task completion statistics, and epic-level summaries

## Success Metrics

- CLI commands (`saga init`, `saga implement`) work from any subdirectory of a SAGA project
- Dashboard loads and displays all epics/stories within 2 seconds
- Live updates reflect file changes within 1 second
- Users can navigate from epic overview to story details in 2 clicks or less

## Scope

### In Scope

**CLI Commands:**
- `saga init` - Initialize .saga/ directory structure (runs init_structure.py)
- `saga implement <story-slug>` - Run story implementation (runs implement.py)
- `saga dashboard` - Start the dashboard server

**Script Migration:**
- Move `implement.py` and `init_structure.py` from plugin to CLI package
- Update `/init` and `/implement` plugin skills to call CLI commands instead of scripts directly

**Dashboard:**
- Local HTTP server serving the dashboard UI
- Epic list view with story counts and status summaries
- Story detail view with tasks and journal
- Real-time file watching with WebSocket updates
- Command execution panel for /implement with streaming output
- Progress visualization (progress bars, completion percentages)
- Archived stories toggle (filtered view)

**Package:**
- Standalone npm package: `npx @saga/cli` or global install

### Out of Scope

- Multi-project support (single .saga directory per server instance)
- User authentication or authorization (local-only access assumed)
- Database persistence (reads directly from filesystem)
- Story or epic editing through the UI (read-only + command execution)
- Mobile-optimized responsive design (desktop-first)
- Deployment/hosting capabilities (local development only)

## Non-Functional Requirements

- **Performance**: Initial page load under 2 seconds, updates under 1 second
- **Reliability**: Graceful handling of missing/malformed files
- **Usability**: Intuitive navigation, minimal learning curve
- **Portability**: Works on macOS, Linux, and Windows (Node.js runtime)

## Technical Approach

The dashboard follows a client-server architecture:

1. **Backend (Node.js + Express)**:
   - Serves static React build and API endpoints
   - Watches `.saga/` directory for file changes using chokidar
   - Provides REST API for reading epics, stories, journals
   - WebSocket server for pushing real-time updates
   - Spawns SAGA commands and streams output

2. **Frontend (React)**:
   - Single-page application with React Router
   - State management with XState
   - WebSocket client for live updates
   - Markdown rendering for journal/story content
   - Toast notifications for errors
   - Clean, minimal UI with status indicators

3. **File System Integration**:
   - Parses `.saga/epics/` structure on startup
   - Reads story/task status from story.md frontmatter
   - Parses journal.md for session logs and blockers

4. **Command Execution**:
   - Dashboard calls `saga implement` CLI (same package)
   - Streams command output in real-time via WebSocket

5. **Build & Packaging**:
   - Frontend: Vite builds React app to static files
   - Backend/CLI: esbuild bundles TypeScript to single JS files
   - All assets bundled in npm package, no runtime compilation

## Key Decisions

### Server Framework: Express.js

- **Choice**: Express.js for the backend server
- **Rationale**: Lightweight, well-documented, excellent ecosystem for file watching and WebSockets
- **Alternatives Considered**: Fastify (faster but less ecosystem), Koa (similar but less popular)

### Frontend Framework: React with Vite

- **Choice**: React 18+ with Vite for build tooling
- **Rationale**: Fast development experience, excellent markdown rendering libraries, familiar to most developers
- **Alternatives Considered**: Vue (good but less common), vanilla JS (more work for interactivity)

### Real-time Updates: WebSockets via ws

- **Choice**: Native WebSocket with `ws` library
- **Rationale**: Simple, reliable, no external dependencies like Socket.io
- **Alternatives Considered**: Socket.io (overkill), Server-Sent Events (one-directional)

### File Watching: Chokidar

- **Choice**: Chokidar for filesystem watching
- **Rationale**: Battle-tested, cross-platform, handles edge cases well
- **Alternatives Considered**: Native fs.watch (inconsistent across platforms)

### UI Components: shadcn/ui

- **Choice**: shadcn/ui with custom dark theme
- **Rationale**: Accessible, composable components that we own (copied into project, not a dependency). Easy to customize with Tailwind.
- **Alternatives Considered**: Radix primitives only (more work), Material UI (heavier, opinionated), Chakra UI (dependency-based)

### Package Distribution: Unified CLI

- **Choice**: Standalone npm package `@saga/cli`
- **Commands**: `saga init`, `saga implement <slug>`, `saga dashboard`
- **Rationale**: Single package for all SAGA CLI operations, consistent interface
- **Location**: `packages/cli/` in monorepo

### Default Port: 3847

- **Choice**: Port 3847 ("SAGA" on phone keypad)
- **Rationale**: Memorable, low collision risk with common ports

### Command Output: Real-time Streaming

- **Choice**: Stream command output via WebSocket as it executes
- **Rationale**: `/implement` can run for extended periods; users need feedback

### Archived Stories: Filtered View

- **Choice**: Toggle filter on main story list to show/hide archived
- **Rationale**: Keeps UI simple, one list with optional visibility

### Command Execution: Internal CLI

- **Choice**: Dashboard calls `saga implement` from the same package
- **Rationale**: Unified package, no external dependency for /implement

### Script Location: CLI Package

- **Choice**: Move `implement.py` and `init_structure.py` from plugin to `@saga/cli`
- **Rationale**: CLI is self-contained, knows exact script paths
- **Plugin Impact**: Only `/init` and `/implement` skills change to call CLI commands

### Status Source: Frontmatter

- **Choice**: Read status from story.md YAML frontmatter
- **Rationale**: Single source of truth, no derived state complexity

### State Management: XState

- **Choice**: XState for frontend state management
- **Rationale**: Excellent for complex async flows (WebSocket, command execution)

### CLI Project Discovery

- **Choice**: Walk up from CWD to find `.saga/`, with `--path` override
- **Rationale**: Intuitive behavior (like git), flexible when needed

### CLI Options

- **Choice**: Minimal flags: `--path <dir>` and `--port <number>`
- **Rationale**: Simple interface, no auto-open browser

### Command Working Directory

- **Choice**: Run `saga implement` from project root
- **Rationale**: CLI handles worktree navigation internally via implement.py

### Command Cancellation

- **Choice**: Kill process via SIGTERM when user stops command
- **Rationale**: Clean termination, allows graceful shutdown

### Concurrent Commands

- **Choice**: Multiple commands can run simultaneously (one per story)
- **Rationale**: Flexibility for parallel story implementation

### Frontend Routes

- **Choice**: `/` (epic list), `/epic/:slug`, `/epic/:epicSlug/story/:storySlug`
- **Rationale**: Clear hierarchy, matches data model

### Empty States

- **Choice**: Simple text messages ("No epics found. Run `/create-epic`...")
- **Rationale**: Minimal UI, actionable guidance

### Error Handling

- **Choice**: Toast notifications for errors
- **Rationale**: Non-blocking, temporary, consistent UX

### Journal Parsing

- **Choice**: Parse by headers (`## Session:`, `## Blocker:`, `## Resolution:`)
- **Rationale**: Enables collapsible sections and filtering by type

### Progress Calculation

- **Choice**: Simple count-based (completed/total at each level)
- **Rationale**: Easy to understand, straightforward implementation

### Build Tooling: esbuild

- **Choice**: esbuild for backend/CLI bundling, Vite for frontend
- **Rationale**: esbuild is stable (38k+ stars), fast, actively maintained. Vite handles frontend build internally.
- **Alternatives Considered**: tsup (unmaintained), tsdown (too new), Parcel (overkill for CLI)

### Package Structure

- **Choice**: Pre-built assets bundled in npm package, scripts included
- **Structure**:
  ```
  @saga/cli/
  ├── package.json       # bin: { "saga": "./dist/cli.js" }
  ├── dist/
  │   ├── cli.js         # Entry point (init, implement, dashboard)
  │   ├── server/        # Compiled Express server
  │   └── client/        # Built React app (static files)
  └── scripts/
      ├── init_structure.py   # Moved from plugin
      └── implement.py        # Moved from plugin (orchestrates workers)
  ```
- **Rationale**: No runtime compilation, scripts bundled with CLI, plugin just calls CLI commands

## Data Models

### Epic Summary

```typescript
interface EpicSummary {
  slug: string;
  title: string;
  storyCounts: {
    total: number;
    ready: number;
    inProgress: number;
    blocked: number;
    completed: number;
  };
  path: string;
}
```

### Epic Detail

```typescript
interface Epic {
  slug: string;
  title: string;
  content: string;          // Raw markdown from epic.md
  storyCounts: StoryCounts;
  stories: StoryDetail[];
  path: string;
}
```

### Story Detail

```typescript
interface StoryDetail {
  slug: string;
  epicSlug: string;
  title: string;
  status: 'ready' | 'in_progress' | 'blocked' | 'completed';
  tasks: Task[];
  journal?: JournalEntry[];
  paths: {
    storyMd: string;
    journalMd?: string;
    worktree?: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface JournalEntry {
  timestamp: string;
  type: 'session' | 'blocker' | 'resolution';
  content: string;
}
```

## Interface Contracts

### REST API Endpoints

#### GET /api/epics

- **Description**: List all epics with summary statistics
- **Input**: None
- **Output**: `EpicSummary[]`

#### GET /api/epics/:slug

- **Description**: Get detailed epic information including full story list
- **Input**: `slug` path parameter
- **Output**: `Epic` with nested `StoryDetail[]`

#### GET /api/stories/:epicSlug/:storySlug

- **Description**: Get full story details including parsed journal
- **Input**: `epicSlug`, `storySlug` path parameters
- **Output**: `StoryDetail`

#### POST /api/commands/implement

- **Description**: Trigger `saga implement` for a story
- **Input**: `{ epicSlug: string, storySlug: string }`
- **Output**: `{ success: boolean, output: string }`

#### POST /api/commands/stop

- **Description**: Stop a running command for a story
- **Input**: `{ epicSlug: string, storySlug: string }`
- **Output**: `{ success: boolean }`

### WebSocket Events

#### Server -> Client

- `epics:updated` - Epic list changed
- `story:updated` - Single story status/content changed
- `command:output` - Streaming output from running command
- `command:stopped` - Command was terminated

#### Client -> Server

- `subscribe:story` - Watch specific story for changes
- `unsubscribe:story` - Stop watching story

## Tech Stack

- **Runtime**: Node.js 18+
- **Backend Framework**: Express.js
- **WebSocket**: ws
- **File Watching**: chokidar
- **Frontend**: React 18+ with TypeScript
- **Frontend Build**: Vite
- **Backend/CLI Build**: esbuild
- **State Management**: XState
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Markdown**: react-markdown with remark-gfm
- **YAML Parsing**: gray-matter (frontmatter parsing)

## Design System

### Color Palette

Dark theme with purple/blue tones (hue 264):

```css
:root {
  --bg-dark: oklch(0.1 0.025 264);
  --bg: oklch(0.15 0.025 264);
  --bg-light: oklch(0.2 0.025 264);
  --text: oklch(0.96 0.05 264);
  --text-muted: oklch(0.76 0.05 264);
  --highlight: oklch(0.5 0.05 264);
  --border: oklch(0.4 0.05 264);
  --border-muted: oklch(0.3 0.05 264);
  --primary: oklch(0.76 0.1 264);
  --secondary: oklch(0.76 0.1 84);
  --danger: oklch(0.7 0.05 30);
  --warning: oklch(0.7 0.05 100);
  --success: oklch(0.7 0.05 160);
  --info: oklch(0.7 0.05 260);
}
```

### Color Reference

| Variable | Hue | Color |
|----------|-----|-------|
| `--primary` | 264 | Blue/purple |
| `--secondary` | 84 | Yellow/chartreuse |
| `--danger` | 30 | Red/orange |
| `--warning` | 100 | Yellow/green |
| `--success` | 160 | Green/teal |
| `--info` | 260 | Blue |

### Status Colors

| Status | Color Variable | Usage |
|--------|---------------|-------|
| Ready | `--text-muted` | Ready to be implemented |
| In Progress | `--primary` | Active work (blue) |
| Blocked | `--danger` | Needs attention (red) |
| Completed | `--success` | Done (green) |

### Component Guidelines

- Use shadcn/ui components as base, customize with color palette
- Cards for epics and stories with subtle borders (`--border-muted`)
- Progress bars use status colors
- Monospace font for code/journal content
