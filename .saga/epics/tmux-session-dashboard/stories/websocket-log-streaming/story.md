---
id: websocket-log-streaming
title: WebSocket Log Streaming Infrastructure
status: ready
epic: tmux-session-dashboard
tasks:
  - id: t1
    title: Create LogStreamManager class
    status: pending
  - id: t2
    title: Implement subscribe:logs handler
    status: pending
  - id: t3
    title: Implement unsubscribe:logs handler
    status: pending
  - id: t4
    title: Implement file watcher with chokidar
    status: pending
  - id: t5
    title: Implement incremental content delivery
    status: pending
  - id: t6
    title: Add watcher cleanup with reference counting
    status: pending
  - id: t7
    title: Integrate with session completion notifications
    status: pending
---

## Context

The SAGA dashboard needs real-time log streaming to display tmux session output as it's written. This story implements the WebSocket-based infrastructure that enables clients to subscribe to log files and receive incremental updates in real-time, similar to `tail -f` behavior.

The dashboard server already has WebSocket support via the `ws` library for real-time communication. This story extends that existing WebSocket infrastructure with new message types for log streaming: `subscribe:logs`, `unsubscribe:logs`, and `logs:data`. The implementation uses chokidar for file watching and manages watchers efficiently through reference counting to avoid resource leaks.

Session output files are stored at `/tmp/saga-sessions/<session-name>.out`. When a client subscribes to a session's logs, the server sends the full file content initially (`isInitial: true`), then streams only new content as it's appended (`isInitial: false`). When a session completes, the server sends a final message with `isComplete: true` and cleans up the watcher.

## Scope Boundaries

**In scope:**
- `LogStreamManager` class to manage file watchers and subscriptions
- WebSocket message handlers for `subscribe:logs` and `unsubscribe:logs`
- Chokidar file watching for session output files
- Incremental content delivery (tracking file position, sending only new bytes)
- Reference counting for watchers (multiple clients can subscribe to same session)
- Watcher cleanup on unsubscribe, client disconnect, and session completion
- `logs:data` message format with `sessionName`, `data`, `isInitial`, and `isComplete` fields
- Integration point for session completion notifications (called by session polling)

**Out of scope:**
- REST API endpoints for sessions (covered by "Backend Session API and Discovery" story)
- Session polling and `sessions:updated` WebSocket messages (covered by "Backend Session API and Discovery" story)
- Frontend LogViewer component (covered by "Log Viewer Component with Virtual Scrolling" story)
- Frontend state management for logs (covered by frontend stories)
- Session list UI components (covered by "Home Page Active Sessions Section" and "Story Detail Sessions Tab" stories)

## Interface

### Inputs

- Existing WebSocket server instance from dashboard
- Session output file paths at `/tmp/saga-sessions/<session-name>.out`
- Session completion notifications from session polling (to trigger `logs:end` and cleanup)

### Outputs

- `LogStreamManager` class exported from `src/lib/log-stream-manager.ts`
- WebSocket message handlers integrated into dashboard server
- `logs:data` messages sent to subscribed clients:
  ```typescript
  interface LogsDataMessage {
    type: 'logs:data';
    sessionName: string;
    data: string;        // Log content (full or incremental)
    isInitial: boolean;  // True for first message after subscribe
    isComplete: boolean; // True when session has completed
  }
  ```
- `notifySessionCompleted(sessionName: string)` method for session polling integration

## Acceptance Criteria

- [ ] Client can send `{ type: 'subscribe:logs', sessionName }` and receive initial file content
- [ ] Client receives incremental updates within 500ms of content being appended to output file
- [ ] Client can send `{ type: 'unsubscribe:logs', sessionName }` to stop receiving updates
- [ ] Multiple clients subscribing to the same session share a single file watcher
- [ ] Watcher is cleaned up when the last client unsubscribes
- [ ] Watcher is cleaned up when client WebSocket disconnects
- [ ] `notifySessionCompleted()` sends final content with `isComplete: true` and cleans up watcher
- [ ] Subscribing to non-existent file sends error message (not crash)
- [ ] All tests pass with `pnpm test`

## Tasks

### t1: Create LogStreamManager class

**Guidance:**
- Create `src/lib/log-stream-manager.ts` with a class that manages all log streaming state
- Use dependency injection: accept WebSocket broadcast function in constructor
- Maintain internal data structures for tracking:
  - Active file watchers (Map<sessionName, FSWatcher>)
  - File positions for incremental reads (Map<sessionName, number>)
  - Client subscriptions per session (Map<sessionName, Set<WebSocket>>)
  - Session-to-watcher reference counts

**References:**
- `src/lib/sessions.ts` for existing session utilities pattern
- `chokidar` documentation: https://github.com/paulmillr/chokidar

**Avoid:**
- Global mutable state; keep all state encapsulated in the class instance
- Creating watchers in constructor; watchers should be created lazily on first subscribe

