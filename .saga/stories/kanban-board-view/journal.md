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

### Task: write-kanban-board-tests

**What was done:**
- Created `kanban-board.test.tsx` with 19 test cases organized in 6 describe blocks:
  - Column rendering (5 tests): 3 columns present, headers with status names, story counts, correct placement, empty state
  - Loading state (2 tests): skeleton during fetch, skeleton removed after load
  - Story card collapsed (5 tests): title, epic badge, no badge for non-epic, progress bar with task count, pulsing running indicator
  - Story card expanded (5 tests): expand on click, task list with status icons, blocked-by info, "Open story" link, progress bar
  - API call (1 test): fetches from `/api/stories?all=true`
  - Error handling (1 test): shows error state on API failure
- Created `KanbanBoard.tsx` stub component for TDD red phase
- All 18 tests fail as expected (1 passes coincidentally), confirming TDD red phase

**Key decisions and deviations:**
- Used static import with stub component instead of dynamic import (Vite doesn't support dynamic import of non-existent files)
- Used `data-testid` attributes for column identification (`column-pending`, `column-inProgress`, `column-completed`)
- Used `data-testid` pattern `story-card-{storyId}`, `story-card-trigger-{storyId}`, `story-card-content-{storyId}` for card interactions
- Session integration tested via mock fetch for both `/api/stories` and `/api/sessions` endpoints
- Followed existing patterns: `renderWithProviders()`, `mockFetch`, `waitFor()`, `data-testid` assertions

**Next steps:**
- Proceed to `#implement-story-card` (now unblocked)
- Then `#implement-kanban-board`

### Task: implement-story-card

**What was done:**
- Created `StoryCard.tsx` component with collapsible card using shadcn Card + Collapsible
- Collapsed state: chevron, title, epic Badge, compact Progress bar, task count, pulsing running indicator with Tooltip
- Expanded state: full markdown description (ReactMarkdown + remarkGfm), task list with status icons (✓/●/○), blocked-by info, progress bar, session indicator, "Open story →" link
- Created `KanbanBoard.tsx` page with 3-column layout (Pending/In Progress/Completed), loading Skeleton, error state, session integration via `/api/sessions?status=running`
- Installed 4 new shadcn components: Tooltip, Skeleton, ScrollArea, Separator (with radix-ui deps)
- Extracted `KanbanColumn` and `useKanbanData` to keep functions under biome's 50-line limit
- All 19 kanban board tests pass, all 38 full suite tests pass

**Key decisions and deviations:**
- Used pure re-export pattern for tooltip.tsx (same as collapsible.tsx) to avoid biome `useComponentExportOnlyModules` lint error
- Split KanbanBoard into `KanbanBoardContent`, `KanbanColumn`, `useKanbanData` to comply with biome's `noExcessiveLinesPerFunction` rule
- Used string keys for skeleton cards instead of array indices to comply with `noArrayIndexKey` rule
- Removed `export type { StoryCardProps }` to satisfy biome component-only export rule
- Task also implements the KanbanBoard page component (combined with story card implementation since they're tightly coupled)

**Next steps:**
- Mark `#implement-kanban-board` as completed (already implemented)
- Proceed to `#add-websocket-broadcast` and `#update-router-and-integrate`
