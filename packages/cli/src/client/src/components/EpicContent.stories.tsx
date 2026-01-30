import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';
import { EpicContent } from './EpicContent';

// ============================================================================
// EpicContent Stories
// ============================================================================

/**
 * EpicContent displays epic documentation in a collapsible section with
 * full markdown rendering support including GFM (GitHub Flavored Markdown).
 *
 * Features:
 * - Collapsible panel (expanded by default)
 * - Full markdown rendering via react-markdown
 * - GFM support for tables, strikethrough, etc.
 * - Prose typography styling via @tailwindcss/typography
 */
const meta: Meta<typeof EpicContent> = {
  title: 'Components/EpicContent',
  component: EpicContent,
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
};

export default meta;
type Story = StoryObj<typeof EpicContent>;

// ============================================================================
// Basic Stories
// ============================================================================

/**
 * Empty content - component returns null and renders nothing.
 */
export const EmptyContent: Story = {
  render: () => <EpicContent content={undefined} />,
  play: async ({ canvasElement }) => {
    // Component should render nothing for empty content
    await expect(canvasElement.querySelector('[data-testid="epic-content"]')).toBeNull();
  },
};

/**
 * Simple text content without markdown formatting.
 */
export const SimpleText: Story = {
  render: () => (
    <EpicContent content="This is a simple epic description without any markdown formatting." />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Epic Documentation')).toBeInTheDocument();
    await expect(
      canvas.getByText('This is a simple epic description without any markdown formatting.'),
    ).toBeInTheDocument();
  },
};

// ============================================================================
// Markdown Rendering Stories
// ============================================================================

/**
 * Headings - demonstrates h1, h2, h3 rendering with proper hierarchy.
 */
export const Headings: Story = {
  render: () => (
    <EpicContent
      content={`# Main Heading

## Secondary Heading

### Tertiary Heading

Regular paragraph text below the headings.`}
    />
  ),
  play: async ({ canvasElement }) => {
    const epicContent = canvasElement.querySelector('[data-testid="epic-content"]');
    await expect(epicContent).not.toBeNull();

    // Query within the prose container to avoid the "Epic Documentation" h2 header
    const proseContainer = epicContent?.querySelector('.prose');
    await expect(proseContainer).not.toBeNull();

    // Check headings are rendered
    await expect(proseContainer?.querySelector('h1')).toHaveTextContent('Main Heading');
    await expect(proseContainer?.querySelector('h2')).toHaveTextContent('Secondary Heading');
    await expect(proseContainer?.querySelector('h3')).toHaveTextContent('Tertiary Heading');

    // Visual snapshot
    await matchCanvasSnapshot(canvasElement, 'epic-content-headings');
  },
};

/**
 * Lists - demonstrates unordered and ordered list rendering.
 */
export const Lists: Story = {
  render: () => (
    <EpicContent
      content={`## Unordered List

- First item
- Second item
- Third item with nested content
  - Nested item 1
  - Nested item 2

## Ordered List

1. Step one
2. Step two
3. Step three`}
    />
  ),
  play: async ({ canvasElement }) => {
    const epicContent = canvasElement.querySelector('[data-testid="epic-content"]');
    await expect(epicContent).not.toBeNull();

    // Check lists are rendered
    await expect(epicContent?.querySelector('ul')).toBeInTheDocument();
    await expect(epicContent?.querySelector('ol')).toBeInTheDocument();

    // Visual snapshot
    await matchCanvasSnapshot(canvasElement, 'epic-content-lists');
  },
};

/**
 * Code blocks - demonstrates inline code and fenced code block rendering.
 */
export const CodeBlocks: Story = {
  render: () => (
    <EpicContent
      content={`## Code Examples

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
\`\`\``}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const epicContent = canvasElement.querySelector('[data-testid="epic-content"]');
    await expect(epicContent).not.toBeNull();

    // Check inline code
    await expect(canvas.getByText('npm install')).toBeInTheDocument();

    // Check code blocks
    await expect(epicContent?.querySelectorAll('pre').length).toBeGreaterThanOrEqual(2);

    // Visual snapshot
    await matchCanvasSnapshot(canvasElement, 'epic-content-code-blocks');
  },
};

