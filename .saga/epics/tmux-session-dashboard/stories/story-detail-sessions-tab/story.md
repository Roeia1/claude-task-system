---
id: story-detail-sessions-tab
title: Story Detail Sessions Tab
status: ready
epic: tmux-session-dashboard
tasks:
  - id: t1
    title: Add Sessions tab to StoryDetail page
    status: pending
  - id: t2
    title: Create SessionsPanel component
    status: pending
  - id: t3
    title: Create SessionCard component
    status: pending
  - id: t4
    title: Integrate LogViewer in session cards
    status: pending
  - id: t5
    title: Implement auto-expand logic
    status: pending
  - id: t6
    title: Add URL query parameter support for tab selection
    status: pending
---

## Context

The SAGA dashboard provides a story detail page that displays task lists, story content, and journal entries in a tabbed interface. This story adds a new "Sessions" tab to the story detail page that displays all tmux sessions (both running and completed) associated with a specific story. Users can see session metadata, status badges, and view real-time or static logs directly in an embedded viewer.

Sessions are identified by parsing the tmux session name format `saga__<epic-slug>__<story-slug>__<pane-pid>`. The dashboard receives session data through REST API calls and real-time WebSocket updates. Each session card displays metadata (name, status, start time, duration) and can be expanded to show logs via the LogViewer component.

The Sessions tab enables developers to monitor worker execution, debug issues by viewing logs, and understand session history for a story without leaving the dashboard.

## Scope Boundaries

**In scope:**
- Adding a "Sessions" tab to the existing `StoryDetail` page tab bar (after the Journal tab)
- Creating `SessionsPanel` component that fetches and displays sessions for the current story
- Creating `SessionCard` component with collapsible log viewer integration
- Displaying session metadata: name, status badge (running=green, completed=gray), start time, duration
- Auto-expanding the most recent running session; if none running, expand the most recent completed
- Supporting `?tab=sessions` URL query parameter for deep linking from home page session cards
- Subscribing to `sessions:updated` WebSocket messages for real-time session list updates

**Out of scope:**
- Backend API implementation (covered by "Backend Session API and Discovery" story)
- WebSocket log streaming infrastructure (covered by "WebSocket Log Streaming Infrastructure" story)
- LogViewer component implementation (covered by "Log Viewer Component with Virtual Scrolling" story)
- Home page active sessions section (covered by "Home Page Active Sessions Section" story)
- Session kill/control functionality (read-only by design)
- Log search/filtering functionality
- Log download/export

## Interface

### Inputs

- **Session data from REST API**: `GET /api/sessions?epicSlug=X&storySlug=Y` returns `SessionInfo[]` (provided by Backend Session API story)
- **Real-time session updates**: WebSocket `sessions:updated` messages with updated session list (provided by Backend Session API story)
- **LogViewer component**: `<LogViewer sessionName={string} />` component for displaying logs (provided by Log Viewer Component story)
- **Route parameters**: `epicSlug` and `storySlug` from React Router URL params
- **Query parameters**: `?tab=sessions` for direct navigation to Sessions tab

### Outputs

- **Sessions tab in StoryDetail**: New tab displaying all sessions for the story
- **SessionsPanel component**: Reusable component at `src/client/src/components/SessionsPanel.tsx`
- **SessionCard component**: Reusable component at `src/client/src/components/SessionCard.tsx`
- **Extended dashboard types**: `SessionInfo` and `SessionStatus` types in `types/dashboard.ts`

## Acceptance Criteria

- [ ] Sessions tab appears in StoryDetail page tab bar after Journal tab
- [ ] Sessions tab displays all sessions (running and completed) filtered by the current story's epic and story slugs
- [ ] Sessions are ordered by startTime descending (most recent first)
- [ ] Each session card shows: session name, status badge (green for running, gray for completed), start time, duration
- [ ] Running sessions display a green "Running" badge, completed sessions display a gray "Completed" badge
- [ ] The most recent running session is auto-expanded; if no running sessions, the most recent completed is expanded
- [ ] Expanded session cards show the LogViewer component (or placeholder if LogViewer not yet available)
- [ ] Sessions with missing output files show "Output unavailable" message with dimmed styling
- [ ] Session list updates in real-time when `sessions:updated` WebSocket message is received
- [ ] URL query parameter `?tab=sessions` navigates directly to Sessions tab on page load
- [ ] Empty state shows "No sessions found for this story" message
- [ ] Loading skeleton displays while fetching sessions

## Tasks

### t1: Add Sessions tab to StoryDetail page

**Guidance:**
- Add a new `TabsTrigger` with value "sessions" and label "Sessions" to the existing `TabsList` in `StoryDetail.tsx`
- Position the Sessions tab after the Journal tab
- Add corresponding `TabsContent` with value "sessions" that renders `<SessionsPanel epicSlug={epicSlug} storySlug={storySlug} />`
- Follow the same pattern as the existing Tasks, Content, and Journal tabs

**References:**
- `packages/cli/src/client/src/pages/StoryDetail.tsx` lines 295-411 - existing tab structure
- `packages/cli/src/client/src/components/ui/tabs.tsx` - Tabs component from shadcn/ui

**Avoid:**
- Do not modify the existing tab content or functionality
- Do not add session-related logic directly to StoryDetail - keep it encapsulated in SessionsPanel

**Done when:**
- Sessions tab appears in the tab bar after Journal
- Clicking Sessions tab renders SessionsPanel component
- No regressions in existing tabs

### t2: Create SessionsPanel component

