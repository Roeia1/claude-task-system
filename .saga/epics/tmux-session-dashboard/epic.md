# Tmux Session Dashboard Display

## Overview

Display tmux session information in the SAGA dashboard, providing visibility into running and completed worker sessions. Users can see which stories have active sessions, monitor their status, and view real-time streaming logs directly in the dashboard. The home page shows a dedicated section for currently running sessions across all stories, while the story detail page provides full session information with an embedded log viewer.

## Goals

1. **Session Visibility**: Show active and recent tmux sessions for each story in the dashboard
2. **Real-time Log Streaming**: Stream session output in an embedded viewer, similar to `tail -f`
3. **Global Session Overview**: Display all running sessions on the home page with quick navigation to story details
4. **Status Awareness**: Clearly indicate session status (running vs completed) with visual indicators

## Success Metrics

- Running sessions appear on the home page within 5 seconds of creation
- Log viewer updates within 500ms of new output being written
- Session status reflects actual tmux state accurately
- Users can navigate from home page session card to story detail in 1 click

## Scope

### In Scope

**Home Page (Epic List)**:
- New "Active Sessions" section at the top of the page (running sessions only)
- Session cards showing: epic name, story name, runtime duration
- Preview of last 5 lines of output (max 500 chars)
- Click to navigate to story detail page (Sessions tab)

**Story Detail Page**:
- Add Sessions tab to existing tab bar (after Journal tab)
- List of all sessions for the story (running and completed), ordered by startTime descending
- Auto-expand most recent running session; if none running, expand most recent completed
- Session metadata: name, status (running/completed), start time, duration, output file path
- Embedded log viewer with:
  - Real-time streaming for running sessions
  - Full log display with virtual scrolling
  - Monospace font using existing SAGA theme colors (`bg-dark` background, `text`/`text-muted` for content)
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
- **Reliability**: Handle missing output files gracefully - show session card with "Output unavailable" message and dimmed styling; disable log viewer for that session
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
   - Server uses `chokidar` to watch output file for changes and stream new content
   - On subscribe: send `logs:data` with `isInitial: true` containing full file content
   - On file change: send `logs:data` with `isInitial: false` containing only new content
   - Sends: `{ type: 'logs:end', sessionName }` when session completes
   - Clean disconnect on `{ type: 'unsubscribe:logs', sessionName }`
   - **Watcher cleanup**: Stop watching a file when (a) all clients unsubscribe, or (b) session completes (after sending final content). Maintain reference count per watched file.
   - **Completion coordination**: Polling loop notifies active log watchers when a session completes, triggering `logs:end` and cleanup

3. **Session Discovery & Status Polling**:
   - Poll `listSessions()` from `src/lib/sessions.ts` every 3 seconds
   - Compare with previous state to detect new sessions and status changes (running → completed)
   - Parse session names to extract epic/story slugs
   - Correlate with story data for display
   - Emit `sessions:updated` WebSocket message on any change

### Frontend Architecture

1. **Home Page Active Sessions** (`components/ActiveSessions.tsx`):
   - Fetch running sessions on mount and via WebSocket `sessions:updated` events
   - Display as horizontal scrollable cards or grid (running sessions only)
   - Each card shows: story title, epic title, duration, output preview (last 5 lines)
   - Click navigates to `/epic/:epicSlug/story/:storySlug?tab=sessions`

2. **Story Detail Sessions Tab** (`components/SessionsPanel.tsx`):
   - Fetch sessions filtered by epic/story slugs (running and completed)
   - List sessions ordered by startTime descending, with status badges (green=running, gray=completed)
   - Auto-expand most recent running session; if none running, expand most recent completed
   - Expandable log viewer per session (disabled with "Output unavailable" if file missing)

3. **Log Viewer Component** (`components/LogViewer.tsx`):
   - Terminal-style display with monospace font
   - Uses existing SAGA theme: `bg-dark` background, `text` for output, `text-muted` for timestamps/metadata
   - Virtual scrolling for performance with large logs
   - Auto-scroll toggle button
   - Loading skeleton while connecting
   - Status indicator (streaming vs static)

4. **State Management**:
   - Extend dashboard machine with sessions state
   - New actions: `SESSIONS_UPDATED`, `LOGS_DATA`, `LOGS_END`
   - Track subscribed log streams to clean up on unmount

### Session-Story Correlation

Sessions are named `saga__<epic-slug>__<story-slug>__<pane-pid>` (double-underscore delimiters). This allows slugs to contain single hyphens while remaining parseable. To find sessions for a story:
1. List all sessions via `listSessions()`
2. Split session name by `__` to extract epic and story slugs
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

- **Choice**: Show story/epic name, duration, and last 5 lines of output (max 500 chars)
- **Rationale**: Provides enough context to understand what's happening without navigating away
- **Alternatives Considered**: Minimal cards (not enough context), full logs (too heavy for home page)

### Session Naming with Double-Underscore Delimiter

- **Choice**: Use `saga__<epic-slug>__<story-slug>__<pane-pid>` format with `__` delimiters
- **Rationale**: Allows slugs to contain single hyphens (common in URLs) while remaining unambiguously parseable
- **Alternatives Considered**: Single hyphen delimiter (ambiguous parsing), URL encoding (harder to read in tmux list), JSON metadata file (adds complexity)

## Data Models

### SessionInfo (Extended)

```typescript
interface SessionInfo {
  name: string;                    // saga__epic-slug__story-slug__12345
  epicSlug: string;                // Parsed from name (split by __)
  storySlug: string;               // Parsed from name (split by __)
  status: 'running' | 'completed'; // From tmux has-session
  outputFile: string;              // /tmp/saga-sessions/<name>.out
  outputAvailable: boolean;        // False if output file missing/deleted
  startTime: Date;                 // From output file birthtime (fs.stat)
  endTime?: Date;                  // From output file mtime when session completed
  outputPreview?: string;          // Last 5 lines, max 500 chars (for home page cards)
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
  data: string;        // Log content
  isInitial: boolean;  // True for first message (full file content), false for incremental
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
- **Effect**: Server starts watching output file with chokidar
- **Response**: Immediate `logs:data` with `isInitial: true` containing full file content, then incremental updates with `isInitial: false`

#### Unsubscribe from Logs

- **Direction**: Client -> Server
- **Message**: `{ type: 'unsubscribe:logs', sessionName: string }`
- **Effect**: Server stops streaming for this session

#### Log Data

- **Direction**: Server -> Client
- **Message**: `{ type: 'logs:data', sessionName: string, data: string, isInitial: boolean, isComplete: boolean }`
- **Trigger**: On subscribe (`isInitial: true` with full content), or new content written to output file (`isInitial: false` with incremental content)

#### Sessions Updated

- **Direction**: Server -> Client
- **Message**: `{ type: 'sessions:updated', sessions: SessionInfo[] }`
- **Trigger**: Session created, completed, or status changed

## Tech Stack

- **Backend**: Express.js (existing), ws (existing WebSocket)
- **Log Tailing**: `chokidar` for watching output file content changes (streaming new lines to subscribers)
- **Frontend**: React (existing), XState (existing state machine)
- **Virtual Scrolling**: `@tanstack/react-virtual` for performant log display
- **UI Components**: shadcn/ui (existing), Lucide icons (Terminal, Play, Square)
- **Styling**: Tailwind CSS (existing)

## Open Questions

None - all questions resolved through user dialog.