/**
 * Tables - demonstrates GFM table rendering.
 */
export const Tables: Story = {
  render: () => (
    <EpicContent
      content={`## Story Status Reference

| Status | Description | Color |
|--------|-------------|-------|
| ready | Not yet started | Gray |
| in_progress | Currently being worked on | Blue |
| blocked | Cannot proceed | Red |
| completed | Successfully finished | Green |`}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const epicContent = canvasElement.querySelector('[data-testid="epic-content"]');
    await expect(epicContent).not.toBeNull();

    // Check table is rendered
    await expect(epicContent?.querySelector('table')).toBeInTheDocument();
    await expect(canvas.getByText('Status')).toBeInTheDocument();
    await expect(canvas.getByText('in_progress')).toBeInTheDocument();

    // Visual snapshot
    await matchCanvasSnapshot(canvasElement, 'epic-content-tables');
  },
};

/**
 * Links - demonstrates link rendering.
 */
export const Links: Story = {
  render: () => (
    <EpicContent
      content={`## Resources

Check out the [SAGA documentation](https://github.com/example/saga) for more details.

You can also visit [the wiki](https://github.com/example/saga/wiki) for additional guides.`}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check links are rendered
    const docLink = canvas.getByRole('link', { name: 'SAGA documentation' });
    await expect(docLink).toHaveAttribute('href', 'https://github.com/example/saga');

    const wikiLink = canvas.getByRole('link', { name: 'the wiki' });
    await expect(wikiLink).toHaveAttribute('href', 'https://github.com/example/saga/wiki');
  },
};

/**
 * GFM Strikethrough - demonstrates strikethrough text rendering.
 */
export const Strikethrough: Story = {
  render: () => (
    <EpicContent
      content={`## Updates

~~This feature has been deprecated.~~

The new approach is documented below.`}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check strikethrough is rendered
    const deletedText = canvas.getByText('This feature has been deprecated.');
    await expect(deletedText.tagName).toBe('DEL');
  },
};

// ============================================================================
// Collapsible Behavior Stories
// ============================================================================

/**
 * Collapsible interaction - demonstrates expand/collapse behavior.
 */
export const CollapsibleBehavior: Story = {
  render: () => (
    <EpicContent
      content={`# Epic Overview

This content can be collapsed and expanded by clicking the header.

## Goals

- Demonstrate collapsible functionality
- Show toggle state changes`}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const epicContent = canvasElement.querySelector('[data-testid="epic-content"]');
    await expect(epicContent).not.toBeNull();

    // Initially expanded
    await expect(epicContent).toHaveAttribute('data-state', 'open');

    // Click to collapse
    const trigger = canvas.getByRole('button', { name: /epic documentation/i });
    await userEvent.click(trigger);

    // Should be collapsed
    await expect(epicContent).toHaveAttribute('data-state', 'closed');

    // Click to expand again
    await userEvent.click(trigger);

    // Should be expanded
    await expect(epicContent).toHaveAttribute('data-state', 'open');
  },
};

// ============================================================================
// Complete Example
// ============================================================================

/**
 * Complete epic documentation - realistic example with all markdown features.
 */
export const CompleteExample: Story = {
  render: () => (
    <EpicContent
      content={`# Dashboard Restructure Epic

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

See the [project board](https://github.com/example/saga/projects/1) for details.`}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const epicContent = canvasElement.querySelector('[data-testid="epic-content"]');
    await expect(epicContent).not.toBeNull();

    // Check main heading
    await expect(epicContent?.querySelector('h1')).toHaveTextContent('Dashboard Restructure Epic');

    // Check table
    await expect(epicContent?.querySelector('table')).toBeInTheDocument();

    // Check code block
    await expect(epicContent?.querySelector('pre')).toBeInTheDocument();

    // Check strikethrough
    const deletedText = canvas.getByText('Phase 1 is complete.');
    await expect(deletedText.tagName).toBe('DEL');

    // Check link
    await expect(canvas.getByRole('link', { name: 'project board' })).toBeInTheDocument();

    // Visual snapshot for complete example
    await matchCanvasSnapshot(canvasElement, 'epic-content-complete');
  },
};
