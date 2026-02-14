# Journal

## Session: 2026-02-14

Starting story execution. Read all three scanner implementations and their tests:
1. `storage.ts` — `listStories()` sync, returns raw `Story[]` without tasks/status
2. `find/saga-scanner.ts` — `scanStories()` async, returns `ScannedStory` with status but no tasks array
3. `dashboard/saga-scanner.ts` — `scanStories()` sync, returns `ScannedStory` with full tasks but no status

Plan: Write TDD tests first for the new consolidated `scanStories()` in storage.ts, then implement, then update consumers.

Key decisions:
- New `ScannedStory` combines both scanners' contracts: includes tasks array AND derived status
- `epicId` will be `string | undefined` (matching dashboard pattern), not `''` (find pattern)
- Sync function using `readdirSync`/`readFileSync`
- Worktree stories at `<root>/.saga/worktrees/<id>/.saga/stories/<id>/story.json` take priority
