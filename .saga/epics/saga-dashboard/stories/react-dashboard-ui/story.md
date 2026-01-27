---
id: react-dashboard-ui
title: React Dashboard with Full UI
status: ready
epic: saga-dashboard
tasks:
  - id: t1
    title: Initialize Vite React TypeScript project
    status: completed
  - id: t2
    title: Configure Tailwind CSS and dark theme
    status: completed
  - id: t3
    title: Set up shadcn/ui components
    status: completed
  - id: t4
    title: Implement React Router with route structure
    status: pending
  - id: t5
    title: Create XState machine for dashboard state
    status: pending
  - id: t6
    title: Implement WebSocket client for real-time updates
    status: pending
  - id: t7
    title: Build Epic List view
    status: pending
  - id: t8
    title: Build Epic Detail view
    status: pending
  - id: t9
    title: Build Story Detail view with journal
    status: pending
  - id: t10
    title: Add toast notifications for errors
    status: pending
---

## Context

The SAGA Dashboard provides a read-only web interface for visualizing epics, stories, and their statuses in real-time. This story implements the complete React frontend application that connects to the backend server (built in a sibling story) to display all SAGA project data with live updates.

The frontend is a single-page application built with React 18+, TypeScript, and Vite. It uses React Router for navigation between views, XState for managing application state and WebSocket connections, and shadcn/ui components styled with a custom dark theme using Tailwind CSS. The application receives real-time updates via WebSocket when story statuses change or journal entries are added.

Users can navigate from an overview of all epics, drill down to see stories within an epic, and view full story details including parsed journal content with collapsible session logs and blockers.

## Scope Boundaries

**In scope:**
- Vite project setup with React 18+ and TypeScript
- Tailwind CSS configuration with custom dark theme (purple/blue, hue 264)
- shadcn/ui component installation and customization
- React Router with three routes: `/` (epic list), `/epic/:slug`, `/epic/:epicSlug/story/:storySlug`
- XState machine for managing dashboard state (loading, connected, error states)
- WebSocket client integration with subscribe/unsubscribe for story updates
- Epic List view with story counts and progress indicators
- Epic Detail view with story cards and status badges
- Story Detail view with task list and parsed journal entries
- Toast notifications for connection errors and API failures
- Markdown rendering for story and journal content
- Loading states and empty state messages
- Archived stories toggle (show/hide filter)

**Out of scope:**
- Backend server implementation (covered by "Backend Server with API and Real-time Updates" story)
- CLI commands and script migration (covered by "CLI Package with Commands and Script Migration" story)
- Mobile-responsive design (desktop-first per epic decision)
- Story or epic editing through the UI (read-only per epic scope)
- Command execution from dashboard (per epic scope)
- User authentication (local-only access per epic scope)
- Build bundling and npm packaging (CLI story handles final packaging)

## Interface

### Inputs

- **Backend API** (from sibling story): REST endpoints at `/api/epics`, `/api/epics/:slug`, `/api/stories/:epicSlug/:storySlug`
- **WebSocket server** (from sibling story): Events `epics:updated`, `story:updated`; accepts `subscribe:story`, `unsubscribe:story`
- **Data models** (from epic): `EpicSummary`, `Epic`, `StoryDetail`, `Task`, `JournalEntry` TypeScript interfaces

### Outputs

- **Built static files**: Production-ready React app in `dist/` directory
- **Vite dev server**: Development server with hot module replacement
- **TypeScript types**: Shared type definitions for API responses
- **Component library**: Reusable UI components styled with dark theme

## Acceptance Criteria

- [ ] Running `npm run dev` starts Vite dev server with hot reload
- [ ] Running `npm run build` produces optimized static files in `dist/`
- [ ] Epic list view displays all epics with correct story counts per status
- [ ] Progress bars show completion percentage for each epic
- [ ] Clicking an epic navigates to epic detail view
- [ ] Epic detail view shows all stories with status badges
- [ ] Clicking a story navigates to story detail view
- [ ] Story detail view displays tasks with status indicators
- [ ] Journal entries are parsed and displayed in collapsible sections
- [ ] WebSocket connection establishes and receives real-time updates
- [ ] UI updates automatically when backend pushes `story:updated` events
- [ ] Toast notifications appear on connection errors
- [ ] Empty states show helpful messages ("No epics found. Run `/create-epic`...")
- [ ] Dark theme applies consistently across all views
- [ ] Navigation between views works with browser back/forward buttons

## Tasks

### t1: Initialize Vite React TypeScript project

**Guidance:**
- Create the frontend project in `packages/cli/src/client/`
- Use `npm create vite@latest` with React + TypeScript template
- Configure `vite.config.ts` with appropriate base path for serving from Express
- Set up TypeScript with strict mode enabled
- Add path aliases for cleaner imports (`@/components`, `@/lib`, etc.)