**Guidance:**
- Create `src/client/src/components/SessionsPanel.tsx`
- Accept `epicSlug` and `storySlug` as props
- Fetch sessions from `/api/sessions?epicSlug={epicSlug}&storySlug={storySlug}` on mount
- Store sessions in local state, ordered by `startTime` descending
- Subscribe to WebSocket `sessions:updated` messages to refresh session list
- Render loading skeleton while fetching
- Render empty state when no sessions found
- Render list of `SessionCard` components for each session
- Export `SessionsPanelProps` interface and `SessionsPanelSkeleton` component for reuse

**References:**
- `packages/cli/src/client/src/pages/StoryDetail.tsx` lines 177-219 - fetch pattern with loading states
- `packages/cli/src/client/src/context/DashboardContext.tsx` - WebSocket subscription pattern
- Epic data model: `SessionInfo` interface with `name`, `epicSlug`, `storySlug`, `status`, `outputFile`, `outputAvailable`, `startTime`, `endTime`

**Avoid:**
- Do not use polling - rely on WebSocket updates for real-time changes
- Do not embed business logic for session filtering - the API handles filtering

**Done when:**
- SessionsPanel fetches and displays sessions for the specified story
- Loading skeleton shows while fetching
- Empty state shows when no sessions exist
- Session list updates when WebSocket message received

### t3: Create SessionCard component

**Guidance:**
- Create `src/client/src/components/SessionCard.tsx`
- Accept `session: SessionInfo` and `defaultExpanded?: boolean` as props
- Use `Collapsible` from shadcn/ui for expand/collapse behavior
- Display in collapsed state: session name (truncated), status badge, start time, duration
- Display in expanded state: full session details plus LogViewer component
- Status badge: green `bg-success/20 text-success` for running, gray `bg-text-muted/20 text-text-muted` for completed
- Calculate duration from `startTime` to `endTime` (or current time if running)
- Handle missing output files: show "Output unavailable" with dimmed card styling, disable expansion

**References:**
- `packages/cli/src/client/src/pages/StoryDetail.tsx` lines 114-158 - `JournalEntryItem` collapsible pattern
- `packages/cli/src/client/src/components/ui/collapsible.tsx` - Collapsible component
- `packages/cli/src/client/src/pages/StoryDetail.tsx` lines 44-59 - status badge styling pattern
- Lucide icons: `Terminal`, `Play`, `Square` for session status indicators

**Avoid:**
- Do not fetch logs in SessionCard - LogViewer handles its own data fetching
- Do not hardcode session name parsing - use the `epicSlug` and `storySlug` from SessionInfo

**Done when:**
- SessionCard renders session metadata correctly
- Card expands/collapses on click
- Status badges display correct colors
- Duration calculates correctly for both running and completed sessions
- Missing output file state displays correctly with disabled expansion

### t4: Integrate LogViewer in session cards

**Guidance:**
- Import LogViewer component (or create placeholder if not yet available)
- Render LogViewer inside the expanded CollapsibleContent with `sessionName` prop
- Only mount LogViewer when card is expanded (to avoid unnecessary subscriptions)
- Pass `autoScroll={true}` for running sessions, `autoScroll={false}` for completed
- Show "Output unavailable" message if `session.outputAvailable` is false

**References:**
- Epic technical approach: LogViewer accepts `sessionName` prop and handles its own WebSocket subscription
- `packages/cli/src/client/src/pages/StoryDetail.tsx` lines 146-154 - content display in collapsible

**Avoid:**
- Do not manage log state in SessionCard - LogViewer is self-contained
- Do not render LogViewer when card is collapsed (wastes resources)

**Done when:**
- LogViewer renders in expanded session cards (or placeholder if component not ready)
- LogViewer only mounts when card expands
- Correct autoScroll setting passed based on session status
- Unavailable output displays appropriate message

### t5: Implement auto-expand logic

**Guidance:**
- In SessionsPanel, determine which session should be auto-expanded:
  1. Find the most recent running session (highest startTime with status='running')
  2. If no running sessions, find the most recent completed session
  3. Pass `defaultExpanded={true}` to that SessionCard
- Use `useMemo` to compute the auto-expand session ID to avoid recalculating on every render
- Handle edge case: empty session list (no auto-expand needed)

**References:**
- `packages/cli/src/client/src/pages/StoryDetail.tsx` lines 114-158 - `defaultOpen` prop pattern in JournalEntryItem

**Avoid:**
- Do not auto-expand multiple sessions - only one should be expanded by default
- Do not recalculate auto-expand when session list updates (only on initial load)

**Done when:**
- Most recent running session auto-expands on page load
- If no running sessions, most recent completed session auto-expands
- Only one session is auto-expanded
- Auto-expand works correctly after WebSocket updates

### t6: Add URL query parameter support for tab selection

**Guidance:**
- Use `useSearchParams` from react-router-dom to read `?tab=` query parameter
- If `tab=sessions` is present, set the Tabs `defaultValue` or controlled `value` to "sessions"
- Preserve existing behavior: default to "tasks" tab if no query parameter
- Consider using controlled Tabs component to allow programmatic tab switching
- Update URL when tab changes (optional but recommended for shareable links)

**References:**
- React Router `useSearchParams` hook documentation
- `packages/cli/src/client/src/pages/StoryDetail.tsx` line 295 - existing Tabs defaultValue

**Avoid:**
- Do not break existing deep links or navigation
- Do not cause unnecessary re-renders when reading query params

**Done when:**
- Navigation with `?tab=sessions` opens Sessions tab directly
- Default tab behavior unchanged when no query parameter
- Tab selection works correctly for all tabs
