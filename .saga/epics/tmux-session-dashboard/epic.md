# Tmux Session Dashboard Display

## Overview

Display tmux session information in the SAGA dashboard, providing visibility into running and completed worker sessions. Users can see which stories have active sessions, monitor their status, and view real-time streaming logs directly in the dashboard. The home page shows a dedicated section for currently running sessions across all stories, while the story detail page provides full session information with an embedded log viewer.

## Goals

1. **Session Visibility**: Show active and recent tmux sessions for each story in the dashboard
2. **Real-time Log Streaming**: Stream session output in an embedded viewer, similar to `tail -f`
3. **Global Session Overview**: Display all running sessions on the home page with quick navigation to story details
4. **Status Awareness**: Clearly indicate session status (running vs completed) with visual indicators

## Success Metrics

- Running sessions appear on the home page within 2 seconds of creation
- Log viewer updates within 500ms of new output being written
- Session status reflects actual tmux state accurately
- Users can navigate from home page session card to story detail in 1 click

## Scope

### In Scope

**Home Page (Epic List)**:
- New "Running Sessions" section at the top of the page
- Session cards showing: epic name, story name, status indicator, runtime duration
- Preview of last few lines of output
- Click to navigate to story detail page (sessions tab/section)

**Story Detail Page**:
- New Sessions tab/section alongside Tasks, Content, and Journal
- List of sessions associated with the story (matched by slug pattern)
- Session metadata: name, status (running/completed), start time, output file path
- Embedded log viewer with:
  - Real-time streaming for running sessions
  - Full log display with virtual scrolling
  - Monospace font, dark terminal-style background
  - Auto-scroll toggle (on by default for running sessions)

**Backend API**:
- New endpoint to list sessions (filtered by epic/story slug)
- New endpoint to stream session logs via WebSocket
- Integration with existing `sessions.ts` module

**Real-time Updates**:
- WebSocket events for session status changes
- WebSocket streaming for log output

### Out of Scope

- Session kill/control from dashboard (read-only by design)
- Persistent session history in `.saga/` (uses `/tmp` which OS manages)
- Log search/filtering functionality
- Log download/export
- Session retry/restart capabilities
- Notifications for session completion

## Non-Functional Requirements

- **Performance**: Log streaming should not block UI; use virtual scrolling for large logs
- **Reliability**: Gracefully handle missing output files or terminated sessions
- **Responsiveness**: Home page section should load without blocking epic list
- **Resource Efficiency**: Only stream logs when viewer is visible; disconnect on navigation

## Technical Approach

### Backend Architecture

1. **Session API Endpoints** (in `routes.ts`):
   - `GET /api/sessions` - List all SAGA sessions with status
   - `GET /api/sessions?epicSlug=X&storySlug=Y` - Filter by story
   - `GET /api/sessions/:sessionName/status` - Get single session status

2. **Log Streaming** (via WebSocket):
   - New message type: `{ type: 'subscribe:logs', sessionName }`
   - Server uses `tail -f` equivalent to stream output file
   - Sends: `{ type: 'logs:data', sessionName, data }` for new content
   - Sends: `{ type: 'logs:end', sessionName }` when session completes
   - Clean disconnect on `{ type: 'unsubscribe:logs', sessionName }`

3. **Session Discovery**:
   - Reuse `listSessions()` from `src/lib/sessions.ts`
   - Parse session names to extract epic/story slugs
   - Correlate with story data for display

### Frontend Architecture

1. **Home Page Sessions Section** (`components/RunningSessions.tsx`):
   - Fetch running sessions on mount and via WebSocket updates
   - Display as horizontal scrollable cards or grid
   - Each card shows: story title, epic title, status badge, duration, output preview
   - Click navigates to `/epic/:epicSlug/story/:storySlug?tab=sessions`

2. **Story Detail Sessions Tab** (`components/SessionsPanel.tsx`):
   - Fetch sessions filtered by epic/story slugs
   - List sessions with status badges (green=running, gray=completed)
   - Expandable log viewer per session

3. **Log Viewer Component** (`components/LogViewer.tsx`):
   - Terminal-style display with monospace font
   - Virtual scrolling for performance with large logs
   - Auto-scroll toggle button
   - Loading skeleton while connecting
   - Status indicator (streaming vs static)

4. **State Management**:
   - Extend dashboard machine with sessions state
   - New actions: `SESSIONS_UPDATED`, `LOGS_DATA`, `LOGS_END`
   - Track subscribed log streams to clean up on unmount

### Session-Story Correlation

Sessions are named `saga-<epic-slug>-<story-slug>-<pane-pid>`. To find sessions for a story:
1. List all sessions via `listSessions()`
2. Parse session name to extract epic and story slugs
3. Match against the story being viewed

## Key Decisions

