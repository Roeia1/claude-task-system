---
id: backend-session-api
title: Backend Session API and Discovery
status: ready
epic: tmux-session-dashboard
tasks:
  - id: t1
    title: Define SessionInfo type and parsing utilities
    status: pending
  - id: t2
    title: Implement session discovery polling service
    status: pending
  - id: t3
    title: Create GET /api/sessions endpoint
    status: pending
  - id: t4
    title: Create GET /api/sessions/:sessionName endpoint
    status: pending
  - id: t5
    title: Implement sessions:updated WebSocket broadcast
    status: pending
---

## Context

The SAGA dashboard needs visibility into tmux worker sessions to show users what stories are being executed and their current status. This story implements the backend infrastructure for session discovery and REST API access.

SAGA workers run in detached tmux sessions with names following the pattern `saga__<epic-slug>__<story-slug>__<pane-pid>` (double-underscore delimiters). Session output is captured to `/tmp/saga-sessions/<session-name>.out`. This story creates the API layer that discovers these sessions, parses their names to extract epic/story associations, tracks status changes (running vs completed), and provides REST endpoints for frontend consumption.

The backend maintains a polling loop that calls `listSessions()` every 3 seconds, comparing results with previous state to detect new sessions and status transitions. When changes occur, a `sessions:updated` WebSocket message is broadcast to all connected clients.

## Scope Boundaries

**In scope:**
- `SessionInfo` TypeScript interface with parsed epic/story slugs
- Session name parsing utility (split by `__` delimiter)
- Polling service that discovers sessions every 3 seconds
- Status change detection (new sessions, running to completed transitions)
- `GET /api/sessions` endpoint with optional query filters
- `GET /api/sessions/:sessionName` endpoint for single session details
- `sessions:updated` WebSocket message broadcast on changes
- Output file availability check (`outputAvailable` boolean)
- Output preview generation (last 5 lines, max 500 chars)

**Out of scope:**
- Log streaming via WebSocket (covered by "WebSocket Log Streaming Infrastructure" story)
- Frontend components (covered by other stories)
- Session control/kill functionality (read-only by design)
- Persisted session history (uses /tmp which OS manages)

## Interface

### Inputs

- Existing `listSessions()` function from `src/lib/sessions.ts` that returns basic session data
- Existing WebSocket infrastructure in `src/commands/dashboard.ts`
- Existing Express routes in `src/commands/dashboard/routes.ts`

### Outputs

- `SessionInfo` interface exported from `src/lib/sessions.ts`:
  ```typescript
  interface SessionInfo {
    name: string;                    // saga__epic-slug__story-slug__12345
    epicSlug: string;                // Parsed from name
    storySlug: string;               // Parsed from name
    status: 'running' | 'completed';
    outputFile: string;              // /tmp/saga-sessions/<name>.out
    outputAvailable: boolean;        // False if output file missing
    startTime: Date;                 // From output file birthtime
    endTime?: Date;                  // From output file mtime when completed
    outputPreview?: string;          // Last 5 lines, max 500 chars
  }
  ```
- `GET /api/sessions` endpoint returning `SessionInfo[]`
- `GET /api/sessions/:sessionName` endpoint returning `SessionInfo`
- `sessions:updated` WebSocket message with `{ type: 'sessions:updated', sessions: SessionInfo[] }`
- `startSessionPolling(broadcast: (msg: object) => void)` function for dashboard to call
- `stopSessionPolling()` function for cleanup

## Acceptance Criteria

- [ ] Session names are correctly parsed to extract epicSlug and storySlug using `__` delimiter
- [ ] Polling detects new sessions within 5 seconds of creation
- [ ] Polling detects session completion (running to completed) within 5 seconds
- [ ] `GET /api/sessions` returns all SAGA sessions with correct SessionInfo structure
- [ ] `GET /api/sessions?epicSlug=X&storySlug=Y` filters results correctly
- [ ] `GET /api/sessions?status=running` filters to only running sessions
- [ ] `GET /api/sessions/:sessionName` returns 404 for unknown sessions
- [ ] `sessions:updated` WebSocket message is broadcast when sessions change
- [ ] `outputPreview` contains last 5 lines (max 500 chars) when output file exists
- [ ] `outputAvailable` is false when output file is missing or deleted
- [ ] Sessions are sorted by startTime descending in API responses

## Tasks

### t1: Define SessionInfo type and parsing utilities

**Guidance:**
- Add `SessionInfo` interface to `src/lib/sessions.ts` alongside existing session utilities
- Create `parseSessionName(name: string)` function that extracts epicSlug and storySlug by splitting on `__`
- Create `buildSessionInfo(name: string, status: 'running' | 'completed')` async function that:
  - Parses the session name
  - Constructs output file path as `/tmp/saga-sessions/${name}.out`
  - Checks if output file exists (fs.access)
  - Gets file stats for startTime (birthtime) and endTime (mtime, only if completed)
  - Reads last 5 lines for outputPreview (max 500 chars)
