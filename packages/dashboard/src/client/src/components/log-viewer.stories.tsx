import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
import { LogViewer } from './LogViewer.tsx';

// ============================================================================
// Types
// ============================================================================

/** Preset types for LogViewer states */
type LogPreset = 'empty' | 'short' | 'long' | 'streaming' | 'complete' | 'unavailable' | 'jsonl';

// ============================================================================
// Constants
// ============================================================================

/** Time offset in milliseconds per log line */
const LOG_LINE_TIME_OFFSET_MS = 100;

/** Log level cycle count for modulo operation */
const LOG_LEVEL_COUNT = 4;

/** Large log line count for performance testing */
const LARGE_LOG_LINE_COUNT = 10_000;

/** Maximum rendered lines for virtualization test */
const MAX_RENDERED_LINES_THRESHOLD = 100;

/** Minimum log viewer count in Showcase */
const MIN_SHOWCASE_LOG_VIEWERS = 5;

// ============================================================================
// Mock Data
// ============================================================================

/** Short sample log content for typical display */
const shortLogContent = `$ npm install
added 1523 packages in 12.4s

$ npm run build
> saga-dashboard@1.0.0 build
> vite build

vite v5.2.0 building for production...
✓ 127 modules transformed.
✓ built in 3.21s

Build completed successfully!`;

/** Medium sample log content with more details */
const mediumLogContent = `$ npm install
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

Build completed successfully!`;

