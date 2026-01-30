# WebSocket Log Streaming - Execution Journal

## Session: 2026-01-30T01:45:00

### Task: t1 - Create LogStreamManager class

**What was done:**
- Created `src/lib/log-stream-manager.ts` with the LogStreamManager class
- Created `src/lib/log-stream-manager.test.ts` with unit tests
- Implemented core class structure with:
  - Constructor accepting a `SendToClientFn` for dependency injection
  - Internal Maps: `watchers`, `filePositions`, `subscriptions`
  - Helper methods: `getSubscriptionCount()`, `hasWatcher()`, `getFilePosition()`
  - `dispose()` method for cleanup that closes all watchers and clears state
- Defined TypeScript interfaces: `LogsDataMessage`, `LogsErrorMessage`, `SendToClientFn`

**Decisions:**
- Used dependency injection for the send function to decouple from WebSocket server and enable testing
- Kept internal Maps private with public getter methods for inspection (useful for testing)
- Made `dispose()` async to properly await watcher.close() promises

**Test results:**
- 8 tests passing in log-stream-manager.test.ts
- All 122 tests in src/lib/ passing

**Next steps:**
- t2: Implement subscribe:logs handler (subscribe method, file reading, initial content delivery)
- t3: Implement unsubscribe:logs handler

## Session: 2026-01-30T01:52:00

### Task: t2 - Implement subscribe:logs handler

**What was done:**
- Added `subscribe(sessionName: string, ws: WebSocket)` method to LogStreamManager
- Method checks if output file exists at `/tmp/saga-sessions/${sessionName}.out`
- If file doesn't exist, sends error message (`logs:error` type) to client
- If file exists, reads full content and sends as `logs:data` with `isInitial: true`
- Tracks file position for incremental reads (stored in `filePositions` Map)
- Adds client to subscription set for the session
- Updated `SendToClientFn` type to accept both `LogsDataMessage` and `LogsErrorMessage`
- Added imports for `existsSync`, `readFile`, `join`, and `OUTPUT_DIR`

**Tests added:**
- `should have subscribe method`
- `should return a promise from subscribe`
- `should send initial file content with isInitial=true when subscribing`
- `should add client to subscription set after subscribing`
- `should allow multiple clients to subscribe to the same session`
- `should send error message when subscribing to non-existent file`
- `should not add client to subscriptions when file does not exist`
- `should track file position after initial read`
- `should send content to the specific client via sendToClient function`

**Test results:**
- 17 tests passing in log-stream-manager.test.ts (9 new tests added)
- 528 tests passing overall (1 unrelated timeout test skipped)

**Next steps:**
- t3: Implement unsubscribe:logs handler
- t4: Implement file watcher with chokidar

## Session: 2026-01-30T02:00:00

### Task: t3 - Implement unsubscribe:logs handler

**What was done:**
- Added `unsubscribe(sessionName: string, ws: WebSocket)` method to LogStreamManager
- Method removes client from subscription set for the specified session
- Safe operation: does nothing if client was not subscribed
- Added `handleClientDisconnect(ws: WebSocket)` method
- Method removes disconnected client from all session subscriptions
- Iterates through all subscription sets to ensure complete cleanup

**Tests added:**
- `should have unsubscribe method`
- `should remove client from subscription set when unsubscribing`
- `should not error when unsubscribing from a session not subscribed to`
- `should only remove the specific client when multiple clients are subscribed`
- `should not error when unsubscribing a client that was never subscribed`
- `should have handleClientDisconnect method`
- `should remove client from all sessions when client disconnects`
- `should not affect other clients when one client disconnects`
- `should not error when disconnecting a client with no subscriptions`

**Test results:**
- 26 tests passing in log-stream-manager.test.ts (9 new tests added)
- 139 tests passing in src/lib/ (1 unrelated test skipped)

**Notes:**
- The cleanup/watcher reference counting (t6) is not yet implemented - these methods currently only handle subscription tracking
- Once t4/t6 are implemented, `unsubscribe` will need to trigger watcher cleanup when subscription count reaches 0

**Next steps:**
- t4: Implement file watcher with chokidar
- t5: Implement incremental content delivery
- t6: Add watcher cleanup with reference counting

## Session: 2026-01-30T02:01:00

### Task: t4 - Implement file watcher with chokidar

**What was done:**
- Added `createWatcher(sessionName: string, outputFile: string)` private method to LogStreamManager
- Uses chokidar to watch the output file with options `{ persistent: true, awaitWriteFinish: false }` for immediate updates
- On 'change' event, triggers `sendIncrementalContent()` to deliver new content
- Watcher is stored in the `watchers` Map and created lazily on first subscription
- Added `sendIncrementalContent()` private method for sending only new file content
- Added `readFromPosition()` private method using `fs.createReadStream` with `start` option for efficient partial reads
- Modified `subscribe()` to create watcher when first client subscribes to a session
- Imported `chokidar`, `createReadStream`, and `stat` for file watching and reading

**Tests added:**
- `should create a watcher when first client subscribes`
- `should not create a new watcher when second client subscribes to same session`
- `should detect file changes via watcher` (with polling for timing reliability)
- `should close watcher when dispose is called`

**Test results:**
- 30 tests passing in log-stream-manager.test.ts (4 new tests added)
- 143 tests passing in src/lib/ (1 unrelated test skipped)

**Notes:**
- Task t4 and t5 were implemented together since the watcher needs to trigger incremental content delivery
- The `sendIncrementalContent()` method tracks file position and sends only new bytes to all subscribed clients
- Uses `createReadStream` with `{ start, end }` options for efficient partial file reads
- Reference counting cleanup (t6) still needed - watchers are created but not cleaned up on unsubscribe yet

**Next steps:**
- t6: Add watcher cleanup with reference counting
- t7: Integrate with session completion notifications

## Session: 2026-01-30T02:07:00

### Task: t6 - Add watcher cleanup with reference counting

**What was done:**
- Added private `cleanupWatcher(sessionName: string)` method to LogStreamManager
- Method closes the file watcher and removes all tracking state (watcher, filePosition, subscriptions)
- Modified `unsubscribe()` to trigger watcher cleanup when subscription count reaches 0
- Modified `handleClientDisconnect()` to trigger cleanup for each session that becomes empty
- Reference counting is implicit: subscription set size determines when cleanup happens

**Tests added:**
- `should close watcher when last client unsubscribes`
- `should not close watcher when other clients are still subscribed`
- `should close watcher when second-to-last client unsubscribes and last client unsubscribes`
- `should clean up file position when watcher is closed`
- `should close watcher when client disconnects and was the only subscriber`
- `should not close watcher when disconnected client was one of multiple subscribers`
- `should close watchers for all sessions when last subscriber disconnects from each`
- `should clean up subscription set when watcher is closed`

**Test results:**
- 38 tests passing in log-stream-manager.test.ts (8 new tests added)
- 151 tests passing in src/lib/ (1 unrelated test skipped)

**Notes:**
- Reference counting uses implicit approach (subscription set size) rather than a separate counter
- Cleanup removes: watcher, file position tracking, and subscription set
- This completes the watcher lifecycle: create on first subscribe, clean up when last unsubscribes

**Next steps:**
- t7: Integrate with session completion notifications
