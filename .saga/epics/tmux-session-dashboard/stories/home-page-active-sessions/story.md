---
id: home-page-active-sessions
title: Home Page Active Sessions Section
status: ready
epic: tmux-session-dashboard
tasks:
  - id: t1
    title: Define SessionInfo type and extend dashboard types
    status: completed
  - id: t2
    title: Write tests for ActiveSessions component
    status: completed
  - id: t3
    title: Implement ActiveSessions component
    status: completed
  - id: t4
    title: Write tests for SessionCard component
    status: pending
  - id: t5
    title: Implement SessionCard component
    status: pending
  - id: t6
    title: Integrate ActiveSessions into EpicList page
    status: pending
  - id: t7
    title: Add Storybook stories for session components
    status: pending
---

## Context

The SAGA dashboard displays epics and stories but currently has no visibility into running worker sessions. When developers kick off story implementations via `/execute-story`, they have no way to see what's currently running without manually checking tmux or using CLI commands.

This story adds an "Active Sessions" section at the top of the home page (EpicList) that displays currently running tmux sessions as clickable cards. Each card shows the epic name, story name, runtime duration, and a preview of the last 5 lines of output (max 500 characters). Clicking a card navigates to the story detail page with the Sessions tab active.

The component consumes session data from the backend API (`GET /api/sessions`) which is implemented by another story. It also subscribes to WebSocket `sessions:updated` messages for real-time updates (WebSocket infrastructure implemented by another story).

## Scope Boundaries

**In scope:**
- `ActiveSessions` component that fetches and displays running sessions
- `SessionCard` component for individual session display
- Session card content: epic title, story title, duration timer, output preview
- Click-to-navigate functionality to story detail Sessions tab
- Loading skeleton state while fetching sessions
- Empty state when no sessions are running
- Real-time updates via WebSocket `sessions:updated` messages
- Integration into EpicList page (above the epics grid)

**Out of scope:**
- Backend API endpoints for sessions (covered by "Backend Session API and Discovery" story)
- WebSocket infrastructure and `sessions:updated` message handling (covered by "WebSocket Log Streaming Infrastructure" story)
- Full log viewing (covered by "Log Viewer Component with Virtual Scrolling" story)
- Sessions tab on story detail page (covered by "Story Detail Sessions Tab" story)
- Session kill/control functionality (read-only by design per epic)
- Completed sessions on home page (only running sessions shown)

## Interface

### Inputs

- **Backend API**: `GET /api/sessions?status=running` returns `SessionInfo[]` with running sessions
- **WebSocket events**: `sessions:updated` messages trigger re-fetch or state update
- **Dashboard context**: Access to WebSocket connection state and navigation

### Outputs

- **Navigation**: Clicking a session card navigates to `/epic/:epicSlug/story/:storySlug?tab=sessions`
- **Visual state**: Displays running sessions with real-time duration updates

## Acceptance Criteria

- [ ] ActiveSessions section appears at the top of the home page, above the epics grid
- [ ] Running sessions display as horizontal scrollable cards when there are more than 3
- [ ] Each session card shows: story title, epic title, live duration (updates every second), output preview (last 5 lines, max 500 chars)
- [ ] Clicking a session card navigates to `/epic/:epicSlug/story/:storySlug?tab=sessions`
- [ ] Section is hidden when no sessions are running (no empty state cluttering the page)
- [ ] Loading skeleton displays while fetching initial session data
- [ ] Sessions update within 5 seconds when a new session starts (per epic success metrics)
- [ ] Output preview uses monospace font with `bg-dark` background styling
- [ ] Duration displays in human-readable format (e.g., "2m 34s", "1h 15m")

## Tasks

### t1: Define SessionInfo type and extend dashboard types

**Guidance:**
- Add `SessionInfo` interface to `src/client/src/types/dashboard.ts`
- Match the backend data model from the epic specification
- Include all fields needed for display: `name`, `epicSlug`, `storySlug`, `status`, `outputFile`, `outputAvailable`, `startTime`, `endTime`, `outputPreview`

**References:**
- `packages/cli/src/client/src/types/dashboard.ts` - existing type definitions
- Epic data model section for `SessionInfo` interface definition

**Avoid:**
- Adding fields not needed by frontend (implementation details)
- Using `any` types

**Done when:**
- `SessionInfo` interface is defined with all required fields
- Type is exported and can be imported by components