### Read-Only Dashboard

- **Choice**: No session control (kill) from dashboard
- **Rationale**: Consistent with existing dashboard design philosophy. Commands are executed via CLI/plugin, dashboard is for visualization only.
- **Alternatives Considered**: Add kill button (rejected - breaks read-only contract)

### Log Streaming via WebSocket

- **Choice**: Stream logs through existing WebSocket connection with new message types
- **Rationale**: Reuses existing infrastructure, efficient for real-time updates, allows multiple simultaneous log streams
- **Alternatives Considered**: Separate Server-Sent Events endpoint (adds complexity), polling (inefficient)

### Full Log with Virtual Scrolling

- **Choice**: Load and display full log output with virtual scrolling
- **Rationale**: Users need full context for debugging; virtual scrolling handles performance
- **Alternatives Considered**: Paginated loading (poor UX), limited tail (loses context)

### Session History Based on `/tmp` Files

- **Choice**: Show sessions while their output files exist in `/tmp/saga-sessions/`
- **Rationale**: Simple, no persistence layer needed, OS manages cleanup naturally
- **Alternatives Considered**: Persisted history in `.saga/` (adds complexity), active-only (loses useful history)

### Home Page Session Cards with Preview

- **Choice**: Show story/epic name, status, duration, and last few lines of output
- **Rationale**: Provides enough context to understand what's happening without navigating away
- **Alternatives Considered**: Minimal cards (not enough context), full logs (too heavy for home page)

## Data Models

### SessionInfo (Extended)

```typescript
interface SessionInfo {
  name: string;                    // saga-epic-slug-story-slug-12345
  epicSlug: string;                // Parsed from name
  storySlug: string;               // Parsed from name
  status: 'running' | 'completed'; // From tmux has-session
  outputFile: string;              // /tmp/saga-sessions/<name>.out
  startTime?: Date;                // Parsed from output file mtime or first line
  outputPreview?: string;          // Last N lines for cards
}
```

### WebSocket Message Types (New)

```typescript
// Client -> Server
interface SubscribeLogsMessage {
  type: 'subscribe:logs';
  sessionName: string;
}

interface UnsubscribeLogsMessage {
  type: 'unsubscribe:logs';
  sessionName: string;
}

// Server -> Client
interface LogsDataMessage {
  type: 'logs:data';
  sessionName: string;
  data: string;        // New log content
  isComplete: boolean; // True if session ended
}

interface SessionsUpdatedMessage {
  type: 'sessions:updated';
  sessions: SessionInfo[];
}
```

### Frontend State (Machine Context Extension)

```typescript
interface DashboardContext {
  // ... existing fields
  sessions: SessionInfo[];           // All known sessions
  activeLogs: Map<string, string[]>; // sessionName -> log lines
  logSubscriptions: Set<string>;     // Currently subscribed sessions
}
```

## Interface Contracts

### REST API Endpoints

#### GET /api/sessions

- **Description**: List all SAGA tmux sessions
- **Query Parameters**:
  - `epicSlug` (optional): Filter by epic
  - `storySlug` (optional): Filter by story (requires epicSlug)
  - `status` (optional): Filter by 'running' or 'completed'
- **Output**: `SessionInfo[]`

#### GET /api/sessions/:sessionName

- **Description**: Get single session details
- **Input**: `sessionName` path parameter
- **Output**: `SessionInfo` with full details

### WebSocket Protocol Extensions

#### Subscribe to Logs

- **Direction**: Client -> Server
- **Message**: `{ type: 'subscribe:logs', sessionName: string }`
- **Effect**: Server starts streaming log content for the session
- **Response**: Immediate `logs:data` with current content, then incremental updates

#### Unsubscribe from Logs

- **Direction**: Client -> Server
- **Message**: `{ type: 'unsubscribe:logs', sessionName: string }`
- **Effect**: Server stops streaming for this session

#### Log Data

- **Direction**: Server -> Client
- **Message**: `{ type: 'logs:data', sessionName: string, data: string, isComplete: boolean }`
- **Trigger**: New content written to output file or session completion

#### Sessions Updated

- **Direction**: Server -> Client
- **Message**: `{ type: 'sessions:updated', sessions: SessionInfo[] }`
- **Trigger**: Session created, completed, or status changed

## Tech Stack

- **Backend**: Express.js (existing), ws (existing WebSocket)
- **Log Tailing**: Node.js `fs.watch` or `chokidar` on output files
- **Frontend**: React (existing), XState (existing state machine)
- **Virtual Scrolling**: `@tanstack/react-virtual` for performant log display
- **UI Components**: shadcn/ui (existing), Lucide icons (Terminal, Play, Square)
- **Styling**: Tailwind CSS (existing)

## Open Questions

None - all questions resolved through user dialog.
