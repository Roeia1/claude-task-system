import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertCircle, CheckCircle, Circle } from 'lucide-react';
import { expect, within } from 'storybook/test';
import { JournalEntryItem } from '@/pages/StoryDetail';
import { createMockJournal, type JournalPreset } from '@/test-utils/mock-factories';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';

// ============================================================================
// Types
// ============================================================================

type JournalPresetOption = JournalPreset;

// ============================================================================
// Constants
// ============================================================================

const JOURNAL_PRESETS: JournalPresetOption[] = ['session', 'blocker', 'resolution'];

// Test IDs for icon components
const ICON_ALERT_CIRCLE = 'icon-alert-circle';
const ICON_CHEVRON_RIGHT = 'icon-chevron-right';
const ICON_CHEVRON_DOWN = 'icon-chevron-down';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Converts a preset name to a display label.
 */
function presetToLabel(preset: JournalPresetOption): string {
  const labels: Record<JournalPresetOption, string> = {
    session: 'Session',
    blocker: 'Blocker',
    resolution: 'Resolution',
  };
  return labels[preset];
}

// ============================================================================
// Showcase Section Components
// ============================================================================

/** Entry Types section showing all journal entry type variants */
function EntryTypesSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold text-text mb-4">Journal Entry Types</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-text-muted mb-2">
            Session Entry - neutral styling, collapsed by default
          </p>
          <JournalEntryItem
            entry={createMockJournal('session', {
              title: 'Session: 2026-01-28 01:00 UTC',
              content: `### Task: t1 - Setup project structure

**What was done:**
- Initialized the repository
- Added dependencies to package.json
- Created folder structure

**Decisions:**
- Used Vite for faster development builds
- Chose vitest for testing (better ESM support)`,
              timestamp: '2026-01-28 01:00 UTC',
            })}
          />
        </div>
        <div>
          <p className="text-sm text-text-muted mb-2">
            Blocker Entry - danger styling, shows alert icon
          </p>
          <JournalEntryItem
            entry={createMockJournal('blocker', {
              title: 'Blocked: Missing API credentials',
              content: `## Blocker: Cannot access external API

**Task**: t2 - Implement API integration
**What I need**: API credentials from the team lead`,
              timestamp: '2026-01-28 10:00 UTC',
            })}
            defaultOpen={true}
          />
        </div>
        <div>
          <p className="text-sm text-text-muted mb-2">
            Resolution Entry - success styling, shows how blocker was resolved
          </p>
          <JournalEntryItem
            entry={createMockJournal('resolution', {
              title: 'Resolution: API credentials received',
              content: `## Resolution

**Blocker resolved**: API credentials obtained from team lead

**Action taken**:
- Added credentials to .env file
- Verified API connection works`,
              timestamp: '2026-01-28 14:30 UTC',
            })}
            defaultOpen={true}
          />
        </div>
      </div>
    </section>
  );
}

/** Collapsed vs Expanded section */
function CollapsedExpandedSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold text-text mb-4">Collapsed vs Expanded</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-text-muted mb-2">Collapsed (default)</p>
          <JournalEntryItem
            entry={createMockJournal('session', {
              title: 'Session: Collapsed state',
              content: 'This content is hidden until expanded.',
            })}
            defaultOpen={false}
          />
        </div>
        <div>
          <p className="text-sm text-text-muted mb-2">Expanded</p>
          <JournalEntryItem
            entry={createMockJournal('session', {
              title: 'Session: Expanded state',
              content: 'This content is visible because defaultOpen is true.',
            })}
            defaultOpen={true}
          />
        </div>
      </div>
    </section>
  );
}

/** Grouped Journal Display section */
function GroupedDisplaySection() {
  return (
    <section>
      <h3 className="text-lg font-semibold text-text mb-4">Grouped Journal Display</h3>
      <p className="text-sm text-text-muted mb-4">
        Journal entries are typically grouped by type in the StoryDetail page:
      </p>
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Blockers (1)
          </h4>
          <JournalEntryItem
            entry={createMockJournal('blocker', {
              title: 'Blocked: Database schema unclear',
              content: 'Need clarification on the data model before proceeding.',
            })}
            defaultOpen={true}
          />
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-success flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Resolutions (1)
          </h4>
          <JournalEntryItem
            entry={createMockJournal('resolution', {
              title: 'Resolution: Schema finalized',
              content: 'Team agreed on schema. Using normalized approach.',
            })}
          />
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-text flex items-center gap-2">
            <Circle className="w-4 h-4" />
            Sessions (2)
          </h4>
          <JournalEntryItem
            entry={createMockJournal('session', {
              title: 'Session: 2026-01-28 09:00 UTC',
              content: 'Completed initial setup tasks.',
              timestamp: '2026-01-28 09:00 UTC',
            })}
          />
          <JournalEntryItem
            entry={createMockJournal('session', {
              title: 'Session: 2026-01-27 14:00 UTC',
              content: 'Started project, created repository.',
              timestamp: '2026-01-27 14:00 UTC',
            })}
          />
        </div>
      </div>
    </section>
  );
}

/** Edge Cases section */
function EdgeCasesSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold text-text mb-4">Edge Cases</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-text-muted mb-2">Long title</p>
          <JournalEntryItem
            entry={createMockJournal('session', {
              title:
                'Session: 2026-01-28 01:00 UTC - This is a very long session title that might wrap to multiple lines',
              content: 'Content for long title entry.',
            })}
          />
        </div>
        <div>
          <p className="text-sm text-text-muted mb-2">Long content with markdown</p>
          <JournalEntryItem
            entry={createMockJournal('session', {
              title: 'Session: Detailed work log',
              content: `### Task: t1 - Complex implementation

**What was done:**
- Refactored the entire authentication module
- Added support for OAuth2 providers
- Implemented token refresh mechanism

**Decisions:**
- Chose Passport.js for OAuth integration
- Used Redis for session storage`,
            })}
            defaultOpen={true}
          />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Meta
