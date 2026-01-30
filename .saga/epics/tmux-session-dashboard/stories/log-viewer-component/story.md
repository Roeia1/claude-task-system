---
id: log-viewer-component
title: Log Viewer Component with Virtual Scrolling
status: ready
epic: tmux-session-dashboard
tasks:
  - id: t1
    title: Install @tanstack/react-virtual dependency
    status: completed
  - id: t2
    title: Create LogViewer component with terminal styling
    status: completed
  - id: t3
    title: Implement virtual scrolling for log lines
    status: completed
  - id: t4
    title: Add WebSocket log subscription hook
    status: completed
  - id: t5
    title: Implement auto-scroll toggle functionality
    status: completed
  - id: t6
    title: Add loading and status indicators
    status: completed
  - id: t7
    title: Write unit tests for LogViewer
    status: pending
  - id: t8
    title: Write Storybook stories for LogViewer
    status: pending
---

## Context

The SAGA dashboard needs a performant log viewer component to display real-time streaming logs from tmux worker sessions. Workers executing stories produce continuous output that users need to monitor for progress and debugging. The log viewer must handle potentially large log files (thousands of lines) without degrading UI performance, while providing a terminal-like experience that feels familiar to developers.

This component will be embedded in the Sessions tab of the story detail page, with one log viewer instance per session. It receives log data via WebSocket messages (`logs:data`) and must efficiently render new content as it arrives. The component uses `@tanstack/react-virtual` for virtualized rendering, ensuring smooth scrolling even with massive logs. Auto-scroll keeps users at the bottom during active streaming but can be toggled off for manual inspection.

## Scope Boundaries

**In scope:**
- LogViewer React component (`components/LogViewer.tsx`)
- Terminal-style display with monospace font and SAGA theme colors
- Virtual scrolling using `@tanstack/react-virtual` for performance
- WebSocket integration hook for subscribing/unsubscribing to log streams
- Auto-scroll toggle (enabled by default for running sessions)
- Loading skeleton while connecting to log stream
- Status indicator showing streaming vs static state
- Handling incremental log updates (appending new content)
- Unit tests and Storybook stories

**Out of scope:**
- Backend WebSocket log streaming infrastructure (covered by "WebSocket Log Streaming Infrastructure" story)
- REST API endpoints for sessions (covered by "Backend Session API and Discovery" story)
- SessionsPanel component that contains the log viewer (covered by "Story Detail Sessions Tab" story)
- Home page session cards with output preview (covered by "Home Page Active Sessions Section" story)
- Log search/filtering functionality (out of scope per epic)
- Log download/export (out of scope per epic)

## Interface

### Inputs

- **Log data**: Received via WebSocket `logs:data` messages containing `{ sessionName, data, isInitial, isComplete }`. The `isInitial: true` message contains full file content; subsequent messages contain only new content.
- **Session name**: Passed as prop to identify which session's logs to display
- **Session status**: `'running' | 'completed'` - determines default auto-scroll behavior and status indicator
- **Output available flag**: Boolean indicating if the output file exists; if false, component shows "Output unavailable" state

### Outputs

- **Visual log display**: Rendered terminal-style log content with virtual scrolling
- **WebSocket subscription**: Component subscribes on mount, unsubscribes on unmount via `subscribe:logs`/`unsubscribe:logs` messages
- **User interaction state**: Auto-scroll toggle state (internal, affects scroll behavior)

## Acceptance Criteria

- [ ] LogViewer displays log content with monospace font (`font-mono`) and SAGA theme colors (`bg-bg-dark` background, `text-text` for content)
- [ ] Virtual scrolling renders only visible lines, maintaining 60fps scroll performance with 10,000+ log lines
- [ ] Auto-scroll toggle button is visible and functional; when enabled, view scrolls to bottom on new content
- [ ] Auto-scroll is enabled by default for running sessions, disabled by default for completed sessions
- [ ] Loading skeleton displays while waiting for initial `logs:data` with `isInitial: true`
- [ ] Status indicator shows "Streaming" (with animation) for running sessions, "Complete" for completed sessions
- [ ] Component properly subscribes to logs on mount and unsubscribes on unmount
- [ ] Incremental log updates (`isInitial: false`) append to existing content without re-rendering entire log
- [ ] "Output unavailable" state displays when `outputAvailable` prop is false
- [ ] All new code has unit tests with >80% coverage
- [ ] Storybook stories demonstrate all component states (loading, streaming, complete, unavailable, large log)

