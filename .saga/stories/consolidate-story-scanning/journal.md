# Journal

## Session: 2026-02-14

Starting story execution. Read all three scanner implementations and their tests:
1. `storage.ts` — `listStories()` sync, returns raw `Story[]` without tasks/status
2. `find/saga-scanner.ts` — `scanStories()` async, returns `ScannedStory` with status but no tasks array
3. `dashboard/saga-scanner.ts` — `scanStories()` sync, returns `ScannedStory` with full tasks but no status

Plan: Write TDD tests first for the new consolidated `scanStories()` in storage.ts, then implement, then update consumers.

Key decisions:
- `ScannedStory extends Story` — coupled with story.json schema, adds `status`, `storyPath`, `worktreePath?`, `journalPath?`, `tasks[]`
- Uses `epic` field from Story (not `epicId`) for consistency
- Sync function using `readdirSync`/`readFileSync`
- Worktree stories at `<root>/.saga/worktrees/<id>/.saga/stories/<id>/story.json` take priority
- `parseStory()` now tries worktree path first for WebSocket real-time updates

Results:
- Added `scanStories()`, `ScannedStory`, `storiesDirectoryExists()`, `epicsDirectoryExists()` to `@saga-ai/utils`
- Deleted `packages/saga-utils/src/scripts/find/saga-scanner.ts` and test
- Deleted `packages/dashboard/src/utils/saga-scanner.ts` and test
- Updated `finder.ts` (now sync) and `parser.ts` to use shared scanner
- 554 saga-utils tests pass, 38 dashboard tests pass, both packages build