// ============================================================================

const meta: Meta<{ preset: JournalPresetOption; content: string }> = {
  title: 'Components/JournalEntry',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Collapsible journal entry component for session logs, blockers, and resolutions. Color-coded: neutral for sessions, red for blockers, green for resolutions.',
      },
    },
  },
  argTypes: {
    preset: {
      control: 'select',
      options: JOURNAL_PRESETS,
      description: 'Journal entry type preset',
    },
    content: {
      control: 'text',
      description: 'Custom content for the journal entry',
    },
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displaying all journal entry types and variations.
 */
const Showcase: Story = {
  render: () => (
    <div className="space-y-8">
      <EntryTypesSection />
      <CollapsedExpandedSection />
      <GroupedDisplaySection />
      <EdgeCasesSection />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify section headers
    await expect(canvas.getByText('Journal Entry Types')).toBeInTheDocument();
    await expect(canvas.getByText('Collapsed vs Expanded')).toBeInTheDocument();
    await expect(canvas.getByText('Grouped Journal Display')).toBeInTheDocument();
    await expect(canvas.getByText('Edge Cases')).toBeInTheDocument();

    // Verify entry types are displayed
    await expect(canvas.getByText('Session: 2026-01-28 01:00 UTC')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked: Missing API credentials')).toBeInTheDocument();
    await expect(canvas.getByText('Resolution: API credentials received')).toBeInTheDocument();

    // Verify type badges (multiple entries of each type exist)
    const sessionBadges = canvas.getAllByText('session');
    await expect(sessionBadges.length).toBeGreaterThanOrEqual(1);
    const blockerBadges = canvas.getAllByText('blocker');
    await expect(blockerBadges.length).toBeGreaterThanOrEqual(1);
    const resolutionBadges = canvas.getAllByText('resolution');
    await expect(resolutionBadges.length).toBeGreaterThanOrEqual(1);

    // Verify blocker entries have alert icons (multiple blockers in showcase)
    const alertIcons = canvas.getAllByTestId(ICON_ALERT_CIRCLE);
    await expect(alertIcons.length).toBeGreaterThanOrEqual(1);

    // Verify collapsed state has chevron-right
    const chevronRights = canvas.getAllByTestId(ICON_CHEVRON_RIGHT);
    await expect(chevronRights.length).toBeGreaterThanOrEqual(1);

    // Verify expanded state has chevron-down
    const chevronDowns = canvas.getAllByTestId(ICON_CHEVRON_DOWN);
    await expect(chevronDowns.length).toBeGreaterThanOrEqual(1);

    // Verify grouped display section headers
    await expect(canvas.getByText('Blockers (1)')).toBeInTheDocument();
    await expect(canvas.getByText('Resolutions (1)')).toBeInTheDocument();
    await expect(canvas.getByText('Sessions (2)')).toBeInTheDocument();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'journal-entry-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring JournalEntry component.
 */
const Playground: Story = {
  args: {
    preset: 'session',
    content: '',
  },
  render: (args) => {
    const entry = createMockJournal(args.preset, {
      title: `${presetToLabel(args.preset)}: Custom entry`,
      content: args.content || undefined,
    });

    return (
      <div className="space-y-4">
        <div className="p-4 bg-bg-dark rounded-lg border border-border-muted">
          <p className="text-sm text-text-muted">
            <strong>Preset:</strong> {presetToLabel(args.preset)}
          </p>
          <p className="text-sm text-text-muted">
            <strong>Type:</strong> {entry.type}
          </p>
          {args.content && (
            <p className="text-sm text-text-muted">
              <strong>Custom content:</strong> Yes
            </p>
          )}
        </div>

        <div>
          <p className="text-sm text-text-muted mb-2">Collapsed state:</p>
          <JournalEntryItem entry={entry} defaultOpen={false} />
        </div>

        <div>
          <p className="text-sm text-text-muted mb-2">Expanded state:</p>
          <JournalEntryItem entry={entry} defaultOpen={true} />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify preset info is displayed
    await expect(canvas.getByText('Preset:')).toBeInTheDocument();
    await expect(canvas.getByText(presetToLabel(args.preset))).toBeInTheDocument();

    // Verify both collapsed and expanded states are shown
    await expect(canvas.getByText('Collapsed state:')).toBeInTheDocument();
    await expect(canvas.getByText('Expanded state:')).toBeInTheDocument();

    // Verify entry title is displayed (appears twice - collapsed and expanded)
    const entryTitles = canvas.getAllByText(`${presetToLabel(args.preset)}: Custom entry`);
    await expect(entryTitles.length).toBe(2);

    // Verify type badge is displayed (3: info panel + collapsed + expanded)
    const typeBadges = canvas.getAllByText(args.preset);
    await expect(typeBadges.length).toBeGreaterThanOrEqual(2);

    // Verify collapsed has chevron-right and expanded has chevron-down
    const chevronRight = canvas.getByTestId(ICON_CHEVRON_RIGHT);
    await expect(chevronRight).toBeInTheDocument();
    const chevronDown = canvas.getByTestId(ICON_CHEVRON_DOWN);
    await expect(chevronDown).toBeInTheDocument();

    // Verify blocker preset has alert icon
    if (args.preset === 'blocker') {
      const alertIcons = canvas.getAllByTestId(ICON_ALERT_CIRCLE);
      await expect(alertIcons.length).toBe(2);
    }
  },
};

export { Showcase, Playground };
export default meta;