/** Sample streaming log content */
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
[2026-01-30 10:00:08] Implementing auth service...`;

/** Sample JSONL content with realistic structured messages (raw strings to preserve API wire format) */
const jsonlLogContent = `{"type":"saga_worker","subtype":"pipeline_start","timestamp":"2026-01-30T10:00:00Z","storyId":"add-user-auth"}
{"type":"saga_worker","subtype":"cycle_start","timestamp":"2026-01-30T10:00:01Z","cycle":1,"maxCycles":5}
{"type":"assistant","message":{"content":[{"type":"text","text":"I'll start by reading the existing authentication module to understand the current setup."}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","id":"tool_1","name":"Read","input":{"file_path":"/src/auth/index.ts"}}]}}
{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tool_1","content":"export function login() { /* ... */ }"}]}}
{"type":"assistant","message":{"content":[{"type":"text","text":"Now let me write the tests first, following TDD."},{"type":"tool_use","id":"tool_2","name":"Write","input":{"file_path":"/src/auth/auth.test.ts"}}]}}
{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tool_2","content":"File written successfully"}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","id":"tool_3","name":"Bash","input":{"command":"cd /src && pnpm test auth.test.ts"}}]}}
{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tool_3","content":"FAIL src/auth/auth.test.ts\\n  ✕ should authenticate user (3ms)\\n  ✕ should reject invalid credentials (1ms)\\n\\nTests: 2 failed, 2 total"}]}}
{"type":"assistant","message":{"content":[{"type":"text","text":"Tests are failing as expected. Now I'll implement the authentication logic."}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","id":"tool_4","name":"Edit","input":{"file_path":"/src/auth/index.ts"}}]}}
{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tool_4","content":"File edited successfully"}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","id":"tool_5","name":"Bash","input":{"command":"cd /src && pnpm test auth.test.ts"}}]}}
{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tool_5","content":"PASS src/auth/auth.test.ts\\n  ✓ should authenticate user (2ms)\\n  ✓ should reject invalid credentials (1ms)\\n\\nTests: 2 passed, 2 total"}]}}
{"type":"assistant","message":{"content":[{"type":"text","text":"All tests passing. Let me commit the changes."}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","id":"tool_6","name":"Bash","input":{"command":"git add -A && git commit -m \\"feat(add-user-auth): implement authentication\\""}}]}}
{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tool_6","content":"[add-user-auth abc1234] feat(add-user-auth): implement authentication\\n 2 files changed, 45 insertions(+)"}]}}
{"type":"saga_worker","subtype":"cycle_end","timestamp":"2026-01-30T10:05:00Z","cycle":1,"exitCode":0}
{"type":"saga_worker","subtype":"pipeline_end","timestamp":"2026-01-30T10:05:01Z","storyId":"add-user-auth","status":"completed","exitCode":0,"cycles":1,"elapsedMinutes":5}`;

/** Generate large log content for performance testing */
function generateLargeLog(lineCount: number): string {
  const lines: string[] = [];
  // Use a static base time for reproducible snapshots
  const baseTime = new Date('2026-01-30T10:00:00.000Z').getTime();
  for (let i = 1; i <= lineCount; i++) {
    const timestamp = new Date(baseTime + i * LOG_LINE_TIME_OFFSET_MS).toISOString();
    const logLevel = ['INFO', 'DEBUG', 'WARN', 'ERROR'][i % LOG_LEVEL_COUNT];
    lines.push(`[${timestamp}] [${logLevel}] Processing item ${i} of ${lineCount}...`);
  }
  return lines.join('\n');
}

/** Get log content for a preset */
function getLogContentForPreset(preset: LogPreset): string {
  switch (preset) {
    case 'empty':
      return '';
    case 'short':
      return shortLogContent;
    case 'long':
      return generateLargeLog(LARGE_LOG_LINE_COUNT);
    case 'streaming':
      return streamingLogContent;
    case 'complete':
      return mediumLogContent;
    case 'unavailable':
      return '';
    case 'jsonl':
      return jsonlLogContent;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

/** Get session status for a preset */
function getStatusForPreset(preset: LogPreset): 'running' | 'completed' {
  switch (preset) {
    case 'empty':
    case 'streaming':
    case 'unavailable':
      return 'running';
    case 'short':
    case 'long':
    case 'complete':
    case 'jsonl':
      return 'completed';
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

/** Check if output is available for a preset */
function isOutputAvailableForPreset(preset: LogPreset): boolean {
  return preset !== 'unavailable';
}

/** Convert preset to display label */
function presetToLabel(preset: LogPreset): string {
  switch (preset) {
    case 'empty':
      return 'Empty Log';
    case 'short':
      return 'Short Log';
    case 'long':
      return 'Long Log (10K lines)';
    case 'streaming':
      return 'Streaming';
    case 'complete':
      return 'Complete';
    case 'unavailable':
      return 'Output Unavailable';
    case 'jsonl':
      return 'JSONL (Structured Messages)';
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

// ============================================================================
// Showcase Sections
// ============================================================================

/** Log states section component */
function LogStatesSection(): React.JSX.Element {
  return (
    <section aria-label="Log States">
      <h3 className="text-sm font-semibold text-text-muted mb-3">Log States</h3>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-muted mb-2">Empty Log (no content)</p>
          <div className="h-32">
            <LogViewer
              sessionName="empty-session"
              status="running"
              outputAvailable={true}
              initialContent=""
            />
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-2">Short Log (typical output)</p>
          <div className="h-48">
            <LogViewer
              sessionName="short-session"
              status="completed"
              outputAvailable={true}
              initialContent={shortLogContent}
            />
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-2">
            Long Log (10,000 lines - virtualized scrolling)
          </p>
          <div className="h-48">
            <LogViewer
              sessionName="long-session"
              status="completed"
              outputAvailable={true}
              initialContent={generateLargeLog(LARGE_LOG_LINE_COUNT)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Status indicators section component */
function StatusIndicatorsSection(): React.JSX.Element {
  return (
    <section aria-label="Status Indicators">
      <h3 className="text-sm font-semibold text-text-muted mb-3">Status Indicators</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-text-muted mb-2">Streaming (running session)</p>
          <div className="h-32">
            <LogViewer
              sessionName="streaming-session"
              status="running"
              outputAvailable={true}
              initialContent="[10:00:00] Working on task t1...\n[10:00:01] Running tests..."
            />
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-2">Complete (finished session)</p>
          <div className="h-32">
            <LogViewer
              sessionName="complete-session"
              status="completed"
              outputAvailable={true}
              initialContent="[10:00:00] Story execution complete!\n[10:00:00] All 5 tasks completed."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** JSONL structured messages section component */
function JsonlMessagesSection(): React.JSX.Element {
  return (
    <section aria-label="JSONL Messages">
      <h3 className="text-sm font-semibold text-text-muted mb-3">JSONL Structured Messages</h3>
      <div>
        <p className="text-xs text-text-muted mb-2">
          Realistic session with worker events, assistant text, tool calls, and results
        </p>
        <div className="h-72">
          <LogViewer
            sessionName="jsonl-session"
            status="completed"
            outputAvailable={true}
            initialContent={jsonlLogContent}
          />
        </div>
      </div>
    </section>
  );
}

/** Edge cases section component */
function EdgeCasesSection(): React.JSX.Element {
  return (
    <section aria-label="Edge Cases">
      <h3 className="text-sm font-semibold text-text-muted mb-3">Edge Cases</h3>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-muted mb-2">Output Unavailable</p>
          <div className="h-24">
            <LogViewer sessionName="unavailable-session" status="running" outputAvailable={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Story Meta
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
 * - "Output unavailable" state for missing output files
 */
const meta: Meta<{ preset: LogPreset; customContent: string }> = {
  title: 'Components/LogViewer',
  argTypes: {
    preset: {
      control: 'select',
      options: [
        'empty',
        'short',
        'long',
        'streaming',
        'complete',
        'unavailable',
        'jsonl',
      ] satisfies LogPreset[],
      description: 'Select a log preset to display',
    },
    customContent: {
      control: 'text',
      description: 'Custom log content (overrides preset)',
    },
  },
  args: {
    preset: 'short',
    customContent: '',
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displaying representative LogViewer states:
 * - Empty, short, and long logs
 * - Status indicators (streaming vs complete)
 * - Edge cases (output unavailable)
 */
export const Showcase: Story = {
  render: () => (
    <div className="space-y-8 p-4">
      <LogStatesSection />
      <JsonlMessagesSection />
      <StatusIndicatorsSection />
      <EdgeCasesSection />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify section headers
    await expect(canvas.getByRole('region', { name: 'Log States' })).toBeInTheDocument();
    await expect(canvas.getByRole('region', { name: 'JSONL Messages' })).toBeInTheDocument();
    await expect(canvas.getByRole('region', { name: 'Status Indicators' })).toBeInTheDocument();
    await expect(canvas.getByRole('region', { name: 'Edge Cases' })).toBeInTheDocument();

    // Verify log viewers are rendered
    const logViewers = canvas.getAllByTestId('log-viewer');
    await expect(logViewers.length).toBeGreaterThanOrEqual(MIN_SHOWCASE_LOG_VIEWERS);

    // Verify status indicators are present
    const streamingIndicators = canvas.getAllByTestId('status-indicator-streaming');
    await expect(streamingIndicators.length).toBeGreaterThanOrEqual(1);

    const completeIndicators = canvas.getAllByTestId('status-indicator-complete');
    await expect(completeIndicators.length).toBeGreaterThanOrEqual(1);

    // Verify "Output unavailable" message
    await expect(canvas.getByText('Output unavailable')).toBeInTheDocument();

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'log-viewer-showcase');
    await matchPixelSnapshot(canvasElement, 'log-viewer-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring LogViewer with different presets
 * and custom content.
 */
export const Playground: Story = {
  args: {
    preset: 'short',
    customContent: '',
  },
  render: (args) => {
    const content = args.customContent || getLogContentForPreset(args.preset);
    const status = getStatusForPreset(args.preset);
    const outputAvailable = isOutputAvailableForPreset(args.preset);

    return (
      <div className="space-y-4 p-4">
        <div className="text-sm text-text-muted">
          <span className="font-medium">Preset:</span> {presetToLabel(args.preset)}
          {args.customContent && ' (overridden with custom content)'}
        </div>
        <div className="h-96">
          <LogViewer
            sessionName={`${args.preset}-session`}
            status={status}
            outputAvailable={outputAvailable}
            initialContent={content}
          />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify preset label is displayed
    await expect(canvas.getByText(presetToLabel(args.preset))).toBeInTheDocument();

    // Verify log viewer is rendered
    const logViewer = canvas.getByTestId('log-viewer');
    await expect(logViewer).toBeInTheDocument();

    // Verify appropriate status based on preset
    if (args.preset === 'unavailable') {
      await expect(canvas.getByText('Output unavailable')).toBeInTheDocument();
    } else {
      const status = getStatusForPreset(args.preset);
      if (status === 'running') {
        await expect(canvas.getByTestId('status-indicator-streaming')).toBeInTheDocument();
      } else {
        await expect(canvas.getByTestId('status-indicator-complete')).toBeInTheDocument();
      }
    }

    // For long preset, verify virtualization
    if (args.preset === 'long') {
      const renderedLines = canvas.queryAllByTestId('log-line');
      await expect(renderedLines.length).toBeLessThan(MAX_RENDERED_LINES_THRESHOLD);
      await expect(renderedLines.length).toBeGreaterThan(0);
    }
  },
};

export default meta;
