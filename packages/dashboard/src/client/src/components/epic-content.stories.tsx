import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
import { EpicContent } from './EpicContent.tsx';

/** Regex pattern for matching Epic Documentation button (case insensitive) */
const EPIC_DOCUMENTATION_PATTERN = /epic documentation/i;

/** Minimum number of EpicContent components expected in Showcase */
const SHOWCASE_MIN_EPIC_CONTENT_COUNT = 5;

// ============================================================================
// Content Presets
// ============================================================================

/** Available markdown content presets */
type ContentPreset =
  | 'simple'
  | 'headings'
  | 'lists'
  | 'code-blocks'
  | 'tables'
  | 'gfm-features'
  | 'complete';

const contentPresets: Record<ContentPreset, string> = {
  simple: 'This is a simple epic description without any markdown formatting.',

  headings: `# Main Heading

## Secondary Heading

### Tertiary Heading

Regular paragraph text below the headings.`,

  lists: `## Unordered List

- First item
- Second item
- Third item with nested content
  - Nested item 1
  - Nested item 2

## Ordered List

1. Step one
2. Step two
3. Step three`,

  'code-blocks': `## Code Examples

Use the \`npm install\` command to install dependencies.

\`\`\`typescript
interface Epic {
  slug: string;
  title: string;
  content?: string;
}

const epic: Epic = {
  slug: 'my-epic',
  title: 'My Epic',
  content: '# Documentation',
};
\`\`\`

\`\`\`bash
# Run the dashboard
saga dashboard
\`\`\``,

  tables: `## Story Status Reference

| Status | Description | Color |
|--------|-------------|-------|
| ready | Not yet started | Gray |
| in_progress | Currently being worked on | Blue |
| blocked | Cannot proceed | Red |
| completed | Successfully finished | Green |`,

  'gfm-features': `## GFM Features

### Strikethrough

~~This feature has been deprecated.~~

The new approach is documented below.

### Links

Check out the [SAGA documentation](https://github.com/example/saga) for more details.

You can also visit [the wiki](https://github.com/example/saga/wiki) for additional guides.`,

  complete: `# Dashboard Restructure Epic

This epic covers the complete restructuring of the SAGA dashboard to improve usability and add new features.

## Goals

- Improve navigation with breadcrumbs
- Add epic content display with markdown rendering
- Implement session management UI
- Add visual regression testing

## Architecture

The dashboard follows a standard React SPA architecture:

| Component | Purpose |
|-----------|---------|
| Layout | Main application shell |
| EpicList | List all epics with status |
| EpicDetail | Show epic with stories |
| StoryDetail | Show story with tasks |

## Technical Requirements

### Frontend

- React 18 with TypeScript
- TailwindCSS for styling
- Radix UI for accessible components

### Backend

\`\`\`typescript
// Session API endpoint
app.get('/api/sessions', async (req, res) => {
  const sessions = await getSessions();
  res.json(sessions);
});
\`\`\`

## Status

~~Phase 1 is complete.~~

Currently working on Phase 2.

See the [project board](https://github.com/example/saga/projects/1) for details.`,
};

/** Convert preset to display label */
function presetToLabel(preset: ContentPreset): string {
  switch (preset) {
    case 'simple':
      return 'Simple Text';
    case 'headings':
      return 'Headings';
    case 'lists':
      return 'Lists';
    case 'code-blocks':
      return 'Code Blocks';
    case 'tables':
      return 'Tables';
    case 'gfm-features':
      return 'GFM Features';
    case 'complete':
      return 'Complete Example';
    default: {
      const _exhaustive: never = preset;
      return String(_exhaustive);
    }
  }
}

// ============================================================================
// Meta Configuration
// ============================================================================

/**
 * EpicContent displays epic documentation in a collapsible section with
 * full markdown rendering support including GFM (GitHub Flavored Markdown).
 *
 * **Features:**
 * - Collapsible panel (expanded by default)
 * - Full markdown rendering via react-markdown
 * - GFM support for tables, strikethrough, etc.
 * - Prose typography styling via @tailwindcss/typography
 */
