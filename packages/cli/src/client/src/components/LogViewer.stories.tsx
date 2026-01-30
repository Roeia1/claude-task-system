import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot'
import { LogViewer } from './LogViewer'

// ============================================================================
// Mock Data
// ============================================================================

/** Sample log content for a typical build session */
const sampleLogContent = `$ npm install
added 1523 packages in 12.4s

$ npm run build
> saga-dashboard@1.0.0 build
> vite build

vite v5.2.0 building for production...
✓ 127 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-DiwrgTda.css   28.47 kB │ gzip:  5.92 kB
dist/assets/index-C2E1bKlF.js   187.92 kB │ gzip: 60.28 kB
✓ built in 3.21s

$ npm test
 ✓ src/components/Button.test.tsx (5 tests) 12ms
 ✓ src/components/Card.test.tsx (3 tests) 8ms
 ✓ src/hooks/useAuth.test.tsx (7 tests) 23ms
 ✓ src/utils/format.test.ts (12 tests) 5ms

 Test Files  4 passed (4)
      Tests  27 passed (27)
   Start at  10:32:45
   Duration  1.24s

Build completed successfully!`

/** Generate large log content for performance testing */
function generateLargeLog(lineCount: number): string {
  const lines: string[] = []
  // Use a static base time for reproducible snapshots
  const baseTime = new Date('2026-01-30T10:00:00.000Z').getTime()
  for (let i = 1; i <= lineCount; i++) {
    const timestamp = new Date(baseTime + i * 100).toISOString()
    const logLevel = ['INFO', 'DEBUG', 'WARN', 'ERROR'][i % 4]
    lines.push(`[${timestamp}] [${logLevel}] Processing item ${i} of ${lineCount}...`)
  }
  return lines.join('\n')
}

/** Sample streaming log content that grows over time */
const streamingLogContent = `$ saga implement --story user-auth
Starting story execution...

Session: user-auth-session-001
Worktree: /Users/dev/saga/worktrees/user-auth

[2026-01-30 10:00:00] Initializing worker...
[2026-01-30 10:00:01] Reading story.md...
[2026-01-30 10:00:02] Found 5 tasks to complete
[2026-01-30 10:00:03] Starting task t1: Setup authentication module
[2026-01-30 10:00:04] Writing tests for auth service...
[2026-01-30 10:00:05] Tests written: auth.test.ts (12 test cases)
[2026-01-30 10:00:06] Running tests...
[2026-01-30 10:00:07] ✓ All tests passing
[2026-01-30 10:00:08] Implementing auth service...`

// ============================================================================
// LogViewer Stories
// ============================================================================

/**
 * LogViewer displays streaming logs in a terminal-style interface.
 * Uses monospace font, SAGA theme colors, and virtual scrolling for
 * performance with large log files.
 *
 * Features:
 * - Terminal-style appearance with monospace font
 * - Virtual scrolling for 10,000+ log lines
 * - Auto-scroll toggle (enabled by default for running sessions)
 * - Status indicator (Streaming/Complete)
 * - Loading skeleton while waiting for initial data
 * - "Output unavailable" state for missing output files
 */
