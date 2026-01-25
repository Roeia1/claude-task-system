# SAGA Dashboard Server

## Overview

A local web server that provides a comprehensive dashboard for visualizing and interacting with the SAGA system. The dashboard displays all epics, stories, their statuses, and relationships, enabling developers to monitor progress, view journals, and trigger SAGA commands directly from the browser.

## Goals

1. **Visual System Overview**: Provide a clear, intuitive visualization of all epics and their associated stories
2. **Real-time Status Display**: Show current status of stories (pending, in-progress, blocked, remote, completed) with live updates
3. **Journal Browser**: Enable inline viewing and navigation of journal.md content for any story
4. **Command Integration**: Support triggering SAGA commands (/implement, /resolve) directly from the UI
5. **Progress Tracking**: Display visual progress indicators, task completion statistics, and epic-level summaries
6. **Git Integration**: Show PR status, branch information, and recent commits for each story

## Success Metrics

- Dashboard loads and displays all epics/stories within 2 seconds
- Live updates reflect file changes within 1 second
- All SAGA commands can be triggered without leaving the browser
- Users can navigate from epic overview to story details in 2 clicks or less

## Scope

### In Scope

- Local HTTP server serving the dashboard UI
- Epic list view with story counts and status summaries
- Story detail view with tasks, journal, and git info
- Real-time file watching with WebSocket updates
- Command execution panel for /implement and /resolve
- Progress visualization (progress bars, completion percentages)
- Git status display (branch, PR link, recent commits)
- CLI command to start the server (e.g., `saga dashboard` or npm script)

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
   - State management with React Context or Zustand
   - WebSocket client for live updates
   - Markdown rendering for journal/story content
   - Clean, minimal UI with status indicators

3. **File System Integration**:
   - Parses `.saga/epics/` structure on startup
   - Derives story status from filesystem signals (worktree, journal, etc.)
   - Executes git commands for branch/PR information

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

## Data Models

### Epic Summary

```typescript
interface EpicSummary {
  slug: string;
  title: string;
  storyCounts: {
    total: number;
    pending: number;
    inProgress: number;
    blocked: number;
    completed: number;
  };
  path: string;
}
```

### Story Detail

```typescript
interface StoryDetail {
  slug: string;
  epicSlug: string;
  title: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'remote' | 'completed';
  tasks: Task[];
  journal?: JournalEntry[];
  git: {
    branch?: string;
    prUrl?: string;
    prStatus?: 'open' | 'merged' | 'closed';
    lastCommit?: string;
  };
  paths: {
    storyMd: string;
    journalMd?: string;
    worktree?: string;
  };
}

interface Task {
  id: number;
  title: string;
  completed: boolean;
  subtasks?: string[];
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

- **Description**: Trigger /implement for a story
- **Input**: `{ epicSlug: string, storySlug: string }`
- **Output**: `{ success: boolean, output: string }`

#### POST /api/commands/resolve

- **Description**: Trigger /resolve for a blocked story
- **Input**: `{ epicSlug: string, storySlug: string }`
- **Output**: `{ success: boolean, output: string }`

### WebSocket Events

#### Server -> Client

- `epics:updated` - Epic list changed
- `story:updated` - Single story status/content changed
- `command:output` - Streaming output from running command

#### Client -> Server

- `subscribe:story` - Watch specific story for changes
- `unsubscribe:story` - Stop watching story

## Tech Stack

- **Runtime**: Node.js 18+
- **Backend Framework**: Express.js
- **WebSocket**: ws
- **File Watching**: chokidar
- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS or CSS Modules
- **Markdown**: react-markdown with remark-gfm
- **Git Integration**: simple-git

## Open Questions

- Should the dashboard be a separate npm package or integrated into the SAGA plugin?
- What port should the server default to? (suggestion: 3847 - "SAGA" on phone keypad)
- Should command output be streamed in real-time or shown after completion?
- How should archived stories be displayed (separate section, filtered view, or hidden)?