### t2: Write tests for ActiveSessions component

**Guidance:**
- Follow TDD approach - tests first
- Test loading state, empty state (hidden), populated state
- Test that cards render with correct data
- Test click navigation behavior
- Mock the API response and WebSocket events

**References:**
- `packages/cli/src/client/src/pages/EpicList.stories.tsx` - existing Storybook/test patterns
- `packages/cli/src/client/src/pages/EpicDetail.tsx` - similar data fetching patterns

**Avoid:**
- Testing implementation details (internal state)
- Skipping edge cases (0 sessions, 1 session, many sessions)

**Done when:**
- Tests cover loading, empty, and populated states
- Tests verify session data displays correctly
- Tests verify navigation on card click
- All tests pass

### t3: Implement ActiveSessions component

**Guidance:**
- Fetch sessions from `GET /api/sessions?status=running` on mount
- Subscribe to `sessions:updated` WebSocket messages for real-time updates
- Use horizontal scroll container for cards when > 3 sessions
- Hide entire section when no running sessions (don't show empty state)
- Show loading skeleton during initial fetch

**References:**
- `packages/cli/src/client/src/pages/EpicList.tsx` - data fetching pattern with `useEffect`
- `packages/cli/src/client/src/context/DashboardContext.tsx` - WebSocket subscription pattern

**Avoid:**
- Polling for session updates (use WebSocket events)
- Blocking the epic list render while sessions load
- Showing section when empty (only show when sessions exist)

**Done when:**
- Component fetches and displays running sessions
- Real-time updates work via WebSocket
- Loading skeleton shows during fetch
- Section hidden when no sessions

### t4: Write tests for SessionCard component

**Guidance:**
- Test card displays all required information
- Test duration formatting (seconds, minutes, hours)
- Test output preview truncation
- Test click handler
- Test "Output unavailable" state when `outputAvailable: false`

**References:**
- `packages/cli/src/client/src/pages/EpicList.tsx` - `EpicCard` component pattern

**Avoid:**
- Testing CSS styling details
- Over-mocking internal components

**Done when:**
- Tests cover all data display scenarios
- Tests verify click behavior
- Tests handle edge cases (missing data, unavailable output)

### t5: Implement SessionCard component

**Guidance:**
- Use `Card`, `CardHeader`, `CardContent` from UI components
- Implement live duration counter with `useState` and `setInterval`
- Format duration as "Xh Ym Zs" (show only relevant units)
- Truncate output preview to last 5 lines, max 500 chars
- Use monospace font and `bg-dark` for output preview
- Show dimmed card with "Output unavailable" when `outputAvailable: false`
- Use `Link` from react-router-dom for navigation

**References:**
- `packages/cli/src/client/src/pages/EpicList.tsx` - `EpicCard` for card structure
- `packages/cli/src/client/src/components/ui/card.tsx` - Card component API

**Avoid:**
- Memory leaks from interval not being cleaned up
- Blocking render with expensive operations
- Hard-coding styles (use theme colors)

**Done when:**
- Card displays story title, epic title, duration, output preview
- Duration updates every second
- Click navigates to story detail with `?tab=sessions`
- Unavailable output state shows appropriate message

### t6: Integrate ActiveSessions into EpicList page

**Guidance:**
- Import and render `ActiveSessions` above the epics grid in `EpicList.tsx`
- Ensure session loading doesn't block epic list display
- Add appropriate spacing between sections

**References:**
- `packages/cli/src/client/src/pages/EpicList.tsx` - current page structure

**Avoid:**
- Coupling session loading to epic loading
- Breaking existing epic list functionality

**Done when:**
- ActiveSessions appears above epics grid
- Epic list still loads and displays independently
- Visual spacing is consistent with design

### t7: Add Storybook stories for session components

**Guidance:**
- Create stories for `ActiveSessions` and `SessionCard` components
- Include stories for: loading state, empty state (hidden), single session, multiple sessions, long output preview
- Use mock data matching `SessionInfo` type

**References:**
- `packages/cli/src/client/src/pages/EpicList.stories.tsx` - Storybook patterns
- `packages/cli/src/client/.storybook/` - Storybook configuration

**Avoid:**
- Stories that require live backend
- Missing accessibility annotations

**Done when:**
- Storybook stories exist for all component states
- Stories render correctly in Storybook UI
- Visual states are easy to test manually
