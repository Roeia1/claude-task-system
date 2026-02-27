# Journal: kanban-board-view

## Session: 2026-02-27T03:00:00Z

### Task: add-all-stories-endpoint

**What was done:**
- Added `getAllStoriesWithEpicNames()` function to `parser.ts` that scans all stories and resolves epicName from parent epic title
- Modified `GET /api/stories` in `routes.ts` to support `?all=true` query parameter returning all stories with epicName resolved
- Added `epicName?: string` to `StoryDetail` interface in both server (`parser.ts`) and client (`types/dashboard.ts`)
- Wrote 6 new tests covering: all stories returned, epic-owned + standalone included, epicName populated, no epicName for standalone, correct status derivation, orphan epic handling
- All 28 route tests pass, all 38 full suite tests pass

**Key decisions and deviations:**
- Used direct scanning approach (`scanStories` + `listEpics`) instead of going through `scanSagaDirectory` to properly handle orphan stories (stories referencing non-existent epics)
- Orphan stories (referencing non-existent epics) are included in results with `epicName` undefined, while their `epic` field is preserved

**Next steps:**
- Proceed to `#write-kanban-board-tests` for frontend component tests
- Then `#add-websocket-broadcast` (now unblocked)