## Tasks

### t1: Install @tanstack/react-virtual dependency

**Guidance:**
- Add `@tanstack/react-virtual` to devDependencies in `packages/cli/package.json`
- Use pnpm to install: `pnpm add -D @tanstack/react-virtual`
- Verify installation by checking package.json and node_modules

**References:**
- `packages/cli/package.json` - existing dependencies
- https://tanstack.com/virtual/latest - official documentation

**Avoid:**
- Installing to dependencies instead of devDependencies (dashboard is bundled, not runtime)
- Installing incompatible versions; use latest stable (^3.x)

**Done when:**
- `@tanstack/react-virtual` appears in devDependencies
- `pnpm install` completes without errors
- Package can be imported in a test file

### t2: Create LogViewer component with terminal styling

**Guidance:**
- Create `packages/cli/src/client/src/components/LogViewer.tsx`
- Use SAGA theme colors: `bg-bg-dark` for background, `text-text` for log content, `text-text-muted` for metadata
- Apply `font-mono` for monospace terminal appearance
- Structure: outer container with fixed height, inner scrollable area for log content
- Accept props: `sessionName`, `status`, `outputAvailable`, `initialContent?`
- Export named component and props type

**References:**
- `packages/cli/src/client/src/pages/StoryDetail.tsx:149` - existing terminal-style `<pre>` usage
- `packages/cli/src/client/tailwind.config.js` - SAGA theme color definitions
- `packages/cli/src/client/src/components/ui/card.tsx` - component structure patterns

**Avoid:**
- Using hardcoded colors instead of theme variables
- Making the component too tightly coupled to session data fetching
- Inline styles; use Tailwind classes

**Done when:**
- Component renders with terminal-style appearance
- Props interface is well-defined with TypeScript types
- Component accepts and displays static log content

### t3: Implement virtual scrolling for log lines

**Guidance:**
- Use `useVirtualizer` hook from `@tanstack/react-virtual`
- Split log content into lines array for virtualization
- Configure virtualizer with estimated line height (~20px for monospace text)
- Render only visible lines using `virtualizer.getVirtualItems()`
- Apply proper positioning to virtual items using `translateY`
- Handle dynamic line count as logs grow

**References:**
- https://tanstack.com/virtual/latest/docs/api/virtualizer - useVirtualizer API
- https://tanstack.com/virtual/latest/docs/examples/react/dynamic - dynamic row height example

**Avoid:**
- Re-splitting lines on every render; memoize the lines array
- Forgetting to set the scroll container ref on the virtualizer
- Using fixed item count; must handle growing log

**Done when:**
- Scrolling remains smooth with 10,000+ log lines
- Only visible lines are rendered (verify with React DevTools)
- Scroll position is maintained correctly during virtualization

### t4: Add WebSocket log subscription hook

**Guidance:**
- Create custom hook `useLogSubscription(sessionName)` or integrate into component
- On mount: send `{ type: 'subscribe:logs', sessionName }` via WebSocket
- On unmount: send `{ type: 'unsubscribe:logs', sessionName }` via WebSocket
- Use existing `getWebSocketSend()` from `dashboardMachine.ts` to send messages
- Listen for `logs:data` messages and accumulate content
- Handle `isInitial: true` (replace content) vs `isInitial: false` (append content)
- Track loading state until first `isInitial: true` message received

**References:**
- `packages/cli/src/client/src/machines/dashboardMachine.ts:64-66` - `getWebSocketSend()` export
- `packages/cli/src/client/src/machines/dashboardMachine.ts:124-142` - WebSocket message handling pattern
- Epic WebSocket protocol: `subscribe:logs`, `unsubscribe:logs`, `logs:data` message types

**Avoid:**
- Creating a new WebSocket connection; reuse existing dashboard WebSocket
- Memory leaks from not unsubscribing on unmount
- Losing log content when component re-renders

**Done when:**
- Component subscribes to logs on mount
- Component unsubscribes on unmount (verify in cleanup)
- Log content accumulates correctly from WebSocket messages
- Loading state clears after initial data received