- Handle edge cases: non-SAGA sessions (don't start with `saga__`), malformed names, missing files

**References:**
- `src/lib/sessions.ts` - existing session utilities to extend
- `src/commands/sessions/list.ts` - example of listing sessions
- Epic data model section shows SessionInfo interface structure

**Avoid:**
- Modifying the existing `listSessions()` function signature
- Throwing errors for missing files - return `outputAvailable: false` instead
- Including non-SAGA sessions in results

**Done when:**
- `SessionInfo` interface is exported from sessions.ts
- `parseSessionName()` correctly extracts slugs from `saga__epic__story__pid` format
- `buildSessionInfo()` returns complete SessionInfo with all fields populated
- Unit tests verify parsing and edge cases

### t2: Implement session discovery polling service

**Guidance:**
- Create `src/lib/session-polling.ts` module with:
  - `startSessionPolling(broadcast: (msg: object) => void): void`
  - `stopSessionPolling(): void`
  - `getCurrentSessions(): SessionInfo[]`
- Use `setInterval` with 3000ms polling interval
- Store previous session state to detect changes:
  - New sessions: names not in previous state
  - Completed sessions: status changed from running to completed
  - Removed sessions: names no longer returned by listSessions
- On any change, call broadcast with `{ type: 'sessions:updated', sessions }`
- Export a way for log streaming to be notified when sessions complete (for cleanup coordination)

**References:**
- `src/lib/sessions.ts` - `listSessions()` function to call
- Epic section on "Session Discovery & Status Polling" for requirements

**Avoid:**
- Blocking the event loop with synchronous operations
- Memory leaks from not clearing the interval
- Broadcasting when nothing changed

**Done when:**
- Polling starts/stops cleanly without memory leaks
- Changes are detected and broadcast within one polling cycle
- `getCurrentSessions()` returns latest known state
- Unit tests verify change detection logic

### t3: Create GET /api/sessions endpoint

**Guidance:**
- Add route to `src/commands/dashboard/routes.ts`
- Support query parameters: `epicSlug`, `storySlug`, `status`
- Call `getCurrentSessions()` from polling service
- Apply filters in order: epicSlug, then storySlug (requires epicSlug), then status
- Sort results by startTime descending
- Return JSON array of SessionInfo objects

**References:**
- `src/commands/dashboard/routes.ts` - existing route patterns
- Express query parameter handling: `req.query.epicSlug`

**Avoid:**
- Starting polling in the route handler (polling is started by dashboard server)
- Returning sessions that don't match all provided filters

**Done when:**
- `GET /api/sessions` returns all sessions
- `GET /api/sessions?epicSlug=foo` filters correctly
- `GET /api/sessions?epicSlug=foo&storySlug=bar` filters correctly
- `GET /api/sessions?status=running` filters correctly
- Results are sorted by startTime descending
- Integration tests verify filtering behavior

### t4: Create GET /api/sessions/:sessionName endpoint

**Guidance:**
- Add route to `src/commands/dashboard/routes.ts`
- Look up session by exact name match in `getCurrentSessions()`
- Return 404 with `{ error: 'Session not found' }` if not found
- Return full SessionInfo object if found

**References:**
- `src/commands/dashboard/routes.ts` - existing route patterns for path parameters
- Express path parameters: `req.params.sessionName`

**Avoid:**
- Partial name matching - require exact match
- Returning 500 for missing sessions - use 404

**Done when:**
- `GET /api/sessions/saga__epic__story__123` returns correct session
- `GET /api/sessions/nonexistent` returns 404
- Integration tests verify both cases

### t5: Implement sessions:updated WebSocket broadcast

**Guidance:**
- Modify `src/commands/dashboard.ts` to:
  - Import and call `startSessionPolling()` when server starts
  - Pass a broadcast function that sends to all connected WebSocket clients
  - Call `stopSessionPolling()` when server shuts down
- The broadcast function should send: `{ type: 'sessions:updated', sessions: SessionInfo[] }`
- Ensure broadcast only happens when there are actual changes (polling service handles this)

**References:**
- `src/commands/dashboard.ts` - existing WebSocket setup
- Epic WebSocket message types section for message format

**Avoid:**
- Broadcasting to disconnected clients (handle ws errors gracefully)
- Starting multiple polling instances if dashboard restarts

**Done when:**
- Polling starts automatically with dashboard server
- `sessions:updated` messages are sent to all connected clients on changes
- Polling stops when server shuts down
- Manual testing confirms messages arrive in browser console