**References:**
- Vite React template: https://vitejs.dev/guide/#scaffolding-your-first-vite-project
- Epic specifies React 18+ with TypeScript

**Avoid:**
- Using Create React App (deprecated, slower builds)
- Configuring for SSR (this is a client-only SPA)

**Done when:**
- `npm run dev` starts development server
- `npm run build` produces `dist/` with static files
- TypeScript compiles without errors
- Path aliases resolve correctly

### t2: Configure Tailwind CSS and dark theme

**Guidance:**
- Install Tailwind CSS and PostCSS following Vite guide
- Create CSS variables matching the epic's color palette (hue 264)
- Use `oklch()` color format as specified in epic
- Configure Tailwind to use CSS variables for colors
- Set dark mode as default (no light mode toggle needed)

**References:**
- Epic color palette:
  ```css
  :root {
    --bg-dark: oklch(0.1 0.025 264);
    --bg: oklch(0.15 0.025 264);
    --bg-light: oklch(0.2 0.025 264);
    --text: oklch(0.96 0.05 264);
    --text-muted: oklch(0.76 0.05 264);
    --highlight: oklch(0.5 0.05 264);
    --border: oklch(0.4 0.05 264);
    --border-muted: oklch(0.3 0.05 264);
    --primary: oklch(0.76 0.1 264);
    --secondary: oklch(0.76 0.1 84);
    --danger: oklch(0.7 0.05 30);
    --warning: oklch(0.7 0.05 100);
    --success: oklch(0.7 0.05 160);
    --info: oklch(0.7 0.05 260);
  }
  ```
- Status colors: ready=text-muted, in_progress=primary, blocked=danger, completed=success

**Avoid:**
- Using hex colors instead of oklch (loses consistency)
- Adding light mode support (not in scope)

**Done when:**
- Tailwind compiles without errors
- CSS variables are available throughout app
- Background, text, and accent colors match epic specification
- Status badge colors correctly map to status values

### t3: Set up shadcn/ui components

**Guidance:**
- Initialize shadcn/ui with `npx shadcn@latest init`
- Configure to use CSS variables for theming
- Install required components: Button, Card, Badge, Progress, Tabs, Toast, Collapsible
- Customize component styles to use the dark theme colors
- shadcn/ui copies components into your project (not a dependency)

**References:**
- shadcn/ui installation: https://ui.shadcn.com/docs/installation/vite
- Epic specifies shadcn/ui with custom dark theme
- Components are copied to `src/components/ui/`