### t5: Implement auto-scroll toggle functionality

**Guidance:**
- Add state: `autoScroll` boolean, default based on session status
- Add toggle button in component header/footer area
- Use `scrollToIndex` from virtualizer or `scrollTo` on container ref
- Scroll to bottom after new content arrives (when autoScroll enabled)
- Detect manual scroll (user scrolled up) and disable auto-scroll automatically
- Use Lucide icons: `ArrowDownToLine` for auto-scroll on, `Pause` or similar for off

**References:**
- `packages/cli/src/client/src/components/ui/button.tsx` - existing button component
- https://tanstack.com/virtual/latest/docs/api/virtualizer#scrolltoindex - scroll API

**Avoid:**
- Scroll jumping or jitter when new content arrives
- Scrolling on every render; only scroll when content actually changes
- Hard-to-discover toggle; make it visible in the UI

**Done when:**
- Toggle button is visible and changes auto-scroll state
- Auto-scroll keeps view at bottom during streaming (when enabled)
- Manual scroll up disables auto-scroll automatically
- Default state matches session status (enabled for running, disabled for completed)

### t6: Add loading and status indicators

**Guidance:**
- Loading skeleton: show pulsing placeholder while waiting for initial data
- Use existing skeleton pattern from `packages/cli/src/client/src/pages/StoryDetail.tsx:17-41`
- Status indicator in header: "Streaming" with animated dot for running, "Complete" for completed
- Use SAGA status colors: `text-success` for streaming, `text-text-muted` for complete
- Handle "Output unavailable" state with dimmed styling and message

**References:**
- `packages/cli/src/client/src/pages/StoryDetail.tsx:17-27` - `HeaderSkeleton` component pattern
- `packages/cli/src/client/src/pages/StoryDetail.tsx:44-59` - status badge styling pattern
- Lucide icons: `Terminal`, `Loader2` (animated), `CheckCircle`

**Avoid:**
- Showing stale "Streaming" status after session completes
- Blocking the entire UI during loading; skeleton should be contained to log area
- Missing visual feedback for the "Output unavailable" edge case

**Done when:**
- Loading skeleton appears until initial data received
- Status indicator correctly shows streaming vs complete state
- "Output unavailable" state renders with appropriate messaging
- Animations are smooth and not jarring

### t7: Write unit tests for LogViewer

**Guidance:**
- Create `packages/cli/src/client/src/components/LogViewer.test.tsx`
- Use Vitest and React Testing Library (existing test setup)
- Test cases: renders with content, loading state, unavailable state, auto-scroll toggle
- Mock WebSocket functionality using vi.mock or test doubles
- Test virtual scrolling behavior with large content

**References:**
- `packages/cli/vitest.config.ts` - existing test configuration
- `packages/cli/src/commands/init.test.ts` - test pattern examples
- https://testing-library.com/docs/react-testing-library/intro/ - RTL docs

**Avoid:**
- Testing implementation details; focus on user-visible behavior
- Flaky tests from async timing issues; use proper waitFor/act
- Skipping edge cases like empty content or error states

**Done when:**
- All test cases pass
- Coverage for LogViewer.tsx exceeds 80%
- Tests run successfully in CI (`pnpm test`)

### t8: Write Storybook stories for LogViewer

**Guidance:**
- Create `packages/cli/src/client/src/components/LogViewer.stories.tsx`
- Stories: Default, Loading, Streaming, Complete, Unavailable, LargeLog (10k+ lines)
- Use Storybook's `argTypes` for interactive controls
- Mock WebSocket data for streaming story using Storybook decorators

**References:**
- `packages/cli/src/client/src/pages/StoryDetail.stories.tsx` - existing story patterns
- `packages/cli/src/client/.storybook/` - Storybook configuration
- https://storybook.js.org/docs/writing-stories - Storybook docs

**Avoid:**
- Stories that require actual WebSocket connection
- Missing dark theme testing (SAGA uses dark theme)
- Overly complex stories; each should demonstrate one state

**Done when:**
- All stories render correctly in Storybook (`pnpm storybook`)
- LargeLog story demonstrates smooth scrolling performance
- Stories are documented with descriptions
