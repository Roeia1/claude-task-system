# Skills Migration Journal

## Session: 2026-02-11T19:00Z

### Task: t1 - Update worktree script for story-based naming

**What was done:**
- Updated `packages/plugin-scripts/src/worktree.ts`:
  - Changed `createWorktree()` from `(projectPath, epicSlug, storySlug)` to `(projectPath, storyId)`
  - Branch naming changed from `story-${storySlug}-epic-${epicSlug}` to `story/${storyId}`
  - `createWorktreePaths` call updated to new 2-arg signature `(projectPath, storyId)`
  - CLI now expects single `<storyId>` argument instead of `<epic-slug> <story-slug>`
  - Updated `parseArgs` to extract single positional arg as `storyId`
  - Updated help text and doc comment
- Updated `packages/plugin-scripts/src/worktree.test.ts`:
  - All tests migrated to single storyId argument format
  - Branch assertions use `story/<storyId>` format
  - Path assertions use `.saga/worktrees/<storyId>` format
  - Added test for missing storyId argument
  - Removed tests for multiple worktrees under same epic (no longer applicable)
  - 15 tests, all passing

**Decisions:**
- Kept idempotency error behavior (fail if branch or worktree already exists) — same as before, just with new naming
- Removed the "multiple worktrees for same epic" test since the concept of epic-scoped worktrees is gone; replaced with a general "multiple worktrees" test

**Test results:**
- worktree.test.ts: 15/15 passing
- Full suite: 553 passing, 11 pre-existing failures (find.test.ts: 7, orchestrator.test.ts: 4) — no regressions

**Next steps:**
- t2: Migrate /create-epic skill to produce JSON epic files