**Done when:**
- `LogStreamManager` class is exported from `src/lib/log-stream-manager.ts`
- Class has constructor accepting WebSocket server or broadcast function
- Internal Maps are initialized for tracking watchers, positions, and subscriptions
- Unit tests verify class instantiation

### t2: Implement subscribe:logs handler

**Guidance:**
- Add `subscribe(sessionName: string, ws: WebSocket)` method to LogStreamManager
- Check if output file exists at `/tmp/saga-sessions/${sessionName}.out`
- If file doesn't exist, send error message to client and return
- Read full file content and send as `logs:data` with `isInitial: true`
- Add client to subscription set for this session
- If no watcher exists yet for this session, create one (Task t4)

**References:**
- `src/commands/dashboard.ts` for existing WebSocket message handling pattern
- Node.js `fs.promises.readFile` for initial file read

**Avoid:**
- Blocking the event loop with synchronous file reads
- Sending binary data; always send strings (file content is text)

**Done when:**
- `subscribe()` method reads file and sends initial content to client
- Method adds client to subscription tracking
- Missing file case returns error message to client
- Tests verify subscribe sends initial content with correct flags

### t3: Implement unsubscribe:logs handler

**Guidance:**
- Add `unsubscribe(sessionName: string, ws: WebSocket)` method to LogStreamManager
- Remove client from subscription set for this session
- Check if subscription set is now empty
- If empty, trigger watcher cleanup (Task t6)
- Also add `handleClientDisconnect(ws: WebSocket)` to clean up all subscriptions for a client

**References:**
- WebSocket 'close' event handling pattern in `src/commands/dashboard.ts`

**Avoid:**
- Memory leaks by forgetting to remove client from Sets
- Leaving orphan watchers when all clients disconnect

**Done when:**
- `unsubscribe()` removes client and triggers cleanup when appropriate
- `handleClientDisconnect()` cleans up all subscriptions for disconnected client
- Tests verify cleanup is triggered when last client unsubscribes

### t4: Implement file watcher with chokidar

**Guidance:**
- Add private `createWatcher(sessionName: string)` method
- Use chokidar to watch the output file for changes
- Configure chokidar with `{ persistent: true, awaitWriteFinish: false }` for immediate updates
- On 'change' event, trigger incremental content delivery (Task t5)
- Store watcher in the watchers Map

**References:**
- Existing `chokidar` dependency in package.json (version 5.x)
- chokidar API: `chokidar.watch(path, options)` returns FSWatcher

**Avoid:**
- Watching directories; watch the specific file only
- Using `awaitWriteFinish` which adds latency

**Done when:**
- `createWatcher()` creates chokidar watcher for session output file
- Watcher 'change' events trigger content delivery
- Watcher is stored in internal Map
- Tests verify watcher creation and event handling

### t5: Implement incremental content delivery

**Guidance:**
- Track current file position per session in `filePositions` Map
- On file change, read from saved position to end of file
- Use `fs.createReadStream` with `{ start: position }` for efficient partial reads
- Send new content as `logs:data` with `isInitial: false`, `isComplete: false`
- Update saved position after read
- Broadcast to all subscribed clients for this session

**References:**
- Node.js `fs.createReadStream` with `start` option
- `fs.promises.stat` to get current file size

**Avoid:**
- Reading entire file on every change
- Race conditions between position update and new reads

**Done when:**
- File position is tracked per session
- Only new content is read and sent on changes
- Multiple subscribed clients all receive the update
- Tests verify incremental reads work correctly

### t6: Add watcher cleanup with reference counting

**Guidance:**
- Increment reference count when client subscribes (or create watcher if count was 0)
- Decrement reference count when client unsubscribes or disconnects
- When reference count reaches 0, close watcher and remove from Maps
- Add private `cleanupWatcher(sessionName: string)` method
- Clean up file position tracking when watcher is removed

**References:**
- chokidar `watcher.close()` to stop watching

**Avoid:**
- Closing watcher while other clients are still subscribed
- Forgetting to clean up position tracking and subscription Sets

**Done when:**
- Reference counting tracks active subscriptions per session
- Watcher is closed only when last client unsubscribes
- All associated Maps are cleaned up
- Tests verify reference counting and cleanup behavior

### t7: Integrate with session completion notifications

**Guidance:**
- Add public `notifySessionCompleted(sessionName: string)` method
- When called, read any remaining content from file
- Send final `logs:data` with `isComplete: true` to all subscribed clients
- Clean up watcher regardless of subscription count
- This method will be called by the session polling system (other story) when it detects a session has completed

**References:**
- Epic section "Completion coordination: Polling loop notifies active log watchers when a session completes"

**Avoid:**
- Sending duplicate content if file was already at end
- Leaving subscriptions in an invalid state after completion

**Done when:**
- `notifySessionCompleted()` sends final content with `isComplete: true`
- Watcher and all tracking state is cleaned up after notification
- Tests verify completion flow and cleanup