const meta: Meta<typeof LogViewer> = {
  title: 'Components/LogViewer',
  component: LogViewer,
  argTypes: {
    sessionName: {
      control: 'text',
      description: 'The name of the session to display logs for',
    },
    status: {
      control: 'select',
      options: ['running', 'completed'],
      description: 'The status of the session: running or completed',
    },
    outputAvailable: {
      control: 'boolean',
      description: 'Whether the output file is available',
    },
    initialContent: {
      control: 'text',
      description: 'Initial log content to display (bypasses WebSocket loading)',
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
The LogViewer component displays log output from SAGA worker sessions in a
terminal-style interface. It's designed to handle real-time streaming logs
with high performance.

## Key Features

- **Virtual Scrolling**: Uses \`@tanstack/react-virtual\` to efficiently render
  only visible lines, maintaining 60fps with 10,000+ log lines
- **Auto-Scroll**: Automatically follows new content when enabled (default for
  running sessions)
- **Status Indicators**: Shows "Streaming" with animation for running sessions,
  "Complete" for finished sessions
- **WebSocket Integration**: Subscribes to live log updates via WebSocket

## Usage

\`\`\`tsx
<LogViewer
  sessionName="my-session-001"
  status="running"
  outputAvailable={true}
/>
\`\`\`

## States

1. **Loading**: Shows skeleton while waiting for WebSocket data
2. **Streaming**: Live log updates with auto-scroll
3. **Complete**: Static log view, auto-scroll disabled by default
4. **Unavailable**: Output file doesn't exist
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof LogViewer>

/**
 * Default state showing a running session with sample log content.
 * Auto-scroll is enabled by default for running sessions.
 */
export const Default: Story = {
  args: {
    sessionName: 'test-session-001',
    status: 'running',
    outputAvailable: true,
    initialContent: sampleLogContent,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify log viewer container exists
    const logViewer = canvas.getByTestId('log-viewer')
    await expect(logViewer).toBeInTheDocument()

    // Verify status indicator shows streaming
    const statusIndicator = canvas.getByTestId('status-indicator-streaming')
    await expect(statusIndicator).toBeInTheDocument()
    await expect(canvas.getByText('Streaming')).toBeInTheDocument()

    // Verify auto-scroll toggle exists and is enabled (for running sessions)
    const toggleButton = canvas.getByTestId('auto-scroll-toggle')
    await expect(toggleButton).toBeInTheDocument()
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true')

    // Verify log content is displayed (check first line - virtualization may not render all)
    await expect(canvas.getByText(/npm install/)).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-default')
  },
}

/**
 * Loading state showing skeleton placeholders while waiting for
 * initial WebSocket data. This appears before the first `logs:data`
 * message with `isInitial: true`.
 *
 * Note: In Storybook, WebSocket is not available so the loading skeleton
 * won't appear (it only shows when WebSocket subscription is active but
 * hasn't received data yet). This story demonstrates the component structure
 * in an "empty content" state without WebSocket.
 */
export const Loading: Story = {
  args: {
    sessionName: 'loading-session',
    status: 'running',
    outputAvailable: true,
    // No initialContent - shows empty content area (no WebSocket in Storybook)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify log viewer container exists
    const logViewer = canvas.getByTestId('log-viewer')
    await expect(logViewer).toBeInTheDocument()

    // Verify status indicator shows streaming (status is running)
    const statusIndicator = canvas.getByTestId('status-indicator-streaming')
    await expect(statusIndicator).toBeInTheDocument()

    // Verify log content area exists (empty content state without WebSocket)
    const logContent = canvas.getByTestId('log-content')
    await expect(logContent).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-loading')
  },
}

/**
 * Streaming state for an active running session.
 * Shows animated "Streaming" indicator and has auto-scroll enabled.
 */
export const Streaming: Story = {
  args: {
    sessionName: 'streaming-session-001',
    status: 'running',
    outputAvailable: true,
    initialContent: streamingLogContent,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify streaming status indicator
    const statusIndicator = canvas.getByTestId('status-indicator-streaming')
    await expect(statusIndicator).toBeInTheDocument()
    await expect(canvas.getByText('Streaming')).toBeInTheDocument()

    // Verify animated loader icon is present
    const loader = canvasElement.querySelector('svg.animate-spin')
    await expect(loader).toBeInTheDocument()

    // Verify auto-scroll is enabled for running session
    const toggleButton = canvas.getByTestId('auto-scroll-toggle')
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true')

    // Verify log content shows streaming output
    await expect(canvas.getByText(/saga implement/)).toBeInTheDocument()
    await expect(canvas.getByText(/Starting story execution/)).toBeInTheDocument()
    await expect(canvas.getByText(/Implementing auth service/)).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-streaming')
  },
}

/**
 * Complete state for a finished session.
 * Shows static "Complete" indicator and has auto-scroll disabled by default.
 */
export const Complete: Story = {
  args: {
    sessionName: 'completed-session-001',
    status: 'completed',
    outputAvailable: true,
    initialContent: sampleLogContent,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify complete status indicator
    const statusIndicator = canvas.getByTestId('status-indicator-complete')
    await expect(statusIndicator).toBeInTheDocument()
    await expect(canvas.getByText('Complete')).toBeInTheDocument()

    // Verify status indicator has check icon (no animation)
    const statusIcon = statusIndicator.querySelector('svg')
    await expect(statusIcon).toBeInTheDocument()
    await expect(statusIcon).not.toHaveClass('animate-spin')

    // Verify auto-scroll is disabled for completed session
    const toggleButton = canvas.getByTestId('auto-scroll-toggle')
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false')

    // Verify log content is displayed (check first line - virtualization may not render all)
    await expect(canvas.getByText(/npm install/)).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-complete')
  },
}

/**
 * Unavailable state when the output file doesn't exist.
 * Shows "Output unavailable" message with dimmed styling.
 */
export const Unavailable: Story = {
  args: {
    sessionName: 'unavailable-session',
    status: 'running',
    outputAvailable: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify log viewer container exists
    const logViewer = canvas.getByTestId('log-viewer')
    await expect(logViewer).toBeInTheDocument()

    // Verify "Output unavailable" message
    await expect(canvas.getByText('Output unavailable')).toBeInTheDocument()

    // Verify no status indicator (not shown when output unavailable)
    const streamingIndicator = canvasElement.querySelector('[data-testid="status-indicator-streaming"]')
    const completeIndicator = canvasElement.querySelector('[data-testid="status-indicator-complete"]')
    await expect(streamingIndicator).not.toBeInTheDocument()
    await expect(completeIndicator).not.toBeInTheDocument()

    // Verify no auto-scroll toggle (not shown when output unavailable)
    const toggleButton = canvasElement.querySelector('[data-testid="auto-scroll-toggle"]')
    await expect(toggleButton).not.toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-unavailable')
  },
}

/**
 * Large log with 10,000+ lines demonstrating virtual scrolling performance.
 * Only visible lines are rendered, maintaining smooth 60fps scrolling.
 */
export const LargeLog: Story = {
  args: {
    sessionName: 'large-log-session',
    status: 'completed',
    outputAvailable: true,
    initialContent: generateLargeLog(10000),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify log viewer container exists
    const logViewer = canvas.getByTestId('log-viewer')
    await expect(logViewer).toBeInTheDocument()

    // Verify complete status indicator
    const statusIndicator = canvas.getByTestId('status-indicator-complete')
    await expect(statusIndicator).toBeInTheDocument()

    // Verify log content container exists
    const logContent = canvas.getByTestId('log-content')
    await expect(logContent).toBeInTheDocument()

    // Verify virtualization - should NOT render all 10,000 lines
    // Only a small number of visible lines should be in the DOM
    const renderedLines = canvasElement.querySelectorAll('[data-testid="log-line"]')
    // With overscan of 5 and typical viewport, should render < 100 lines
    await expect(renderedLines.length).toBeLessThan(100)
    await expect(renderedLines.length).toBeGreaterThan(0)

    // Verify first line content is visible
    await expect(canvas.getByText(/Processing item 1 of 10000/)).toBeInTheDocument()

    // Visual snapshot test (limited - snapshot only captures visible portion)
    await matchCanvasSnapshot(canvasElement, 'log-viewer-large-log')
  },
}

/**
 * Empty content state - log viewer with no content yet but output available.
 * Shows empty content area (no loading skeleton when initialContent is empty string).
 */
export const EmptyContent: Story = {
  args: {
    sessionName: 'empty-session',
    status: 'running',
    outputAvailable: true,
    initialContent: '',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify log viewer container exists
    const logViewer = canvas.getByTestId('log-viewer')
    await expect(logViewer).toBeInTheDocument()

    // Verify streaming status indicator
    await expect(canvas.getByTestId('status-indicator-streaming')).toBeInTheDocument()

    // Verify log content area exists
    const logContent = canvas.getByTestId('log-content')
    await expect(logContent).toBeInTheDocument()

    // Verify no loading skeleton (initialContent provided, even if empty)
    const skeleton = canvasElement.querySelector('[data-testid="log-viewer-skeleton"]')
    await expect(skeleton).not.toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-empty')
  },
}

/**
 * Auto-scroll toggle demonstration showing the toggle button states.
 * Use this story to test toggling auto-scroll on and off.
 */
export const AutoScrollToggle: Story = {
  args: {
    sessionName: 'autoscroll-demo',
    status: 'running',
    outputAvailable: true,
    initialContent: streamingLogContent,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify auto-scroll toggle button exists
    const toggleButton = canvas.getByTestId('auto-scroll-toggle')
    await expect(toggleButton).toBeInTheDocument()

    // Verify initial state is enabled (for running session)
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true')

    // Verify toggle button has proper title
    await expect(toggleButton).toHaveAttribute('title', 'Auto-scroll enabled (click to disable)')

    // Verify ArrowDownToLine icon is shown when enabled
    const arrowIcon = canvasElement.querySelector('[data-testid="auto-scroll-toggle"] svg')
    await expect(arrowIcon).toBeInTheDocument()
  },
}

// ============================================================================
// Comparison Stories
// ============================================================================

/**
 * Side-by-side comparison of running vs completed session states.
 * Demonstrates the visual differences in status indicators and auto-scroll defaults.
 */
export const StatusComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Running Session</h3>
        <LogViewer
          sessionName="running-session"
          status="running"
          outputAvailable={true}
          initialContent="[10:00:00] Starting build...\n[10:00:01] Compiling sources...\n[10:00:02] Processing files..."
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Completed Session</h3>
        <LogViewer
          sessionName="completed-session"
          status="completed"
          outputAvailable={true}
          initialContent="[10:00:00] Build started\n[10:00:05] Build completed\n[10:00:05] All tests passed!"
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify section headers
    await expect(canvas.getByText('Running Session')).toBeInTheDocument()
    await expect(canvas.getByText('Completed Session')).toBeInTheDocument()

    // Verify both status indicators
    await expect(canvas.getByTestId('status-indicator-streaming')).toBeInTheDocument()
    await expect(canvas.getByTestId('status-indicator-complete')).toBeInTheDocument()

    // Verify status text
    await expect(canvas.getByText('Streaming')).toBeInTheDocument()
    await expect(canvas.getByText('Complete')).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-status-comparison')
  },
}

/**
 * All edge cases displayed together for visual comparison.
 * Note: In Storybook, WebSocket is not available so Loading shows empty content instead of skeleton.
 */
export const AllStates: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Streaming (active session)</h3>
        <LogViewer
          sessionName="streaming-demo"
          status="running"
          outputAvailable={true}
          initialContent="[10:00:00] Working on task t1...\n[10:00:01] Running tests..."
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Complete (finished session)</h3>
        <LogViewer
          sessionName="complete-demo"
          status="completed"
          outputAvailable={true}
          initialContent="[10:00:00] Story execution complete!\n[10:00:00] All 5 tasks completed."
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Unavailable (no output file)</h3>
        <LogViewer
          sessionName="unavailable-demo"
          status="running"
          outputAvailable={false}
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify section headers
    await expect(canvas.getByText('Streaming (active session)')).toBeInTheDocument()
    await expect(canvas.getByText('Complete (finished session)')).toBeInTheDocument()
    await expect(canvas.getByText('Unavailable (no output file)')).toBeInTheDocument()

    // Verify status indicators
    await expect(canvas.getByTestId('status-indicator-streaming')).toBeInTheDocument()
    await expect(canvas.getByTestId('status-indicator-complete')).toBeInTheDocument()

    // Verify unavailable message
    await expect(canvas.getByText('Output unavailable')).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'log-viewer-all-states')
  },
}