**Avoid:**
- Installing all components (only add what's needed)
- Modifying component source files directly (use Tailwind config for theming)

**Done when:**
- shadcn/ui initialized with Vite configuration
- Required components installed and importable
- Components render with dark theme colors
- Toast provider is set up at app root

### t4: Implement React Router with route structure

**Guidance:**
- Install `react-router-dom` v6
- Create route structure: `/` (EpicList), `/epic/:slug` (EpicDetail), `/epic/:epicSlug/story/:storySlug` (StoryDetail)
- Implement layout component with navigation header
- Add breadcrumb navigation showing current location
- Use `useParams` for extracting route parameters
- Ensure browser history navigation works correctly

**References:**
- Epic route structure: `/` (epic list), `/epic/:slug`, `/epic/:epicSlug/story/:storySlug`
- Success metric: "navigate from epic overview to story details in 2 clicks or less"

**Avoid:**
- Using hash router (clean URLs preferred)
- Nested route complexity beyond the three main views

**Done when:**
- All three routes render correct placeholder components
- URL parameters are accessible in components
- Browser back/forward navigation works
- Breadcrumbs show current navigation path

### t5: Create XState machine for dashboard state

**Guidance:**
- Install `xstate` and `@xstate/react`
- Create machine with states: idle, loading, connected, error, reconnecting
- Handle WebSocket lifecycle (connect, disconnect, reconnect on error)
- Store epic/story data in machine context
- Use actors for managing WebSocket connection
- Implement retry logic with exponential backoff

**References:**
- XState documentation: https://stately.ai/docs/xstate
- Epic: "XState for frontend state management - excellent for async flows"
- WebSocket events: `epics:updated`, `story:updated` (server to client)
- WebSocket events: `subscribe:story`, `unsubscribe:story` (client to server)

**Avoid:**
- Using useState for complex async state (XState handles this better)
- Polling for updates (WebSocket provides real-time updates)
- Keeping WebSocket logic separate from state machine

**Done when:**
- Machine handles full connection lifecycle
- Context stores fetched epics and stories
- Reconnection works automatically on disconnect
- State transitions are typed and predictable

### t6: Implement WebSocket client for real-time updates

**Guidance:**
- Create WebSocket client as XState actor/service
- Connect to server at `ws://localhost:${port}` (default 3847)
- Handle `epics:updated` by refetching epic list
- Handle `story:updated` by updating specific story in context
- Implement subscribe/unsubscribe for story-level watching
- Add heartbeat/ping to detect stale connections

**References:**
- WebSocket protocol from epic:
  - Server -> Client: `epics:updated`, `story:updated`
  - Client -> Server: `subscribe:story`, `unsubscribe:story`
- Default port: 3847 (from epic decision)

**Avoid:**
- Using Socket.io (epic specifies native WebSocket with `ws`)
- Reconnecting immediately on failure (use backoff)

**Done when:**
- WebSocket connects on app load
- Updates from server trigger UI re-renders
- Story detail view subscribes to specific story updates
- Unsubscribing when leaving story detail view
- Connection errors trigger toast notifications

### t7: Build Epic List view

**Guidance:**
- Fetch epic list from `GET /api/epics` on mount
- Display cards for each epic showing title and story counts
- Show progress bar with completion percentage (completed/total)
- Display count badges for each status (ready, in_progress, blocked, completed)
- Add toggle to show/hide archived epics
- Implement empty state: "No epics found. Run `/create-epic` to get started."
- Use skeleton loading state while fetching

**References:**
- Epic data model: `EpicSummary` with `slug`, `title`, `storyCounts`
- Success metric: "Dashboard loads and displays all epics/stories within 2 seconds"
- Empty state from epic: "Simple text messages"

**Avoid:**
- Fetching full epic details on list view (only summary needed)
- Complex filtering UI (just archived toggle)

**Done when:**
- Epic cards display with correct data
- Progress bars show accurate completion percentage
- Status badges show correct counts with appropriate colors
- Empty state displays when no epics exist
- Clicking epic card navigates to epic detail
- Loading skeleton shows during initial fetch

### t8: Build Epic Detail view

**Guidance:**
- Fetch epic details from `GET /api/epics/:slug` using route param
- Display epic title and overall progress at top
- Render markdown content from epic.md (overview section)
- Show story list as cards with status badges
- Each story card shows: title, status badge, task progress (e.g., "2/5 tasks")
- Sort stories: blocked first, then in_progress, then ready, then completed
- Link each story card to story detail view

**References:**
- Epic data model: `Epic` with nested `StoryDetail[]`
- Status colors from epic: ready=muted, in_progress=primary, blocked=danger, completed=success

**Avoid:**
- Fetching stories separately (included in epic detail response)
- Showing full story content on this view (just summary)

**Done when:**
- Epic header shows title and progress
- Epic markdown content renders correctly
- Story cards display with status and task counts
- Stories are sorted by status priority
- Clicking story navigates to story detail
- 404/error state handles missing epic

### t9: Build Story Detail view with journal

**Guidance:**
- Fetch story details from `GET /api/stories/:epicSlug/:storySlug`
- Display story metadata: title, status badge, epic link
- Show task list with status checkboxes (visual only, not interactive)
- Render story.md content with markdown
- Parse and display journal entries in collapsible sections
- Group journal entries by type: sessions, blockers, resolutions
- Subscribe to story updates via WebSocket on mount, unsubscribe on unmount
- Use Tabs component to switch between Story Content and Journal views

**References:**
- Story data model: `StoryDetail` with `tasks`, `journal`
- Journal entry types: `session`, `blocker`, `resolution`
- Journal parsing: Headers `## Session:`, `## Blocker:`, `## Resolution:`
- Epic: "Enables collapsible sections and filtering by type"

**Avoid:**
- Making tasks interactive (read-only dashboard)
- Rendering raw markdown for journal (should be parsed into sections)

**Done when:**
- Story header shows status and breadcrumb to epic
- Task list displays with appropriate status indicators
- Story markdown content renders correctly
- Journal entries are collapsible by section
- Different journal entry types are visually distinguished
- Real-time updates reflect when story changes
- Blocker entries are highlighted prominently

### t10: Add toast notifications for errors

**Guidance:**
- Use shadcn/ui Toast component
- Create toast provider at app root
- Show toast on: WebSocket connection error, API fetch failure, reconnection attempts
- Include retry action in toast when appropriate
- Auto-dismiss success toasts after 3 seconds
- Keep error toasts visible until dismissed

**References:**
- Epic: "Toast notifications for errors - Non-blocking, temporary, consistent UX"
- shadcn/ui Toast: https://ui.shadcn.com/docs/components/toast

**Avoid:**
- Using alert() or console.error for user-facing errors
- Showing toasts for successful operations (only errors)
- Stacking multiple identical toasts

**Done when:**
- WebSocket errors show descriptive toast
- API failures show toast with error details
- Reconnection attempts show informational toast
- Toasts can be dismissed manually
- Multiple toasts stack properly