const meta: Meta<{ preset: ContentPreset; customContent: string }> = {
  title: 'Components/EpicContent',
  parameters: {
    docs: {
      description: {
        component: `
EpicContent renders epic documentation with full markdown support.

## Features
- **Collapsible**: Expands/collapses with a toggle button
- **Markdown rendering**: Headers, lists, code blocks, links, etc.
- **GFM support**: Tables, strikethrough, task lists
- **Prose styling**: Uses \`@tailwindcss/typography\` for beautiful typography
        `,
      },
    },
  },
  argTypes: {
    preset: {
      control: 'select',
      options: ['simple', 'headings', 'lists', 'code-blocks', 'tables', 'gfm-features', 'complete'],
      description: 'Select a content preset to display',
    },
    customContent: {
      control: 'text',
      description: 'Custom markdown content (overrides preset)',
    },
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Sections
// ============================================================================

/** Section showing empty state */
function EmptyStateSection(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Empty Content</h3>
      <p className="text-xs text-muted-foreground">
        Component returns null when content is undefined
      </p>
      <div className="rounded border border-dashed border-muted p-4">
        <EpicContent content={undefined} />
        <span className="text-xs text-muted-foreground">(nothing renders)</span>
      </div>
    </div>
  );
}

/** Section showing markdown features */
function MarkdownFeaturesSection(): React.JSX.Element {
  const presets: ContentPreset[] = ['simple', 'headings', 'lists', 'code-blocks', 'tables'];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Markdown Features</h3>
      <div className="space-y-6">
        {presets.map((preset) => (
          <div key={preset} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">{presetToLabel(preset)}</h4>
            <EpicContent content={contentPresets[preset]} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Section showing GFM-specific features */
function GfmFeaturesSection(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">GFM Features</h3>
      <p className="text-xs text-muted-foreground">Strikethrough text and link rendering</p>
      <EpicContent content={contentPresets['gfm-features']} />
    </div>
  );
}

/** Section showing collapsible behavior */
function CollapsibleBehaviorSection(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Collapsible Behavior</h3>
      <p className="text-xs text-muted-foreground">Click the header to expand/collapse content</p>
      <EpicContent
        content={`# Epic Overview

This content can be collapsed and expanded by clicking the header.

## Goals

- Demonstrate collapsible functionality
- Show toggle state changes`}
      />
    </div>
  );
}

/** Section showing complete example */
function CompleteExampleSection(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Complete Example</h3>
      <p className="text-xs text-muted-foreground">
        Realistic epic documentation with all markdown features
      </p>
      <EpicContent content={contentPresets.complete} />
    </div>
  );
}

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displays representative examples of EpicContent rendering:
 * - Empty content (null state)
 * - Markdown features (text, headings, lists, code blocks, tables)
 * - GFM features (strikethrough, links)
 * - Collapsible behavior
 * - Complete example with all features
 */
export const Showcase: Story = {
  render: () => (
    <div className="space-y-8">
      <EmptyStateSection />
      <MarkdownFeaturesSection />
      <GfmFeaturesSection />
      <CollapsibleBehaviorSection />
      <CompleteExampleSection />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify EpicContent components are rendered
    const epicContents = canvas.getAllByTestId('epic-content');
    await expect(epicContents.length).toBeGreaterThan(SHOWCASE_MIN_EPIC_CONTENT_COUNT);

    // Check markdown features render: tables, code blocks
    await expect(canvas.getAllByRole('table').length).toBeGreaterThanOrEqual(2);
    await expect(canvas.getAllByRole('code').length).toBeGreaterThan(0);

    // Check GFM: strikethrough
    const strikethroughTexts = canvas.getAllByText('This feature has been deprecated.');
    await expect(strikethroughTexts[0].tagName).toBe('DEL');

    // Visual snapshots
    await matchDomSnapshot(canvasElement, 'epic-content-showcase');
    await matchPixelSnapshot(canvasElement, 'epic-content-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Playground allows interactive exploration of EpicContent with:
 * - Preset selector for quick content examples
 * - Custom markdown content textarea for testing any content
 */
export const Playground: Story = {
  args: {
    preset: 'complete',
    customContent: '',
  },
  render: ({ preset, customContent }) => {
    const content = customContent || contentPresets[preset];
    const displayLabel = customContent ? 'Custom Content' : presetToLabel(preset);

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <strong>Content:</strong> {displayLabel}
        </div>
        <EpicContent content={content} />
      </div>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify the content label is shown
    const displayLabel = args.customContent ? 'Custom Content' : presetToLabel(args.preset);
    await expect(canvas.getByText(displayLabel, { exact: false })).toBeInTheDocument();

    // Verify EpicContent renders
    const epicContent = canvas.getByTestId('epic-content');
    await expect(epicContent).toBeInTheDocument();
    await expect(epicContent).toHaveAttribute('data-state', 'open');

    // Test collapsible behavior
    const trigger = canvas.getByRole('button', {
      name: EPIC_DOCUMENTATION_PATTERN,
    });
    await userEvent.click(trigger);
    await expect(epicContent).toHaveAttribute('data-state', 'closed');
    await userEvent.click(trigger);
    await expect(epicContent).toHaveAttribute('data-state', 'open');
  },
};

export default meta;
